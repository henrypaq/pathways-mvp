"""
Semantic retrieval over Supabase pgvector (knowledge_chunks).

Uses OpenAI text-embedding-3-small for the query vector, then the Postgres RPC
`public.match_knowledge_chunks(query_embedding, match_count)`.

Apply migration: supabase/migrations/20260408120000_match_knowledge_chunks.sql

Requires: OPENAI_API_KEY, SUPABASE_DB_URL or DATABASE_URL (same as ingest).
"""

from __future__ import annotations

import sys
from pathlib import Path
from typing import Any, TypedDict

_repo_root = Path(__file__).resolve().parent.parent
if str(_repo_root) not in sys.path:
    sys.path.insert(0, str(_repo_root))

from pgvector.psycopg import Vector
from psycopg import errors as pg_errors
from psycopg.rows import dict_row

from data_scrapper.openai_embeddings import get_embedding, OPENAI_EMBEDDING_DIMENSIONS
from data_scrapper.supabase_knowledge import get_connection


class SearchResult(TypedDict):
    content: str
    url: str
    similarity: float


def _search_via_rpc(query_embedding: list[float], k: int) -> list[dict[str, Any]]:
    dim = OPENAI_EMBEDDING_DIMENSIONS
    conn = get_connection()
    try:
        qvec = Vector(query_embedding)
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                f"""
                SELECT * FROM public.match_knowledge_chunks(
                    %s::vector({dim}),
                    %s::integer
                )
                """,
                (qvec, k),
            )
            return [dict(r) for r in cur.fetchall()]
    finally:
        conn.close()


def _search_via_inline_sql(query_embedding: list[float], k: int) -> list[dict[str, Any]]:
    """Fallback if match_knowledge_chunks migration not applied yet."""
    dim = OPENAI_EMBEDDING_DIMENSIONS
    conn = get_connection()
    try:
        qvec = Vector(query_embedding)
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                f"""
                SELECT
                  content,
                  source_url AS url,
                  (1 - (embedding <=> %s::vector({dim})))::double precision AS similarity
                FROM public.knowledge_chunks
                ORDER BY embedding <=> %s::vector({dim})
                LIMIT %s
                """,
                (qvec, qvec, k),
            )
            return [dict(r) for r in cur.fetchall()]
    finally:
        conn.close()


def search(query: str, k: int = 5) -> list[SearchResult]:
    """
    Embed `query` with OpenAI, run similarity search, return top-k rows.

    Each item: { "content", "url", "similarity" }.
    """
    if k < 1:
        return []
    text = (query or "").strip()
    if not text:
        return []

    emb = get_embedding(text)
    if len(emb) != OPENAI_EMBEDDING_DIMENSIONS:
        raise ValueError(
            f"Expected {OPENAI_EMBEDDING_DIMENSIONS}-dim query embedding, got {len(emb)}"
        )

    try:
        rows = _search_via_rpc(emb, k)
    except pg_errors.UndefinedFunction:
        rows = _search_via_inline_sql(emb, k)

    out: list[SearchResult] = []
    for r in rows:
        out.append(
            {
                "content": r.get("content") or "",
                "url": r.get("url") or "",
                "similarity": float(r.get("similarity") or 0.0),
            }
        )
    return out
