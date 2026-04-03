"""
Supabase Postgres + pgvector storage for embedded IRCC chunks.

Requires SUPABASE_DB_URL (or DATABASE_URL) — Postgres connection string from
Supabase Dashboard → Project Settings → Database → URI (use "Session" or "Direct"
for ingestion; pooler works with psycopg too).

SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are optional here (REST); this module
uses the DB URL for reliable vector batch writes.
"""

from __future__ import annotations

import hashlib
import json
import logging
import os
import sys
from pathlib import Path
from datetime import datetime, timezone
from typing import Any, Optional
from urllib.parse import urlparse

from pgvector.psycopg import Vector, register_vector
from psycopg import Connection, connect
from psycopg.rows import dict_row

_repo_root = Path(__file__).resolve().parent.parent
if str(_repo_root) not in sys.path:
    sys.path.insert(0, str(_repo_root))

from data_scrapper.openai_embeddings import OPENAI_EMBEDDING_DIMENSIONS

log = logging.getLogger("supabase_knowledge")

EMBEDDING_DIMENSIONS = OPENAI_EMBEDDING_DIMENSIONS


def _load_dotenv() -> None:
    try:
        from dotenv import load_dotenv

        root = Path(__file__).resolve().parent.parent
        load_dotenv(root / ".env")
        load_dotenv(root / ".env.local", override=True)
    except ImportError:
        pass


def supabase_db_configured() -> bool:
    """True if Postgres DSN is set (does not validate connectivity)."""
    _load_dotenv()
    return bool(os.environ.get("SUPABASE_DB_URL") or os.environ.get("DATABASE_URL"))


def _require_dsn() -> str:
    _load_dotenv()
    dsn = os.environ.get("SUPABASE_DB_URL") or os.environ.get("DATABASE_URL")
    if not dsn:
        raise RuntimeError(
            "Set SUPABASE_DB_URL (or DATABASE_URL) to your Supabase Postgres connection string "
            "(Dashboard → Project Settings → Database)."
        )
    return dsn


def get_connection() -> Connection:
    conn = connect(_require_dsn())
    register_vector(conn)
    return conn


def _content_hash(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def _pathway_tags(scrape_result: dict) -> list[str]:
    raw_v = scrape_result.get("visa_types") or []
    raw_p = scrape_result.get("programs") or []
    if isinstance(raw_v, str):
        try:
            raw_v = json.loads(raw_v)
        except json.JSONDecodeError:
            raw_v = []
    if isinstance(raw_p, str):
        try:
            raw_p = json.loads(raw_p)
        except json.JSONDecodeError:
            raw_p = []
    tags: list[str] = []
    for x in list(raw_v) + list(raw_p):
        s = str(x).strip()
        if s and s not in tags:
            tags.append(s)
    return tags[:64]


def insert_chunks_batch(
    conn: Connection,
    scrape_result: dict,
    chunks: list[str],
    embeddings: list[list[float]],
    is_stale: bool = False,
) -> int:
    """
    Replace all rows for source_url, then insert new chunks in one transaction.
    embeddings must align 1:1 with chunks.
    is_stale is accepted for API parity with the manifest; not stored on rows today.
    """
    _ = is_stale
    if len(chunks) != len(embeddings):
        raise ValueError("chunks and embeddings length mismatch")

    url = scrape_result["url"]
    scraped_at = scrape_result.get("scraped_at") or datetime.now(timezone.utc).isoformat()
    if isinstance(scraped_at, datetime):
        scraped_at = scraped_at.isoformat()

    parsed = urlparse(url)
    domain = parsed.netloc or None
    title = scrape_result.get("display_name") or ""
    section_title = scrape_result.get("section") or None
    tags = _pathway_tags(scrape_result)
    page_hash = scrape_result.get("hash")
    if page_hash is not None and not isinstance(page_hash, str):
        page_hash = str(page_hash)

    # document_type: short hint from section / filename
    doc_type = "ircc_web"
    if section_title:
        s = section_title.lower()
        if "express" in s:
            doc_type = "express_entry"
        elif "refugee" in s or "asylum" in s:
            doc_type = "refugee"
        elif "study" in s:
            doc_type = "study"
        elif "work" in s:
            doc_type = "work"

    rows: list[tuple[Any, ...]] = []
    for i, (text, emb) in enumerate(zip(chunks, embeddings)):
        if len(emb) != EMBEDDING_DIMENSIONS:
            raise ValueError(f"Expected {EMBEDDING_DIMENSIONS}-dim embedding, got {len(emb)}")
        ch = _content_hash(text)
        rows.append(
            (
                text,
                Vector(emb),
                url,
                domain,
                "ircc",
                title,
                section_title,
                "CA",
                "CA",
                doc_type,
                tags if tags else None,
                i,
                ch,
                page_hash,
                scraped_at,
            )
        )

    with conn.transaction():
        with conn.cursor() as cur:
            cur.execute(
                "DELETE FROM public.knowledge_chunks WHERE source_url = %s",
                (url,),
            )
            if not rows:
                return 0
            cur.executemany(
                """
                INSERT INTO public.knowledge_chunks (
                  content, embedding, source_url, source_domain, source_system,
                  title, section_title, country_code, jurisdiction_code, document_type,
                  pathway_tags, chunk_index, content_hash, source_content_hash, last_scraped_at
                ) VALUES (
                  %s, %s, %s, %s, %s,
                  %s, %s, %s, %s, %s,
                  %s, %s, %s, %s, %s::timestamptz
                )
                """,
                rows,
            )
    return len(rows)


def query_similar(
    conn: Connection,
    query_embedding: list[float],
    n_results: int = 5,
    filter_section: Optional[str] = None,
    filter_visa_type: Optional[str] = None,
) -> list[dict[str, Any]]:
    """Cosine distance via pgvector <=> operator (lower is closer)."""
    if len(query_embedding) != EMBEDDING_DIMENSIONS:
        raise ValueError(f"Query embedding must be {EMBEDDING_DIMENSIONS}-dimensional")

    qvec = Vector(query_embedding)
    # Over-fetch when post-filtering by pathway_tags (same idea as Chroma post-filter).
    fetch_limit = min(200, n_results * 25) if filter_visa_type else n_results

    sql = """
        SELECT
          content,
          source_url,
          title,
          section_title,
          chunk_index,
          last_scraped_at,
          pathway_tags,
          1 - (embedding <=> %(q)s::vector) AS similarity
        FROM public.knowledge_chunks
    """
    params: dict[str, Any] = {"q": qvec, "lim": fetch_limit}
    if filter_section:
        sql += " WHERE section_title = %(section)s"
        params["section"] = filter_section
    sql += " ORDER BY embedding <=> %(q)s::vector LIMIT %(lim)s"

    with conn.cursor(row_factory=dict_row) as cur:
        cur.execute(sql, params)
        rows = [dict(r) for r in cur.fetchall()]

    if not filter_visa_type:
        return rows[:n_results]

    out: list[dict[str, Any]] = []
    for r in rows:
        tags = r.get("pathway_tags") or []
        if not isinstance(tags, list):
            tags = list(tags) if tags else []
        if filter_visa_type not in tags and "all" not in tags:
            continue
        out.append(r)
        if len(out) >= n_results:
            break
    return out


def count_chunks(conn: Optional[Connection] = None) -> int:
    own = conn is None
    if own:
        conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*)::bigint FROM public.knowledge_chunks")
            return int(cur.fetchone()[0])
    finally:
        if own and conn is not None:
            conn.close()
