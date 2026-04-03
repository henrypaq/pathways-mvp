"""
OpenAI embeddings for Pathways — text-embedding-3-small (1536 dimensions).

Requires OPENAI_API_KEY in the environment.
"""

from __future__ import annotations

from typing import Sequence

from openai import OpenAI

OPENAI_EMBEDDING_MODEL = "text-embedding-3-small"
OPENAI_EMBEDDING_DIMENSIONS = 1536

_client: OpenAI | None = None


def _get_client() -> OpenAI:
    global _client
    if _client is None:
        _client = OpenAI()
    return _client


def get_embedding(text: str) -> list[float]:
    response = _get_client().embeddings.create(
        model=OPENAI_EMBEDDING_MODEL,
        input=text,
    )
    return list(response.data[0].embedding)


def get_embeddings_batch(texts: Sequence[str]) -> list[list[float]]:
    """One API call per batch; preserves order via response index."""
    if not texts:
        return []
    response = _get_client().embeddings.create(
        model=OPENAI_EMBEDDING_MODEL,
        input=list(texts),
    )
    ordered = sorted(response.data, key=lambda d: d.index)
    return [list(item.embedding) for item in ordered]
