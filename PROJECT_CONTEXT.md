# Pathways — Project context for AI assistants

This document describes the **pathways-platform** monorepo: product intent, architecture, workflows, environment variables, and ownership boundaries. It is meant to onboard tools like Claude Code without reading the entire tree.

---

## Product summary

**Pathways** is an AI-assisted immigration guidance product focused on **Canadian IRCC (Immigration, Refugees and Citizenship Canada)** content. The frontend is a Next.js app (marketing landing, multi-step onboarding, pathway recommendations, and a mock “application dashboard”). A **FastAPI** backend provides RAG search and document analysis over embedded official IRCC text. A **data pipeline** (`data_scrapper/`) scrapes IRCC pages, chunks them, and stores embeddings in **ChromaDB**.

**Important:** Legal disclaimer — the app is assistive; users must verify everything against official government sources.

---

## Repository layout (high level)

| Area | Path | Role |
|------|------|------|
| Next.js App Router UI | `app/` | Pages, layouts, and **Next.js Route Handlers** under `app/api/*` |
| React components | `components/` | Onboarding UI, voice orb, chat, results cards, shared UI |
| Client hooks | `hooks/` | Voice and text onboarding orchestration |
| Shared TS types | `lib/types.ts` | **Contract** with Python Pydantic models — change in sync |
| Backend HTTP client (frontend → FastAPI) | `lib/api.ts` | **Only** place that calls the FastAPI server (`/search`, `/analyze`, `/health`) |
| Onboarding state | `lib/onboardingStore.ts` | Zustand: step index, mode, profile fields, documents (UI state) |
| Demo / placeholder data | `lib/mockData.ts` | Mock pathways, documents, application steps for UI prototypes |
| Voice/chat types | `types/voice.ts` | `PathwaysProfile`, conversation types, required field list |
| FastAPI backend | `api/` | Python: search, analyze, health; uses Chroma + Anthropic |
| Data pipeline | `data_scrapper/` | Scrape → chunk → embed → Chroma; CLI + scheduler |

**Git remote:** `origin` typically points at `pathways-mvp` (name may differ locally). Frontend and backend live in one repo.

---

## User-facing workflows

### 1. Landing (`/`)

- Static marketing: value props (profile-aware guidance, cited sources, document AI).
- CTAs route to `/onboarding` (“Sign in” label is **not** real auth — it is navigation).

### 2. Onboarding (`/onboarding`)

- **Step 0 — `ModeSelect`:** Choose **voice**, **chat**, or **manual** profile entry.
- **Steps 1–6 — `Onboarding1` … `Onboarding6`:** Situation/pathway selection, destination, purpose, documents, etc. (wizard content; see components for exact copy and branching).
- **Step 7 — `Onboarding7`:** “Application dashboard” preview using **mock** steps/documents from `lib/mockData.ts` (not wired to real backend persistence).

**Voice mode (`Onboarding1` + `useVoiceOnboarding`):**

- Uses browser **Web Speech API** (`SpeechRecognition` / `webkitSpeechRecognition`) for input — **not** OpenAI Whisper in current code.
- Sends utterances to **`POST /api/voice/chat`** (streaming Claude response).
- Parses `PROFILE_DELTA:{...}` JSON lines from the stream to merge into `PathwaysProfile` and **`localStorage`** (key from `NEXT_PUBLIC_PROFILE_KEY`).
- When the model outputs `ONBOARDING_COMPLETE`, sets onboarding done in **`localStorage`** (`NEXT_PUBLIC_ONBOARDING_DONE_KEY`).
- Speaks assistant text via **`POST /api/voice/speak`** (ElevenLabs streaming TTS), sentence-by-sentence.

**Chat mode:** Same `/api/voice/chat` contract via `useTextOnboarding` + `ChatOnboarding` (no TTS).

**Manual mode:** `ManualProfileForm` writes profile fields to the same `localStorage` profile key.

### 3. Results (`/results`)

- Reads profile from `localStorage`.
- **`POST /api/recommendations`** with `{ profile }`.
- That route: (1) Claude generates search queries from profile, (2) calls FastAPI **`POST /search`** for each query (`NEXT_PUBLIC_API_URL`), (3) dedupes chunks, (4) Claude synthesizes structured JSON → `RecommendationsResult` (`lib/types.ts`).
- UI: pathway cards, roadmap sidebar, links to sources, CTA to `/dashboard`.

### 4. Dashboard (`/dashboard`)

- Thin shell reusing **`Onboarding7`** (mock Express Entry–style tracker).

---

## Next.js server routes (`app/api/`)

These run on the **Node/Edge server** (not FastAPI):

| Route | Purpose | Env deps |
|-------|---------|----------|
| `POST /api/voice/chat` | Streams Claude (`claude-sonnet-4-5`) for onboarding dialogue; system prompt encodes profile collection rules | `ANTHROPIC_API_KEY` |
| `POST /api/voice/speak` | Proxies to ElevenLabs TTS stream | `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID` |
| `POST /api/recommendations` | RAG-orchestrated pathway report | `ANTHROPIC_API_KEY`, `NEXT_PUBLIC_API_URL` |

---

## FastAPI backend (`api/`)

