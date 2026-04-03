"""
chunker.py — Text chunking and embedding pipeline for Pathways.

Strategy:
  - Chunks markdown via markdown_chunker: ~300–800 tokens, ##/### first, then sentences / token windows
  - Embeddings: OpenAI text-embedding-3-small (1536 dims); OPENAI_API_KEY required
  - Writes: Supabase pgvector when SUPABASE_DB_URL is set; optional Chroma if CHROMA_ENABLED=1
  - Reads (query / health): PATHWAYS_VECTOR_BACKEND=supabase | chroma (default supabase)
"""

from __future__ import annotations

import hashlib
import json
import logging
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

# Support both `python refresh.py` (cwd=data_scrapper) and `from data_scrapper.chunker` (API).
_repo_root = Path(__file__).resolve().parent.parent
if str(_repo_root) not in sys.path:
    sys.path.insert(0, str(_repo_root))

from data_scrapper.markdown_chunker import split_into_semantic_chunks
from data_scrapper.openai_embeddings import get_embedding, get_embeddings_batch
from data_scrapper.supabase_knowledge import (
    count_chunks,
    get_connection,
    insert_chunks_batch,
    query_similar,
    supabase_db_configured,
)

log = logging.getLogger("chunker")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

CHROMA_DIR = Path(__file__).parent / "data" / "chroma"
CHROMA_DIR.mkdir(parents=True, exist_ok=True)
# New name: 1536-dim OpenAI vectors (incompatible with legacy 384-dim Chroma data).
COLLECTION_NAME = "pathways_te3s"

_chroma_collection = None


def vector_read_backend() -> str:
    """Which store serves query() and get_collection_stats (default: supabase / pgvector)."""
    v = (os.environ.get("PATHWAYS_VECTOR_BACKEND") or "supabase").strip().lower()
    return v if v in ("chroma", "supabase") else "supabase"


def _chroma_writes_enabled() -> bool:
    """Optional local Chroma dual-write during ingest; off unless explicitly enabled."""
    return os.environ.get("CHROMA_ENABLED", "").lower() in ("1", "true", "yes")


def get_chroma_client():
    import chromadb
    from chromadb.config import Settings

    return chromadb.PersistentClient(
        path=str(CHROMA_DIR),
        settings=Settings(anonymized_telemetry=False),
    )


def get_collection(client=None):
    if client is None:
        client = get_chroma_client()
    return client.get_or_create_collection(
        name=COLLECTION_NAME,
        metadata={
            "hnsw:space": "cosine",
            "description": "Canadian immigration content from IRCC and official sources",
        },
    )


def _get_chroma_collection_lazy():
    """Singleton Chroma collection for reads and (optional) writes."""
    global _chroma_collection
    if _chroma_collection is None:
        _chroma_collection = get_collection(get_chroma_client())
    return _chroma_collection


def get_chroma_collection_for_app():
    """FastAPI lifespan: preload Chroma only when PATHWAYS_VECTOR_BACKEND=chroma."""
    if vector_read_backend() != "chroma":
        return None
    return _get_chroma_collection_lazy()


def split_into_chunks(text: str) -> list[str]:
    """
    Token-aware semantic chunks for embedding (see markdown_chunker.split_into_semantic_chunks).
    Short pages (< ~100 chars) are skipped upstream in embed_page.
    """
    return split_into_semantic_chunks(text)


