"""RAG service — ChromaDB query and collection stats."""

import sys
import os

# Make data_scrapper importable from the project root
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from data_scrapper.chunker import (
    query as _chroma_query,
    get_collection_stats as _get_stats,
)


def run_query(
    question: str,
    model,
    collection,
    n_results: int,
    filter_visa_type: str | None = None,
) -> list[dict]:
    """Query ChromaDB and return ranked results."""
    return _chroma_query(
        question=question,
        model=model,
        collection=collection,
        n_results=n_results,
        filter_visa_type=filter_visa_type,
    )


def get_health_stats() -> dict:
    """Return collection size stats for the health endpoint."""
    return _get_stats()