- **Entry:** `api/main.py` — lifespan loads embedding model + Chroma collection + Anthropic client.
- **Requires `ANTHROPIC_API_KEY` at startup** (raises if missing). Loads dotenv from **repo-root `.env`** (see `load_dotenv` in `main.py`), not Next’s `.env.local`.
- **CORS:** `http://localhost:3000` + `FRONTEND_URL` (if set).
- **Routers:**
  - `POST /search` — Chroma retrieval + Claude answer (`api/services/rag.py`, `claude.py`).
  - `POST /analyze` — Document parsing / gap analysis (`api/services/document.py`).
  - `GET /health` — Health + chunk stats.

**Deploy:** `api/README_DEPLOY.md` — Railway, Dockerfile, optional first-run scrape; Vercel env `NEXT_PUBLIC_API_URL` points to deployed API.

---

## Data pipeline (`data_scrapper/`)

- Documented in `data_scrapper/README.md`: 39 IRCC sources, SQLite manifest, smart refresh by content hash, Chroma collection `pathways_canada`, scheduler for periodic refresh.
- Raw markdown under `data_scrapper/data/raw/` (many checked-in samples).
- **Not** invoked by the Next.js app directly; consumed by the Python API via `chunker` / Chroma.

---

## Shared contract (critical)

Per **`OWNERS.md`**:

- **`lib/types.ts`** and **`lib/api.ts`** are shared between frontend and backend semantics. Any change to request/response shapes must update **both** TS types and **`api/models/*.py`** together.
- Developer A: `api/`, `data_scrapper/`. Developer B: `app/`, `components/`, `lib/onboardingStore.ts`, `lib/mockData.ts`.

---

## Environment variables

### Next.js (`.env.local` is standard)

| Variable | Used by | Notes |
|----------|---------|--------|
| `NEXT_PUBLIC_API_URL` | `lib/api.ts`, `app/api/recommendations/route.ts` | FastAPI base URL; default `http://localhost:8000` |
| `ANTHROPIC_API_KEY` | `app/api/voice/chat`, `app/api/recommendations` | Server-only |
| `ELEVENLABS_API_KEY` | `app/api/voice/speak` | Server-only |
| `ELEVENLABS_VOICE_ID` | `app/api/voice/speak` | ElevenLabs voice id |
| `NEXT_PUBLIC_PROFILE_KEY` | Hooks, manual form, results | `localStorage` key for profile JSON |
| `NEXT_PUBLIC_ONBOARDING_DONE_KEY` | Voice/text/manual hooks | `localStorage` flag for completion |

### Python API (repo-root `.env` per `api/main.py`)

| Variable | Purpose |
|----------|---------|
| `ANTHROPIC_API_KEY` | **Required** at startup |
| `FRONTEND_URL` | CORS for deployed frontend (e.g. Vercel URL) |

### Documented but unused in TS/JS (as of this write-up)

- **`OPENAI_API_KEY`** — Comment in `.env.local` suggests Whisper; **no references** in the TypeScript/JavaScript codebase. Safe to omit unless you add Whisper-based transcription.

### Optional / deployment

- **`FRONTEND_URL`** — Backend CORS on Railway/production (not required for localhost-only dev).
- Vercel: `vercel.json` sets `ignoreCommand` so changes only under `api/` or `data_scrapper/` may skip a frontend redeploy.

---

## Frontend ↔ backend API surface (`lib/api.ts` only)

- `searchPathways(question, profile?, n_results?)` → `POST /search`
- `analyzeDocument(documentBase64, documentType?, profile?)` → `POST /analyze`
- `checkHealth()` → `GET /health`

Components should **not** call `fetch` to the FastAPI base URL directly; use `lib/api.ts`.

---

## Tech stack

- **Next.js** 16.x, **React** 19, **TypeScript**, **Tailwind** 4, **Framer Motion**, **Zustand**, **Anthropic SDK**, **Geist** fonts.
- **Python:** FastAPI, Anthropic, ChromaDB, sentence-transformers (see `api/requirements.txt` and data_scrapper docs).

---

## Known gaps / demo behavior

- **No real authentication** — “Sign in” is navigation only.
- **Onboarding7 / dashboard** use **mock** application data, not live user-specific pipelines.
- **`lib/api.ts` search/analyze** are not wired into every onboarding screen; **results** flow uses `/api/recommendations` → FastAPI `/search`.
- **`OWNERS.md` references `.env.example`** — that file may be absent; use this doc + actual `.env.local` / `.env` for variable names.

---

## Local development (typical)

1. **Backend:** From repo root, ensure **`.env`** contains `ANTHROPIC_API_KEY`. Run `uvicorn` as in `api/README_DEPLOY.md` (often `cd api && uvicorn main:app --reload --port 8000` — confirm path in README).
2. **Frontend:** `.env.local` with keys above; `npm run dev` → http://localhost:3000
3. **Chroma / data:** First-time setup may require running data_scrapper CLI (`python main.py scrape`, etc.) so `/search` returns meaningful chunks.

---

## File map (quick reference)

- `app/page.tsx` — Landing
- `app/onboarding/page.tsx` — Step wizard shell
- `app/results/page.tsx` — Recommendations UI
- `app/dashboard/page.tsx` — Dashboard shell
- `app/api/recommendations/route.ts` — Claude + RAG orchestration
- `app/api/voice/chat/route.ts` — Onboarding chat stream
- `app/api/voice/speak/route.ts` — TTS proxy
- `hooks/useVoiceOnboarding.ts`, `hooks/useTextOnboarding.ts` — Client orchestration
- `vercel.json` — Vercel build / ignore rules

---

*Generated for assistant onboarding; keep in sync when architecture or env vars change.*