def _embed_page_chroma(
    scrape_result: dict,
    collection,
    chunks: list[str],
    embeddings: list[list[float]],
    is_stale: bool,
) -> None:
    url = scrape_result["url"]
    ph = scrape_result.get("hash")
    page_hash_str = ph if isinstance(ph, str) else (str(ph) if ph is not None else "")
    try:
        existing = collection.get(where={"url": url})
        if existing["ids"]:
            collection.delete(ids=existing["ids"])
            log.info("Chroma: deleted %s old chunks for %s", len(existing["ids"]), url)
    except Exception as e:
        log.error(
            "Chroma: could not delete old chunks for %s (%s) — skipping upsert to avoid duplicates",
            url,
            e,
        )
        return

    base_meta = {
        "url": url,
        "display_name": scrape_result["display_name"],
        "section": scrape_result.get("section", ""),
        "visa_types": json.dumps(scrape_result.get("visa_types", [])),
        "programs": json.dumps(scrape_result.get("programs", [])),
        "high_change": bool(scrape_result.get("high_change", False)),
        "scraped_at": scrape_result.get("scraped_at", datetime.now(timezone.utc).isoformat()),
        "is_stale": is_stale,
        "country": "canada",
        "chunk_total": len(chunks),
        "page_content_hash": page_hash_str,
    }
    batch_size = 32
    url_hash = scrape_result.get("hash") or hashlib.sha256(url.encode()).hexdigest()[:16]
    for batch_start in range(0, len(chunks), batch_size):
        batch_chunks = chunks[batch_start : batch_start + batch_size]
        batch_emb = embeddings[batch_start : batch_start + len(batch_chunks)]
        batch_indices = list(range(batch_start, batch_start + len(batch_chunks)))
        ids = [f"{url_hash}_{i}" for i in batch_indices]
        metadatas = [{**base_meta, "chunk_index": i} for i in batch_indices]
        collection.upsert(
            ids=ids,
            documents=batch_chunks,
            embeddings=batch_emb,
            metadatas=metadatas,
        )


def embed_page(
    scrape_result: dict,
    is_stale: bool = False,
    conn=None,
) -> int:
    """
    Chunk and embed a single scraped page.
    Writes to Supabase when configured; writes to local Chroma only if CHROMA_ENABLED=1.
    """
    url = scrape_result["url"]
    markdown = scrape_result.get("markdown", "")

    if not markdown or len(markdown) < 100:
        log.warning(f"Skipping {url} — empty or too short content")
        return 0

    chunks = split_into_chunks(markdown)
    if not chunks:
        return 0

    n = len(chunks)
    log.info(f"Embedding {n} chunks for: {scrape_result['display_name']}")

    batch_size = 64
    embeddings: list[list[float]] = []
    for batch_start in range(0, n, batch_size):
        batch_chunks = chunks[batch_start : batch_start + batch_size]
        emb = get_embeddings_batch(batch_chunks)
        embeddings.extend(emb)

    wrote_any = False

    if supabase_db_configured():
        own_conn = conn is None
        if own_conn:
            conn = get_connection()
        try:
            insert_chunks_batch(conn, scrape_result, chunks, embeddings, is_stale=is_stale)
            wrote_any = True
        except Exception:
            if own_conn and conn is not None:
                conn.close()
            raise
        if own_conn and conn is not None:
            conn.close()
    else:
        log.warning(
            "SUPABASE_DB_URL / DATABASE_URL not set — skipped Supabase for %s "
            "(knowledge_chunks will stay empty until you add the DB URL to .env)",
            url,
        )

    if _chroma_writes_enabled():
        coll = _get_chroma_collection_lazy()
        if coll is not None:
            _embed_page_chroma(scrape_result, coll, chunks, embeddings, is_stale)
            wrote_any = True

    if not wrote_any:
        raise RuntimeError(
            "No vector store wrote data: set SUPABASE_DB_URL (or DATABASE_URL) for Supabase, "
            "or set CHROMA_ENABLED=1 for local Chroma dual-write."
        )

    log.info(f"✓ Embedded {n} chunks for {url}")
    return n


def embed_all(scrape_results: list, stale_urls: set = None) -> dict:
    """
    Embed every result in the list — does NOT consult the SQLite manifest hash.

    Prefer refresh.run_refresh / record_scrape gating in production. This helper is
    for one-off tooling only.
    """
    stale_urls = stale_urls or set()
    conn = get_connection() if supabase_db_configured() else None

    stats = {"embedded": 0, "skipped": 0, "errors": 0, "total_chunks": 0}
    ok_results = [r for r in scrape_results if r.get("markdown") and not r.get("error")]
    log.info(f"Embedding {len(ok_results)} pages (no manifest hash gate)...")

    try:
        for result in ok_results:
            try:
                is_stale = result["url"] in stale_urls
                n = embed_page(result, is_stale=is_stale, conn=conn)
                if n > 0:
                    stats["embedded"] += 1
                    stats["total_chunks"] += n
                else:
                    stats["skipped"] += 1
            except Exception as e:
                log.error(f"Embedding error for {result['url']}: {e}")
                stats["errors"] += 1
    finally:
        if conn is not None:
            conn.close()

    if supabase_db_configured():
        try:
            log.info("knowledge_chunks row count: %s", f"{count_chunks():,}")
        except Exception as e:
            log.warning("Could not count Supabase rows: %s", e)
    if _chroma_writes_enabled() and _get_chroma_collection_lazy():
        log.info("Chroma collection size: %s", _get_chroma_collection_lazy().count())

    log.info(f"\n✅ Embedding complete. Stats: {stats}")
    return stats


