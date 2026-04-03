"""
scheduler.py — Background scheduler for the Pathways refresh pipeline.

Uses APScheduler (in-process, no Redis/Celery needed for hackathon).

Schedule:
  - Full refresh:        Every 3 days at 02:00 UTC
  - High-change pages:   Every 24 hours at 06:00 UTC (processing times, draw results)
  - Stats log:           Every 12 hours

For production, replace APScheduler with a proper cron job or a Vercel/Railway
scheduled function. The logic in refresh.py is scheduler-agnostic.

Usage:
  python scheduler.py           # start the scheduler (blocks)
  python scheduler.py --once    # run refresh once and exit (useful for cron)
"""

import logging
import argparse
import signal
import sys
from datetime import datetime, timezone

from apscheduler.schedulers.blocking import BlockingScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger
from apscheduler.events import EVENT_JOB_ERROR, EVENT_JOB_EXECUTED

from refresh import run_refresh, print_stats, sync_sources

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
log = logging.getLogger("scheduler")


def job_full_refresh():
    """Full 3-day refresh cycle — re-checks all pages."""
    log.info("⏰ SCHEDULED JOB: Full 3-day refresh starting...")
    stats = run_refresh(trigger="scheduled", max_age_days=3)
    log.info(f"⏰ Full refresh complete: {stats}")


def job_high_change_refresh():
    """
    Daily refresh for high-change pages only:
      - IRCC processing times (updated weekly by IRCC)
      - Express Entry draw results (every ~2 weeks)
    """
    log.info("⏰ SCHEDULED JOB: High-change page refresh...")
    from db import get_pages_needing_refresh, get_conn
    from sources import IRCC_SOURCES
    from scraper import scrape_page
    from chunker import embed_page, get_connection, supabase_db_configured
    from db import record_scrape, record_embed, start_run, finish_run
    import uuid, time

    sync_sources()

    # Only get high-change pages that are > 1 day old
    due = [p for p in get_pages_needing_refresh(max_age_days=1) if p.get("high_change")]

    if not due:
        log.info("✅ High-change pages are fresh. Skipping.")
        return

    log.info(f"Refreshing {len(due)} high-change pages...")

    source_meta = {s["url"]: s for s in IRCC_SOURCES}
    pg_conn = get_connection() if supabase_db_configured() else None
    run_id = str(uuid.uuid4())
    start_run(run_id, trigger="scheduled_high_change", total=len(due))

    stats = {"changed": 0, "unchanged": 0, "errors": 0, "new": 0}

    try:
        for page in due:
            url = page["url"]
            result = scrape_page(url, page["display_name"])

            if not result or result.get("error"):
                record_scrape(url, run_id, "", "", status="error", error="scrape_failed")
                stats["errors"] += 1
                continue

            manifest_result = record_scrape(
                url=url,
                run_id=run_id,
                raw_html=result["raw_html"],
                raw_path=result["raw_path"],
                status="ok",
            )

            if manifest_result["changed"] or manifest_result["is_new"]:
                source = source_meta.get(url, {})
                full_result = {
                    **result,
                    "section": source.get("section", ""),
                    "visa_types": source.get("visa_types", []),
                    "programs": source.get("programs", []),
                    "high_change": True,
                    "hash": manifest_result["hash"],
                }
                n = embed_page(full_result, conn=pg_conn)
                record_embed(url, n, status="ok")
                stats["changed"] += 1
                log.info(f"  📝 Updated: {page['display_name']} ({n} chunks)")
            else:
                stats["unchanged"] += 1
                log.info(f"  ✓ No change: {page['display_name']}")

            time.sleep(1.5)

        finish_run(run_id, stats)
    finally:
        if pg_conn is not None:
            pg_conn.close()
    log.info(f"⏰ High-change refresh complete: {stats}")


def job_log_stats():
    """Every 12h: log manifest stats to output for monitoring."""
    from db import get_stats
    from chunker import get_collection_stats
    stats = get_stats()
    vs = get_collection_stats()
    log.info(
        f"📊 STATS — "
        f"Pages: {stats['scraped_ok']}/{stats['total_pages']} scraped | "
        f"Embedded: {stats['embedded_ok']} | "
        f"Stale: {stats['stale_pages']} | "
        f"Chunks: {vs['total_chunks']:,}"
    )


def on_job_error(event):
    log.error(f"❌ Job {event.job_id} failed: {event.exception}")


def on_job_executed(event):
    log.info(f"✅ Job {event.job_id} completed at {datetime.now(timezone.utc).isoformat()}")


def start_scheduler():
    """
    Start the blocking APScheduler with all jobs configured.
    This function blocks indefinitely — run in a background process or thread.
    """
    scheduler = BlockingScheduler(timezone="UTC")

    # ── Full refresh: every 3 days at 02:00 UTC ─────────────────
    scheduler.add_job(
        job_full_refresh,
        trigger=CronTrigger(hour=2, minute=0),
        id="full_refresh",
        name="Full 3-day refresh",
        max_instances=1,
        coalesce=True,         # if missed (server was down), run once on startup
        misfire_grace_time=3600,
    )

    # ── High-change refresh: every day at 06:00 UTC ──────────────
    scheduler.add_job(
        job_high_change_refresh,
        trigger=CronTrigger(hour=6, minute=0),
        id="high_change_refresh",
        name="Daily high-change refresh",
        max_instances=1,
        coalesce=True,
        misfire_grace_time=1800,
    )

    # ── Stats log: every 12 hours ────────────────────────────────
    scheduler.add_job(
        job_log_stats,
        trigger=IntervalTrigger(hours=12),
        id="stats_log",
        name="Stats logger",
        max_instances=1,
    )

    # Error & execution listeners
    scheduler.add_listener(on_job_error, EVENT_JOB_ERROR)
    scheduler.add_listener(on_job_executed, EVENT_JOB_EXECUTED)

    # Graceful shutdown on SIGTERM / SIGINT
    def handle_signal(signum, frame):
        log.info(f"Received signal {signum}. Shutting down scheduler...")
        scheduler.shutdown(wait=False)
        sys.exit(0)

    signal.signal(signal.SIGTERM, handle_signal)
    signal.signal(signal.SIGINT, handle_signal)

    log.info("═" * 60)
    log.info("PATHWAYS SCHEDULER STARTED")
    log.info("Jobs scheduled:")
    log.info("  • Full refresh:          every 3 days at 02:00 UTC")
    log.info("  • High-change refresh:   every day at 06:00 UTC")
    log.info("  • Stats log:             every 12 hours")
    log.info("═" * 60)

    # Run initial stats
    job_log_stats()

    try:
        scheduler.start()
    except (KeyboardInterrupt, SystemExit):
        log.info("Scheduler stopped.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Pathways background scheduler")
    parser.add_argument("--once", action="store_true",
                        help="Run refresh once and exit (for cron/CI use)")
    parser.add_argument("--force", action="store_true",
                        help="Force full re-scrape of all pages")
    parser.add_argument("--stats", action="store_true",
                        help="Print stats and exit")
    args = parser.parse_args()

    if args.stats:
        print_stats()
    elif args.once:
        log.info("Running one-shot refresh...")
        stats = run_refresh(force=args.force, trigger="cron_once")
        log.info(f"Done: {stats}")
    else:
        start_scheduler()
