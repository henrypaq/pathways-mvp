"""
main.py — Pathways data pipeline entrypoint.

Commands:
  python main.py init          — initialize DB, sync sources
  python main.py scrape        — scrape all sources (first time or forced)
  python main.py refresh       — smart refresh (only stale pages)
  python main.py stats         — show manifest + ChromaDB stats
  python main.py query "..."   — test a RAG query against the vector store
  python main.py scheduler     — start background refresh scheduler

Quick start for hackathon:
  python main.py init
  python main.py scrape        # run this BEFORE the hackathon
  python main.py query "What documents do I need for Express Entry?"
"""

import sys
import logging

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger("main")


def cmd_init():
    from db import init_db
    from refresh import sync_sources
    init_db()
    sync_sources()
    log.info("✅ Initialized.")


def cmd_scrape():
    """Full initial scrape. Run once before the hackathon."""
    from refresh import run_refresh
    stats = run_refresh(force=True, trigger="initial_scrape")
    print(f"\nDone: {stats}")


def cmd_refresh():
    """Smart refresh — only re-scrapes stale pages."""
    from refresh import run_refresh
    stats = run_refresh(trigger="manual")
    print(f"\nDone: {stats}")


def cmd_stats():
    from refresh import print_stats
    print_stats()


def cmd_query(question: str):
    from chunker import get_chroma_client, get_collection, load_model, query as chroma_query
    import json

    print(f"\n🔍 Query: {question}\n{'─'*60}")
    client = get_chroma_client()
    collection = get_collection(client)
    model = load_model()

    results = chroma_query(question, model, collection, n_results=5)

    if not results:
        print("No results found.")
        return

    for i, r in enumerate(results, 1):
        print(f"\n[{i}] {r['display_name']} (similarity: {r['similarity']})")
        print(f"    Source: {r['url']}")
        print(f"    Section: {r['section']} | Chunk: {r['chunk_index']}")
        if r.get("is_stale"):
            print(f"    ⚠️  STALE: This content may be outdated")
        print(f"\n    {r['document'][:400]}...")
        print()


def cmd_scheduler():
    from scheduler import start_scheduler
    start_scheduler()


COMMANDS = {
    "init": cmd_init,
    "scrape": cmd_scrape,
    "refresh": cmd_refresh,
    "stats": cmd_stats,
    "query": cmd_query,
    "scheduler": cmd_scheduler,
}


if __name__ == "__main__":
    args = sys.argv[1:]

    if not args:
        print(__doc__)
        sys.exit(0)

    cmd = args[0]

    if cmd == "query" and len(args) > 1:
        cmd_query(" ".join(args[1:]))
    elif cmd in COMMANDS:
        COMMANDS[cmd]()
    else:
        print(f"Unknown command: {cmd}")
        print(f"Available: {', '.join(COMMANDS)}")
        sys.exit(1)