def _query_chroma(
    question: str,
    collection,
    n_results: int = 5,
    filter_visa_type: str = None,
    filter_section: str = None,
) -> list[dict]:
    embedding = get_embedding(question)
    where = {}
    if filter_section:
        where["section"] = filter_section

    results = collection.query(
        query_embeddings=[embedding],
        n_results=n_results,
        where=where if where else None,
        include=["documents", "metadatas", "distances"],
    )

    output = []
    for i, doc in enumerate(results["documents"][0]):
        meta = results["metadatas"][0][i]
        dist = results["distances"][0][i]

        if filter_visa_type:
            vt = json.loads(meta.get("visa_types", "[]"))
            if filter_visa_type not in vt and "all" not in vt:
                continue

        output.append(
            {
                "document": doc,
                "url": meta.get("url"),
                "display_name": meta.get("display_name"),
                "section": meta.get("section"),
                "scraped_at": meta.get("scraped_at"),
                "is_stale": meta.get("is_stale", False),
                "chunk_index": meta.get("chunk_index"),
                "similarity": round(1 - dist, 4),
            }
        )

    return output


def query(
    question: str,
    n_results: int = 5,
    filter_visa_type: str = None,
    filter_section: str = None,
    collection=None,
    model=None,
) -> list[dict]:
    _ = model  # removed SentenceTransformer; kept for optional backward-compatible call sites
    if vector_read_backend() == "chroma":
        coll = collection or _get_chroma_collection_lazy()
        if coll is None:
            raise RuntimeError(
                "PATHWAYS_VECTOR_BACKEND=chroma but Chroma is not available. "
                "Set CHROMA_ENABLED=1 (and ingest with Chroma), or use PATHWAYS_VECTOR_BACKEND=supabase "
                "with SUPABASE_DB_URL on the API."
            )
        return _query_chroma(
            question, coll, n_results, filter_visa_type, filter_section
        )

    conn = get_connection()
    try:
        embedding = get_embedding(question)
        rows = query_similar(
            conn,
            embedding,
            n_results=n_results,
            filter_section=filter_section,
            filter_visa_type=filter_visa_type,
        )
    finally:
        conn.close()

    output = []
    for r in rows:
        scraped = r.get("last_scraped_at")
        if isinstance(scraped, datetime):
            scraped = scraped.isoformat()
        output.append(
            {
                "document": r["content"],
                "url": r.get("source_url"),
                "display_name": r.get("title") or "",
                "section": r.get("section_title") or "",
                "scraped_at": scraped,
                "is_stale": False,
                "chunk_index": r.get("chunk_index"),
                "similarity": round(float(r.get("similarity", 0)), 4),
            }
        )
    return output


def get_collection_stats() -> dict:
    backend = vector_read_backend()
    if backend == "supabase":
        n = count_chunks()
        return {
            "read_backend": backend,
            "backend": "supabase_pgvector",
            "collection": "knowledge_chunks",
            "total_chunks": n,
        }
    coll = _get_chroma_collection_lazy()
    if coll is None:
        return {
            "read_backend": backend,
            "backend": "chroma",
            "collection": COLLECTION_NAME,
            "total_chunks": 0,
            "path": str(CHROMA_DIR),
            "note": "Chroma disabled or unavailable",
        }
    return {
        "read_backend": backend,
        "backend": "chroma",
        "collection": COLLECTION_NAME,
        "total_chunks": coll.count(),
        "path": str(CHROMA_DIR),
    }


if __name__ == "__main__":
    print(json.dumps(get_collection_stats(), indent=2))
