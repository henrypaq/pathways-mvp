"""
chunker.py — Text chunking and embedding pipeline for Pathways.

Strategy:
  - Splits cleaned markdown using a sliding window (~400 tokens, 50-token overlap)
  - Each chunk carries rich metadata for profile-aware RAG filtering
  - Embeddings use sentence-transformers all-MiniLM-L6-v2 locally
  - Stores into ChromaDB (local persistent) with upsert semantics
  - Upsert means: re-embedding a changed page replaces old chunks cleanly

Chunk metadata schema (all filterable in ChromaDB):
  {
    "url": str,
    "display_name": str,
    "section": str,
    "visa_types": str,       # JSON-encoded list (ChromaDB stores strings)
    "programs": str,         # JSON-encoded list
    "high_change": bool,
    "scraped_at": str,       # ISO-8601
    "chunk_index": int,
    "chunk_total": int,
    "is_stale": bool,
    "country": "canada",
  }
"""

import re
import json
import logging
from pathlib import Path
from datetime import datetime, timezone
from typing import Optional

import chromadb
from chromadb.config import Settings
from sentence_transformers import SentenceTransformer

log = logging.getLogger("chunker")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

CHROMA_DIR = Path(__file__).parent / "data" / "chroma"
CHROMA_DIR.mkdir(parents=True, exist_ok=True)

COLLECTION_NAME = "pathways_canada"

# Chunking config (in approximate characters, not tokens)
# ~400 tokens ≈ 1600 chars for English text
CHUNK_SIZE = 1500      # target chunk size in chars
CHUNK_OVERLAP = 200    # overlap between adjacent chunks


def get_chroma_client() -> chromadb.PersistentClient:
    return chromadb.PersistentClient(
        path=str(CHROMA_DIR),
        settings=Settings(anonymized_telemetry=False),
    )


def get_collection(client: Optional[chromadb.PersistentClient] = None):
    if client is None:
        client = get_chroma_client()
    return client.get_or_create_collection(
        name=COLLECTION_NAME,
        metadata={
            "hnsw:space": "cosine",
            "description": "Canadian immigration content from IRCC and official sources",
        }
    )


def load_model() -> SentenceTransformer:
    log.info("Loading sentence-transformers model...")
    model = SentenceTransformer("all-MiniLM-L6-v2")
    log.info("Model loaded.")
    return model


def split_into_chunks(text: str, chunk_size: int = CHUNK_SIZE, overlap: int = CHUNK_OVERLAP) -> list[str]:
    """
    Smart markdown-aware chunking:
      1. Try to split on heading boundaries first (## or ###)
      2. Fall back to sentence-aware splitting within sections
      3. Enforce max chunk_size with overlap

    This preserves context better than blind character splits.
    """
    if not text or len(text) < 100:
        return [text] if text else []

    # Step 1: Split on markdown headings (keep heading with its content)
    heading_pattern = re.compile(r"(?=^#{1,3} )", re.MULTILINE)
    sections = heading_pattern.split(text)
    sections = [s.strip() for s in sections if s.strip()]

    chunks = []
    for section in sections:
        if len(section) <= chunk_size:
            chunks.append(section)
        else:
            # Section too large — split into overlapping chunks
            chunks.extend(_sliding_window(section, chunk_size, overlap))

    # Merge tiny chunks (< 150 chars) with their successor
    merged = []
    buffer = ""
    for chunk in chunks:
        if len(buffer) + len(chunk) < chunk_size:
            buffer = (buffer + "\n\n" + chunk).strip()
        else:
            if buffer:
                merged.append(buffer)
            buffer = chunk
    if buffer:
        merged.append(buffer)

    return merged


def _sliding_window(text: str, chunk_size: int, overlap: int) -> list[str]:
    """Simple sliding window split on sentence boundaries."""
    # Split on sentence boundaries
    sentences = re.split(r"(?<=[.!?])\s+", text)
    chunks = []
    current = []
    current_len = 0

    for sentence in sentences:
        slen = len(sentence)
        if current_len + slen > chunk_size and current:
            chunks.append(" ".join(current))
            # Keep last ~overlap chars worth of sentences
            overlap_sents = []
            overlap_len = 0
            for s in reversed(current):
                if overlap_len + len(s) > overlap:
                    break
                overlap_sents.insert(0, s)
                overlap_len += len(s)
            current = overlap_sents
            current_len = overlap_len
        current.append(sentence)
        current_len += slen

    if current:
        chunks.append(" ".join(current))

    return chunks


