@AGENTS.md

<!--
  MAINTENANCE INSTRUCTION (for Claude):
  This file is the primary context document. Update it at the end of every session
  or whenever significant progress is made — keep the "Current Status" and "Next Steps"
  sections current so the next session can resume without re-exploring the codebase.
  Put high-churn sections (status, next steps) near the top to avoid reading the whole file.
-->

---

# Pathways Platform — Claude Context

## ⚡ Current Status (last updated: 2026-04-03)

### Recently completed
- **Scraper bug fixed**: `STRIP_SELECTORS` in `data_scrapper/scraper.py` contained `.mwsgeneric-base-html` which Canada.ca uses for all main article content — every page scraped to a 150-char stub. Removed it. Pages now produce 1–7 K chars of real content.
- **IRCC data populated**: Force-refreshed all 39 sources. Supabase `public.knowledge_chunks` now has **55 real chunks** (was 34 stubs). Vector search returns semantically correct results (verified directly).
- **Language test field normalization**: Added `normalizeVoiceProfile()` to `types/voice.ts`. Voice/chat AI emits flat fields (`language_test_taken`, `language_test_name`, `language_test_score`, `language_test_self`); this function consolidates them into the typed nested `language_test` object expected by `PathwaysProfile`. Wired into both `hooks/useVoiceOnboarding.ts` and `hooks/useTextOnboarding.ts`.
- **Recommendations result caching**: `app/results/page.tsx` caches the full `RecommendationsResult` in localStorage keyed by a stable profile hash, 24 h TTL. Eagerly read in `useState` initializer (no loading flash on return visits). Refresh button + error retry both force-bypass the cache.

### Known state
- FastAPI backend (`uvicorn api.main:app --reload --port 8000`) must be running locally for recommendations to work — it serves the `/search` pgvector endpoint called by `app/api/recommendations/route.ts`.
- All critical env vars confirmed present in `.env.local`: `NEXT_PUBLIC_API_URL`, `OPENAI_API_KEY`, `SUPABASE_DB_URL`.
- 6 of 39 IRCC source URLs returned 404 (IRCC restructured those pages). Not yet fixed.

---

## 🔜 Immediate Next Steps (in priority order)

1. **Run end-to-end test** — start FastAPI + Next.js, go through voice/chat onboarding → "See my pathways" → `/results`. Verify the 3-stage pipeline (query gen → RAG search → synthesis) works with real data. Most likely failure point: Claude synthesis returning malformed JSON or the recommendations timeout.

2. **Fix chunk deduplication order** — in `app/api/recommendations/route.ts:retrieveChunks()` (around line 122–138), URL-based deduplication runs before the similarity sort, so a lower-quality chunk for a URL can be kept over a higher-quality one. Sort by similarity first, then deduplicate by URL.

4. **Fix 404 source URLs** — 6 IRCC pages returned 404 during the last scrape (IRCC restructured). Find replacement URLs and update `data_scrapper/sources.py`, then re-run `python3 refresh.py --force`.

5. **Improve chunk coverage** — 55 chunks across 33 pages is functional but thin. Some high-value pages (CRS scoring grid, FSW selection factors) produce only 1–2 chunks because Canada.ca hides content inside `<details>` expand panels that BeautifulSoup doesn't render. Either add more source URLs to `data_scrapper/sources.py` or extend the scraper to extract `<details>` content.

6. **Wire the two recommendation systems** — `app/api/recommendations/generate/route.ts` (deterministic scorer) fires async after onboarding and saves to `public.recommendations`, but `/results` page never reads it — it calls the RAG pipeline fresh every time. Unify: after RAG synthesis returns, persist it to Supabase `recommendations` table so subsequent visits load from DB.

---

## Project Overview

Pathways is an AI-powered Canadian immigration guidance platform. Users go through a voice or chat onboarding conversation to build a profile, then receive personalized pathway recommendations grounded in official IRCC content.

**This is NOT a generic chatbot.** It is a guided reasoning system grounded in real immigration data retrieved from Supabase pgvector.

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js (App Router), React 19, TypeScript, Tailwind 4, Framer Motion |
| Backend | FastAPI (Python) |
| Database | Supabase (Postgres + pgvector) |
| Embeddings | OpenAI `text-embedding-3-small` (1536 dims) |
| LLM | Claude (`claude-sonnet-4-5`) via Anthropic SDK |
| Voice | ElevenLabs TTS + browser Web Speech API (SpeechRecognition) |
| State | Zustand (`lib/onboardingStore.ts`) |

---

## Full Data Flow

