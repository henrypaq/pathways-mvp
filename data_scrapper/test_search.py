#!/usr/bin/env python3
"""
Run semantic retrieval smoke tests against Supabase knowledge_chunks.

Usage (from repo root):
  python3 data_scrapper/test_search.py

Requires: OPENAI_API_KEY, SUPABASE_DB_URL (or DATABASE_URL), populated knowledge_chunks.
Optional: apply match_knowledge_chunks migration (fallback uses inline SQL).
"""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from data_scrapper.semantic_retrieval import search
from data_scrapper.supabase_knowledge import count_chunks, supabase_db_configured


QUERIES = [
    "What are Express Entry requirements?",
    "How does Express Entry work?",
    "What documents are needed for a study permit?",
    "Who needs a work permit in Canada?",
    "Can I immigrate to Canada without a job offer?",
]


def main() -> int:
    if not supabase_db_configured():
        print("ERROR: SUPABASE_DB_URL or DATABASE_URL is not set.", file=sys.stderr)
        return 1

    try:
        n = count_chunks()
        print(f"knowledge_chunks row count: {n:,}\n")
        if n == 0:
            print("WARNING: Table is empty — run ingest first.\n")
    except Exception as e:
        print(f"ERROR: Could not reach database: {e}", file=sys.stderr)
        return 1

    for q in QUERIES:
        print("=" * 72)
        print(f"Query: {q}\n")
        try:
            results = search(q, k=5)
        except Exception as e:
            print(f"  SEARCH FAILED: {e}\n")
            continue
        if not results:
            print("  (no results)\n")
            continue
        for i, r in enumerate(results, 1):
            sim = r["similarity"]
            url = r["url"]
            body = (r["content"] or "").replace("\n", " ")
            preview = body[:300] + ("…" if len(body) > 300 else "")
            print(f"  [{i}] similarity={sim:.4f}")
            print(f"      url: {url}")
            print(f"      content: {preview}\n")

    print("=" * 72)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
