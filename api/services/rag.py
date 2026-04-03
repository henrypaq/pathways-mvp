"""RAG service — Supabase pgvector query and stats."""

import sys
import os

# Make data_scrapper importable from the project root
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from data_scrapper.chunker import (
    query as _vector_query,
    get_collection_stats as _get_stats,
)


def run_query(
    question: str,
    n_results: int,
    filter_visa_type: str | None = None,
    collection=None,
    model=None,
) -> list[dict]:
    """Query Supabase pgvector or Chroma per PATHWAYS_VECTOR_BACKEND (default: supabase)."""
    _ = model
    return _vector_query(
        question=question,
        n_results=n_results,
        filter_visa_type=filter_visa_type,
        collection=collection,
    )


def get_health_stats() -> dict:
    """Return collection size stats for the health endpoint."""
    return _get_stats()