```
Browser
  │
  ├─ Onboarding (/onboarding) — step 1 renders Onboarding1.tsx
  │   ├─ Voice mode  → useVoiceOnboarding hook
  │   ├─ Chat mode   → useTextOnboarding hook
  │   └─ Manual mode → ManualProfileForm
  │
  │   Each mode: POST /api/voice/chat (Next.js route)
  │     → streams Claude response
  │     → parses PROFILE_DELTA:{...} tokens → merges into profile
  │     → normalizeVoiceProfile() consolidates language_test flat fields
  │     → saves to localStorage + Supabase profiles table (incremental)
  │     → on ONBOARDING_COMPLETE token:
  │         → isComplete = true → "See my pathways →" button appears
  │         → fire-and-forget: savePathwaysProfileToSupabase()
  │         → fire-and-forget: POST /api/recommendations/generate
  │              (deterministic scorer → saves to public.recommendations)
  │
  ├─ Results (/results)
  │   → reads profile from localStorage
  │   → POST /api/recommendations (Next.js route, maxDuration=60s)
  │       Stage 1: Claude generates 5 targeted search queries from profile
  │       Stage 2: 5× parallel POST /search → FastAPI → Supabase pgvector
  │                dedup by URL, keep top 15 by similarity
  │       Stage 3: Claude synthesizes RecommendationsResult JSON
  │   → renders PathwayMatchCard components + PersonalizedRoadmap sidebar
  │
  └─ Dashboard (/dashboard) — future case management
```

---

## Key Files

| File | Purpose |
|---|---|
| `app/api/voice/chat/route.ts` | Claude streaming chat endpoint; emits `PROFILE_DELTA` + `ONBOARDING_COMPLETE` tokens |
| `app/api/recommendations/route.ts` | 3-stage RAG pipeline (query gen → pgvector search → synthesis) |
| `app/api/recommendations/generate/route.ts` | Deterministic scorer; fires post-onboarding, requires auth |
| `app/results/page.tsx` | Results UI — calls `/api/recommendations`, renders cards |
| `hooks/useVoiceOnboarding.ts` | Voice mode state machine: speech rec → runTurn → TTS |
| `hooks/useTextOnboarding.ts` | Chat mode equivalent (no TTS) |
| `types/voice.ts` | `PathwaysProfile` type + `normalizeVoiceProfile()` |
| `lib/scoring/pathwayScorer.ts` | Deterministic scorer for FSW, PNP Ontario, Family Sponsorship |
| `lib/scoring/mapProfileToScorer.ts` | Maps `Partial<PathwaysProfile>` → `UserProfile`; handles both flat and nested language_test |
| `data_scrapper/scraper.py` | BeautifulSoup scraper for Canada.ca IRCC pages |
| `data_scrapper/chunker.py` | Chunks markdown, embeds via OpenAI, writes to Supabase pgvector |
| `data_scrapper/sources.py` | 39 IRCC source URLs with metadata |
| `data_scrapper/refresh.py` | Smart refresh engine (hash-based change detection) |
| `supabase/migrations/` | Full schema + RLS policies |

---

## Database Key Tables

| Table | Purpose |
|---|---|
| `public.profiles` | One row per user; `data jsonb` holds full `Partial<PathwaysProfile>` |
| `public.knowledge_chunks` | IRCC content: `content`, `embedding vector(1536)`, `source_url`, `pathway_tags[]` |
| `public.recommendations` | Deterministic scorer output per `profile_id` |

Vector search uses the `match_knowledge_chunks` SQL function (cosine similarity via pgvector `<=>` operator).

---

## Current Pathway Matching Strategy

Retrieval-driven, not rule-driven. Claude must:
1. Use retrieved IRCC content as the primary signal
2. Infer pathways mentioned in relevant documents
3. Map user profile attributes → requirements in content
4. Reason about eligibility based on that comparison

**Claude should NOT** invent eligibility rules, assume missing requirements are satisfied, or rely on memorized immigration knowledge alone.

Deterministic rule-based logic (Express Entry FSW, PNP Ontario, Family Sponsorship) exists in `lib/scoring/` but is currently only used for the background scoring endpoint, not the results page display.

---

## IRCC Data Pipeline

Run from `data_scrapper/` directory:

```bash
python3 refresh.py              # smart refresh (only changed pages)
python3 refresh.py --force      # re-scrape all 39 pages
python3 refresh.py --check      # dry-run: what would refresh
python3 refresh.py --stats      # manifest stats
```

**Important scraper note**: Canada.ca uses `.mwsgeneric-base-html` for main article content. This class must NOT be in `STRIP_SELECTORS` in `scraper.py` (bug was fixed 2026-04-03).

---

## Environment Variables (required)

In `.env.local` at project root:

| Var | Used by |
|---|---|
| `ANTHROPIC_API_KEY` | Next.js routes + FastAPI |
| `OPENAI_API_KEY` | FastAPI embeddings |
| `SUPABASE_DB_URL` | FastAPI pgvector queries |
| `NEXT_PUBLIC_SUPABASE_URL` | Next.js Supabase client |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Next.js Supabase client |
| `NEXT_PUBLIC_API_URL` | Next.js → FastAPI base URL (default `http://127.0.0.1:8000`) |

---

## Running Locally

```bash
# Terminal 1 — FastAPI backend (required for recommendations)
uvicorn api.main:app --reload --port 8000

# Terminal 2 — Next.js frontend
npm run dev
```