def embed_page(
    scrape_result: dict,
    model: SentenceTransformer,
    collection,
    is_stale: bool = False,
) -> int:
    """
    Chunk and embed a single scraped page.
    Uses upsert — existing chunks for this URL are replaced cleanly.

    Returns number of chunks embedded.
    """
    url = scrape_result["url"]
    markdown = scrape_result.get("markdown", "")

    if not markdown or len(markdown) < 100:
        log.warning(f"Skipping {url} — empty or too short content")
        return 0

    # Delete existing chunks for this URL before re-embedding
    # ChromaDB doesn't support delete-by-metadata, so we use a prefix on IDs
    try:
        existing = collection.get(where={"url": url})
        if existing["ids"]:
            collection.delete(ids=existing["ids"])
            log.info(f"Deleted {len(existing['ids'])} old chunks for {url}")
    except Exception as e:
        log.warning(f"Could not delete old chunks: {e}")

    chunks = split_into_chunks(markdown)
    if not chunks:
        return 0

    log.info(f"Embedding {len(chunks)} chunks for: {scrape_result['display_name']}")

    # Build metadata for each chunk
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
    }

    # Embed in batches of 32
    batch_size = 32
    total_embedded = 0

    for batch_start in range(0, len(chunks), batch_size):
        batch_chunks = chunks[batch_start:batch_start + batch_size]
        batch_indices = list(range(batch_start, batch_start + len(batch_chunks)))

        # Generate IDs: url_hash + chunk_index for stable, collision-free IDs
        url_hash = scrape_result.get("hash") or __import__("hashlib").sha256(url.encode()).hexdigest()[:16]
        ids = [f"{url_hash}_{i}" for i in batch_indices]

        metadatas = [{**base_meta, "chunk_index": i} for i in batch_indices]

        # Compute embeddings
        embeddings = model.encode(batch_chunks, show_progress_bar=False).tolist()

        collection.upsert(
            ids=ids,
            documents=batch_chunks,
            embeddings=embeddings,
            metadatas=metadatas,
        )

        total_embedded += len(batch_chunks)

    log.info(f"✓ Embedded {total_embedded} chunks for {url}")
    return total_embedded


def embed_all(scrape_results: list, stale_urls: set = None) -> dict:
    """
    Embed all successfully scraped pages.
    Returns stats dict.
    """
    stale_urls = stale_urls or set()
    client = get_chroma_client()
    collection = get_collection(client)
    model = load_model()

    stats = {"embedded": 0, "skipped": 0, "errors": 0, "total_chunks": 0}

    ok_results = [r for r in scrape_results if r.get("markdown") and not r.get("error")]
    log.info(f"Embedding {len(ok_results)} pages...")

    for result in ok_results:
        try:
            is_stale = result["url"] in stale_urls
            n = embed_page(result, model, collection, is_stale=is_stale)
            if n > 0:
                stats["embedded"] += 1
                stats["total_chunks"] += n
            else:
                stats["skipped"] += 1
        except Exception as e:
            log.error(f"Embedding error for {result['url']}: {e}")
            stats["errors"] += 1

    count = collection.count()
    log.info(f"\n✅ Embedding complete. Collection size: {count:,} chunks")
    log.info(f"Stats: {stats}")
    return stats


def query(
    question: str,
    model: SentenceTransformer,
    collection,
    n_results: int = 5,
    filter_visa_type: str = None,
    filter_section: str = None,
) -> list[dict]:
    """
    Query the vector store with optional profile-aware pre-filtering.

    Returns list of {document, metadata, distance} dicts.
    """
    embedding = model.encode([question]).tolist()[0]

    where = {}
    if filter_section:
        where["section"] = filter_section
    # Note: filtering on visa_types requires JSON string matching — we do
    # post-filter for now since ChromaDB doesn't support JSON array contains.

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

        # Post-filter by visa_type if specified
        if filter_visa_type:
            vt = json.loads(meta.get("visa_types", "[]"))
            if filter_visa_type not in vt and "all" not in vt:
                continue

        output.append({
            "document": doc,
            "url": meta.get("url"),
            "display_name": meta.get("display_name"),
            "section": meta.get("section"),
            "scraped_at": meta.get("scraped_at"),
            "is_stale": meta.get("is_stale", False),
            "chunk_index": meta.get("chunk_index"),
            "similarity": round(1 - dist, 4),
        })

    return output


def get_collection_stats() -> dict:
    client = get_chroma_client()
    collection = get_collection(client)
    count = collection.count()
    return {"collection": COLLECTION_NAME, "total_chunks": count, "path": str(CHROMA_DIR)}


if __name__ == "__main__":
    stats = get_collection_stats()
    print(json.dumps(stats, indent=2))
