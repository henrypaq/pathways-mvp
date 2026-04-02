"""
db.py — SQLite manifest for the Pathways scraping system.

Tracks every page ever scraped:
  - content hash (SHA-256) → detects real changes vs no-op re-scrapes
  - last_scraped_at / last_changed_at → drives the refresh scheduler
  - chunk_count → audit trail for the embedding pipeline
  - is_stale flag → surfaced in the RAG UI as a warning

Schema is append-safe: re-running never destroys history.
"""

import sqlite3
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path

DB_PATH = Path(__file__).parent / "db" / "manifest.db"


def get_conn() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")  # safer for concurrent reads
    return conn


def init_db():
    """Create all tables if they don't exist. Idempotent."""
    with get_conn() as conn:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS pages (
                url             TEXT PRIMARY KEY,
                display_name    TEXT NOT NULL,
                section         TEXT NOT NULL,
                visa_types      TEXT NOT NULL,   -- JSON array
                programs        TEXT NOT NULL,   -- JSON array
                high_change     INTEGER NOT NULL DEFAULT 0,
                priority        INTEGER NOT NULL DEFAULT 2,

                -- Scrape state
                last_scraped_at TEXT,            -- ISO-8601 UTC
                last_changed_at TEXT,            -- ISO-8601 UTC — when content actually changed
                content_hash    TEXT,            -- SHA-256 of raw HTML
                content_hash_prev TEXT,          -- previous hash (diff detection)
                raw_path        TEXT,            -- path to saved .md file
                scrape_status   TEXT DEFAULT 'pending',  -- pending | ok | error | skipped
                scrape_error    TEXT,

                -- Embedding state
                chunk_count     INTEGER DEFAULT 0,
                last_embedded_at TEXT,
                embed_status    TEXT DEFAULT 'pending',  -- pending | ok | error

                -- Freshness
                is_stale        INTEGER DEFAULT 0,   -- 1 if >6 months since last_changed_at
                stale_reason    TEXT
            );

            CREATE TABLE IF NOT EXISTS scrape_runs (
                id              INTEGER PRIMARY KEY AUTOINCREMENT,
                run_id          TEXT NOT NULL,       -- UUID for the run
                started_at      TEXT NOT NULL,
                finished_at     TEXT,
                total_pages     INTEGER DEFAULT 0,
                changed_pages   INTEGER DEFAULT 0,   -- pages where content actually changed
                unchanged_pages INTEGER DEFAULT 0,
                error_pages     INTEGER DEFAULT 0,
                new_pages       INTEGER DEFAULT 0,   -- first-time scrapes
                trigger         TEXT DEFAULT 'manual' -- manual | scheduled | forced
            );

            CREATE TABLE IF NOT EXISTS page_history (
                id              INTEGER PRIMARY KEY AUTOINCREMENT,
                url             TEXT NOT NULL,
                run_id          TEXT NOT NULL,
                scraped_at      TEXT NOT NULL,
                content_hash    TEXT NOT NULL,
                changed         INTEGER NOT NULL,   -- 1 if hash differed from previous
                chunk_count     INTEGER DEFAULT 0,
                FOREIGN KEY (url) REFERENCES pages(url)
            );

            CREATE INDEX IF NOT EXISTS idx_pages_section ON pages(section);
            CREATE INDEX IF NOT EXISTS idx_pages_stale ON pages(is_stale);
            CREATE INDEX IF NOT EXISTS idx_history_url ON page_history(url);
            CREATE INDEX IF NOT EXISTS idx_history_run ON page_history(run_id);
        """)
    print(f"[db] Initialized manifest at {DB_PATH}")


def upsert_source(source: dict):
    """Register or update a source from sources.py (does not touch scrape fields)."""
    with get_conn() as conn:
        conn.execute("""
            INSERT INTO pages (url, display_name, section, visa_types, programs, high_change, priority)
            VALUES (:url, :display_name, :section, :visa_types, :programs, :high_change, :priority)
            ON CONFLICT(url) DO UPDATE SET
                display_name = excluded.display_name,
                section      = excluded.section,
                visa_types   = excluded.visa_types,
                programs     = excluded.programs,
                high_change  = excluded.high_change,
                priority     = excluded.priority
        """, {
            "url": source["url"],
            "display_name": source["display_name"],
            "section": source["section"],
            "visa_types": json.dumps(source["visa_types"]),
            "programs": json.dumps(source["programs"]),
            "high_change": int(source["high_change"]),
            "priority": source["priority"],
        })


def compute_hash(content: str) -> str:
    return hashlib.sha256(content.encode("utf-8")).hexdigest()


def record_scrape(url: str, run_id: str, raw_html: str, raw_path: str,
                  status: str = "ok", error: str = None) -> dict:
    """
    After scraping a page, record the result and detect if content changed.
    Returns a dict with `changed: bool` so the caller knows whether to re-embed.
    """
    now = datetime.now(timezone.utc).isoformat()
    new_hash = compute_hash(raw_html) if raw_html else None

    with get_conn() as conn:
        row = conn.execute("SELECT content_hash, last_changed_at FROM pages WHERE url=?", (url,)).fetchone()
        prev_hash = row["content_hash"] if row else None
        last_changed_at = row["last_changed_at"] if row else None

        changed = (new_hash != prev_hash) if (new_hash and prev_hash) else bool(new_hash)
        is_new = prev_hash is None

        if changed and new_hash:
            last_changed_at = now

        # Check staleness: if last_changed_at > 6 months ago
        is_stale = 0
        stale_reason = None
        if last_changed_at:
            from datetime import timedelta
            lc = datetime.fromisoformat(last_changed_at.replace("Z", "+00:00"))
            if (datetime.now(timezone.utc) - lc).days > 180:
                is_stale = 1
                stale_reason = f"Content unchanged for {(datetime.now(timezone.utc) - lc).days} days"

        conn.execute("""
            UPDATE pages SET
                last_scraped_at   = ?,
                last_changed_at   = ?,
                content_hash      = ?,
                content_hash_prev = ?,
                raw_path          = ?,
                scrape_status     = ?,
                scrape_error      = ?,
                is_stale          = ?,
                stale_reason      = ?
            WHERE url = ?
        """, (
            now,
            last_changed_at,
            new_hash,
            prev_hash,
            raw_path,
            status,
            error,
            is_stale,
            stale_reason,
            url,
        ))

        conn.execute("""
            INSERT INTO page_history (url, run_id, scraped_at, content_hash, changed)
            VALUES (?, ?, ?, ?, ?)
        """, (url, run_id, now, new_hash or "", int(changed)))

    return {
        "url": url,
        "changed": changed,
        "is_new": is_new,
        "hash": new_hash,
        "prev_hash": prev_hash,
        "status": status,
    }


def record_embed(url: str, chunk_count: int, status: str = "ok"):
    now = datetime.now(timezone.utc).isoformat()
    with get_conn() as conn:
        conn.execute("""
            UPDATE pages SET chunk_count=?, last_embedded_at=?, embed_status=?
            WHERE url=?
        """, (chunk_count, now, status, url))


def start_run(run_id: str, trigger: str = "manual", total: int = 0) -> str:
    now = datetime.now(timezone.utc).isoformat()
    with get_conn() as conn:
        conn.execute("""
            INSERT INTO scrape_runs (run_id, started_at, total_pages, trigger)
            VALUES (?, ?, ?, ?)
        """, (run_id, now, total, trigger))
    return run_id


def finish_run(run_id: str, stats: dict):
    now = datetime.now(timezone.utc).isoformat()
    with get_conn() as conn:
        conn.execute("""
            UPDATE scrape_runs SET
                finished_at     = ?,
                changed_pages   = ?,
                unchanged_pages = ?,
                error_pages     = ?,
                new_pages       = ?
            WHERE run_id = ?
        """, (
            now,
            stats.get("changed", 0),
            stats.get("unchanged", 0),
            stats.get("errors", 0),
            stats.get("new", 0),
            run_id,
        ))


def get_pages_needing_refresh(max_age_days: int = 3, include_high_change: bool = True) -> list:
    """
    Returns URLs that are due for refresh:
      - Never scraped (pending)
      - Last scraped > max_age_days ago
      - high_change pages: always include if last scraped > 1 day ago
    """
    now = datetime.now(timezone.utc)
    with get_conn() as conn:
        rows = conn.execute("SELECT * FROM pages").fetchall()

    to_refresh = []
    for row in rows:
        row = dict(row)
        if not row["last_scraped_at"]:
            row["refresh_reason"] = "never_scraped"
            to_refresh.append(row)
            continue

        last = datetime.fromisoformat(row["last_scraped_at"].replace("Z", "+00:00"))
        age_days = (now - last).total_seconds() / 86400

        if row["high_change"] and include_high_change and age_days > 1:
            row["refresh_reason"] = f"high_change_page_age_{age_days:.1f}d"
            to_refresh.append(row)
        elif age_days > max_age_days:
            row["refresh_reason"] = f"stale_{age_days:.1f}d"
            to_refresh.append(row)

    return sorted(to_refresh, key=lambda x: x["priority"])


def get_stats() -> dict:
    with get_conn() as conn:
        total = conn.execute("SELECT COUNT(*) FROM pages").fetchone()[0]
        scraped = conn.execute("SELECT COUNT(*) FROM pages WHERE scrape_status='ok'").fetchone()[0]
        embedded = conn.execute("SELECT COUNT(*) FROM pages WHERE embed_status='ok'").fetchone()[0]
        stale = conn.execute("SELECT COUNT(*) FROM pages WHERE is_stale=1").fetchone()[0]
        errors = conn.execute("SELECT COUNT(*) FROM pages WHERE scrape_status='error'").fetchone()[0]
        last_run = conn.execute(
            "SELECT started_at, trigger, changed_pages FROM scrape_runs ORDER BY started_at DESC LIMIT 1"
        ).fetchone()

    return {
        "total_pages": total,
        "scraped_ok": scraped,
        "embedded_ok": embedded,
        "stale_pages": stale,
        "error_pages": errors,
        "last_run": dict(last_run) if last_run else None,
    }


if __name__ == "__main__":
    init_db()
    stats = get_stats()
    print(json.dumps(stats, indent=2))
