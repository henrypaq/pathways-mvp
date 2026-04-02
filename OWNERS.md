# Pathways — Code Ownership Map

## Ground rules
- Never edit a file owned by the other developer without a heads-up first
- The only shared files are `lib/types.ts` and `lib/api.ts` — changes here
  require both developers to agree
- Backend changes that alter request/response shapes MUST update `lib/types.ts`
  at the same time — never break the contract silently

## Developer A — Backend & Data
Owns everything in:
- `api/`
- `data_scrapper/`

Never needs to touch:
- `app/`, `components/`, `lib/onboardingStore.ts`, `lib/mockData.ts`

## Developer B — Frontend & UI
Owns everything in:
- `app/`
- `components/`
- `lib/onboardingStore.ts`
- `lib/mockData.ts`

Never needs to touch:
- `api/`, `data_scrapper/`

## Shared contract (coordinate before changing)
- `lib/types.ts` — all shared TypeScript types
- `lib/api.ts` — all fetch() calls to the backend
- `.env.example` — environment variable definitions
