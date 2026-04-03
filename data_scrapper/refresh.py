"""
refresh.py — Smart refresh engine for Pathways.

This is the core intelligence of the data pipeline. It does NOT blindly re-scrape
and re-embed everything. It:

  1. Checks which pages are due (age > 3 days, or high-change > 1 day)
  2. Fetches each page and computes its SHA-256 hash
  3. Compares to the stored hash → ONLY re-embeds if content actually changed
  4. Marks stale pages (unchanged > 6 months) with a visible warning
  5. Records every run in the manifest for audit + debugging

Result: the vector DB stays fresh, but you don't waste API/compute budget
re-embedding pages that haven't changed (most gov pages are stable for weeks).

Usage:
  python refresh.py              # run once, refresh what's due
  python refresh.py --force      # re-scrape all pages regardless of age
  python refresh.py --check      # dry-run: print what would refresh
  python refresh.py --stats      # show manifest stats
"""

import uuid
import time
import logging
import argparse
import json
from datetime import datetime, timezone
from pathlib import Path

from sources import IRCC_SOURCES
from scraper import scrape_page
from chunker import embed_page, get_connection, supabase_db_configured
from db import (
    init_db, upsert_source, record_scrape, record_embed,
    start_run, finish_run, get_pages_needing_refresh, get_stats,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("refresh")

REFRESH_INTERVAL_DAYS = 3
HIGH_CHANGE_INTERVAL_DAYS = 1


def sync_sources():
    """Register all known sources into the manifest DB (idempotent)."""
    init_db()
    for source in IRCC_SOURCES:
        upsert_source(source)
    log.info(f"Synced {len(IRCC_SOURCES)} sources into manifest.")


def run_refresh(
    force: bool = False,
    dry_run: bool = False,
    trigger: str = "manual",
    max_age_days: int = REFRESH_INTERVAL_DAYS,
) -> dict:
    """
    Main refresh loop.

    Args:
        force: Re-scrape all pages regardless of age
        dry_run: Print what would happen, don't scrape
        trigger: 'manual' | 'scheduled'
        max_age_days: Override default refresh interval

    Returns:
        Run stats dict
    """
    sync_sources()

    if force:
        # Force mode: refresh everything
        from db import get_conn
        with get_conn() as conn:
            pages_to_refresh = [
                {**dict(row), "refresh_reason": "forced"}
                for row in conn.execute("SELECT * FROM pages").fetchall()
            ]
    else:
        pages_to_refresh = get_pages_needing_refresh(
            max_age_days=max_age_days,
            include_high_change=True,
        )

    total = len(pages_to_refresh)
    log.info(f"\n{'='*60}")
    log.info(f"PATHWAYS REFRESH ENGINE")
    log.info(f"Mode: {'FORCE' if force else 'SMART'} | Trigger: {trigger}")
    log.info(f"Pages to refresh: {total} / {len(IRCC_SOURCES)} total")
    log.info(f"{'='*60}\n")

    if total == 0:
        log.info("✅ Everything is fresh. No refresh needed.")
        return {"changed": 0, "unchanged": 0, "errors": 0, "new": 0}

    if dry_run:
        log.info("DRY RUN — pages that would be refreshed:")
        for p in pages_to_refresh:
            log.info(f"  [{p['refresh_reason']}] {p['display_name']}")
        return {"dry_run": True, "would_refresh": total}

    run_id = str(uuid.uuid4())
    start_run(run_id, trigger=trigger, total=total)

    # Reuse one Postgres connection per run when Supabase is configured (Chroma-only OK without DSN)
    pg_conn = get_connection() if supabase_db_configured() else None

    stats = {"changed": 0, "unchanged": 0, "errors": 0, "new": 0}

    # Build a URL→source lookup for metadata
    source_meta = {s["url"]: s for s in IRCC_SOURCES}

    try:
        for i, page in enumerate(pages_to_refresh, 1):
            url = page["url"]
            display_name = page["display_name"]
            source = source_meta.get(url, {})

            log.info(f"\n[{i}/{total}] {display_name}")
            log.info(f"  Reason: {page.get('refresh_reason', 'unknown')}")

            # ── Step 1: Scrape ──────────────────────────────────────
            result = scrape_page(url, display_name)

            if not result or result.get("error"):
                error_msg = (result or {}).get("error", "scrape_failed")
                log.error(f"  ✗ Scrape failed: {error_msg}")
                record_scrape(url, run_id, "", "", status="error", error=error_msg)
                stats["errors"] += 1
                continue

            # ── Step 2: Hash comparison ──────────────────────────────
            manifest_result = record_scrape(
                url=url,
                run_id=run_id,
                raw_html=result["raw_html"],
                raw_path=result["raw_path"],
                status="ok",
            )

            is_new = manifest_result["is_new"]
            changed = manifest_result["changed"]

            if is_new:
                log.info(f"  🆕 NEW page — embedding now")
                stats["new"] += 1
            elif changed:
                log.info(f"  📝 CONTENT CHANGED (hash: {manifest_result['hash'][:12]}...)")
                log.info(f"     Previous: {manifest_result['prev_hash'][:12] if manifest_result['prev_hash'] else 'none'}...")
                stats["changed"] += 1
            else:
                log.info(f"  ✓ No change — skipping re-embed (hash: {manifest_result['hash'][:12]}...)")
                stats["unchanged"] += 1
                # Politeness delay even for unchanged pages
                if i < total:
                    time.sleep(0.5)
                continue

            # ── Step 3: Re-embed only if changed ────────────────────
            try:
                full_result = {
                    **result,
                    "section": source.get("section", page.get("section", "")),
                    "visa_types": source.get("visa_types", []),
                    "programs": source.get("programs", []),
                    "high_change": source.get("high_change", False),
                    "hash": manifest_result["hash"],
                }

                # Check if this page is stale (no content change in >6 months)
                from db import get_conn
                with get_conn() as conn:
                    row = conn.execute("SELECT is_stale FROM pages WHERE url=?", (url,)).fetchone()
                is_stale = bool(row["is_stale"]) if row else False

                chunk_count = embed_page(
                    full_result, is_stale=is_stale, conn=pg_conn
                )
                record_embed(url, chunk_count, status="ok")
                log.info(f"  ✅ Embedded {chunk_count} chunks")

            except Exception as e:
                log.error(f"  ✗ Embedding error: {e}")
                record_embed(url, 0, status="error")
                stats["errors"] += 1

            # Politeness delay between requests
            if i < total:
                time.sleep(1.5)

        finish_run(run_id, stats)
    finally:
        if pg_conn is not None:
            pg_conn.close()

    log.info(f"\n{'='*60}")
    log.info(f"REFRESH COMPLETE")
    log.info(f"  New pages:      {stats['new']}")
    log.info(f"  Changed pages:  {stats['changed']}")
    log.info(f"  Unchanged:      {stats['unchanged']} (skipped re-embed ✓)")
    log.info(f"  Errors:         {stats['errors']}")
    log.info(f"  Run ID:         {run_id}")
    log.info(f"{'='*60}\n")

    return {**stats, "run_id": run_id}


def print_stats():
    sync_sources()
    stats = get_stats()
    print("\n📊 PATHWAYS MANIFEST STATS")
    print("─" * 40)
    print(f"Total pages tracked:  {stats['total_pages']}")
    print(f"Successfully scraped: {stats['scraped_ok']}")
    print(f"Embedded (manifest): {stats['embedded_ok']}")
    print(f"Stale pages (>6mo):   {stats['stale_pages']}")
    print(f"Error pages:          {stats['error_pages']}")
    if stats["last_run"]:
        lr = stats["last_run"]
        print(f"\nLast run:")
        print(f"  Started:   {lr['started_at']}")
        print(f"  Trigger:   {lr['trigger']}")
        print(f"  Changed:   {lr['changed_pages']}")

    from chunker import get_collection_stats
    vs = get_collection_stats()
    print(f"\nVector store:        {vs.get('backend', 'supabase')}")
    print(f"Table:               {vs['collection']}")
    print(f"Total chunk rows:    {vs['total_chunks']:,}")
    print()

    # Show pages due for refresh
    due = get_pages_needing_refresh()
    if due:
        print(f"\n⏰ Pages due for refresh ({len(due)}):")
        for p in due:
            print(f"  [{p['refresh_reason']}] {p['display_name']}")
    else:
        print("✅ All pages are fresh.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Pathways smart refresh engine")
    parser.add_argument("--force", action="store_true", help="Re-scrape all pages")
    parser.add_argument("--check", action="store_true", help="Dry run — show what would refresh")
    parser.add_argument("--stats", action="store_true", help="Show manifest stats")
    parser.add_argument("--days", type=int, default=REFRESH_INTERVAL_DAYS,
                        help=f"Refresh interval in days (default: {REFRESH_INTERVAL_DAYS})")
    args = parser.parse_args()

    if args.stats:
        print_stats()
    elif args.check:
        run_refresh(dry_run=True, max_age_days=args.days)
    else:
        run_refresh(force=args.force, max_age_days=args.days)
