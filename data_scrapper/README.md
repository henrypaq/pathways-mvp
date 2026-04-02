# Pathways — Canada Immigration Data Pipeline

> Smart scraping + auto-refresh system for IRCC official sources.

---

## Architecture

```
sources.py          ← Master list of 39 IRCC URLs with rich metadata
    ↓
db.py               ← SQLite manifest: tracks hashes, freshness, history
    ↓
scraper.py          ← HTTP scraper: HTML → clean markdown
    ↓
chunker.py          ← Markdown → chunks → sentence-transformer embeddings → ChromaDB
    ↓
refresh.py          ← Smart refresh engine: hash comparison, skip unchanged pages
    ↓
scheduler.py        ← APScheduler: runs refresh every 3 days automatically
    ↓
main.py             ← CLI entrypoint
```

### The Smart Refresh Logic

The key insight: **don't re-embed pages that haven't changed**.

```
For each page due for refresh:
  1. Scrape current HTML
  2. SHA-256(HTML) == stored_hash?
     → YES: skip re-embedding, update last_scraped_at only   ✅ FAST
     → NO:  delete old chunks, re-chunk, re-embed            🔄 RE-EMBED
  3. If last_changed_at > 6 months: mark is_stale=True       ⚠️ WARN USER
```

Government pages are largely stable — most re-scrapes will be **no-ops**.
Only changed pages burn embedding compute.

---

## Sources Coverage (39 pages)

| Section | Pages |
|---------|-------|
| Express Entry | 9 (overview, eligibility, FSW, CEC, FST, how it works, profile, draws, documents) |
| CRS Score | 2 (overview + full points grid) |
| PNP | 2 |
| Work Permits | 4 (overview, eligibility, LMIA-exempt, open work permit) |
| PGWP | 2 |
| Study Permit | 2 |
| Permanent Residence | 3 |
| Family Sponsorship | 2 |
| Refugees & Asylum | 3 |
| Citizenship | 2 |
| Processing Times | 1 ⚡ HIGH-CHANGE |
| Fees | 1 |
| Language Tests | 1 |
| NOC Codes | 1 |
| Credentials (ECA) | 1 |
| Biometrics & Medical | 2 |
| Application Status | 1 |

**High-change pages** (refreshed every 24h, not 3 days):
- IRCC Processing Times (updated weekly by IRCC)
- Express Entry Draw Results (every ~2 weeks)

---

## Chunk Metadata Schema

Every chunk stored in ChromaDB carries:

```json
{
  "url": "https://www.canada.ca/...",
  "display_name": "Express Entry — Overview",
  "section": "Express Entry",
  "visa_types": "[\"express_entry\"]",
  "programs": "[\"FSW\", \"CEC\", \"FST\"]",
  "high_change": false,
  "scraped_at": "2026-03-30T00:00:00+00:00",
  "is_stale": false,
  "country": "canada",
  "chunk_index": 0,
  "chunk_total": 4
}
```

Use `visa_types` and `section` for **profile-aware pre-filtering** in RAG queries.

---

## Setup & Usage

### 1. Install dependencies

```bash
pip install chromadb sentence-transformers apscheduler requests beautifulsoup4 lxml aiohttp
```

### 2. Initialize the database

```bash
python main.py init
```

This creates `db/manifest.db` with all 39 sources registered.

### 3. First-time scrape (run BEFORE the hackathon)

```bash
python main.py scrape
```

Takes ~2–3 minutes (39 pages × 1.5s delay). 
Saves markdown to `data/raw/`, embeddings to `data/chroma/`.

### 4. Smart refresh (run anytime)

```bash
python main.py refresh          # refresh only stale pages (>3 days old)
python main.py refresh --force  # force re-scrape all pages
python main.py refresh --check  # dry run: show what would refresh
```

### 5. Check status

```bash
python main.py stats
```

Output example:
```
📊 PATHWAYS MANIFEST STATS
────────────────────────────
Total pages tracked:  39
Successfully scraped: 39
Embedded in ChromaDB: 39
Stale pages (>6mo):   0
Error pages:          0

ChromaDB collection: 'pathways_canada'
Total chunks:        ~180–250

✅ All pages are fresh.
```

### 6. Test a query

```bash
python main.py query "What documents do I need for Express Entry?"
python main.py query "How do I calculate my CRS score?"
python main.py query "Can I get a PGWP after graduation?"
```

### 7. Start the background scheduler

```bash
python main.py scheduler
```

Runs forever, refreshing automatically:
- Full refresh: every 3 days at 02:00 UTC
- High-change pages: every day at 06:00 UTC

For **production/cron**, use `--once` instead:
```bash
# Add to crontab: run every 3 days at 2am
0 2 */3 * * cd /app && python main.py scheduler --once
```

---

## RAG Integration (FastAPI)

```python
from chunker import get_chroma_client, get_collection, load_model, query

# Initialize once at startup
model = load_model()
collection = get_collection()

@app.post("/search")
async def search(q: str, visa_type: str = None, section: str = None):
    results = query(
        question=q,
        model=model,
        collection=collection,
        n_results=5,
        filter_visa_type=visa_type,   # e.g. "express_entry"
        filter_section=section,        # e.g. "Express Entry"
    )
    # Stale warning for UI
    for r in results:
        r["stale_warning"] = r["is_stale"]
    return {"results": results}
```

---

## Production Upgrades

| Component | Hackathon | Production |
|-----------|-----------|------------|
| Embeddings | `all-MiniLM-L6-v2` (local) | `voyage-multilingual-2` (API) |
| Vector DB | ChromaDB (local file) | pgvector on Supabase |
| Scheduler | APScheduler (in-process) | Vercel Cron / Railway |
| Scraping | `requests` + BS4 | Firecrawl (handles JS, scheduling) |
| Scrape trigger | Time-based | Webhook on content-hash change |

---

## File Structure

```
pathways/
├── main.py           ← CLI entrypoint
├── sources.py        ← 39 IRCC source URLs with metadata
├── db.py             ← SQLite manifest (hashes, freshness, history)
├── scraper.py        ← HTTP scraper: HTML → clean markdown
├── chunker.py        ← Chunking + ChromaDB embedding
├── refresh.py        ← Smart refresh engine
├── scheduler.py      ← APScheduler background jobs
├── db/
│   └── manifest.db   ← SQLite database (auto-created)
├── data/
│   ├── raw/          ← Scraped markdown files (.md)
│   └── chroma/       ← ChromaDB vector storage
└── logs/             ← Scheduler logs
```
