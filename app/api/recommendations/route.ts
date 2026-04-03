import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import type { PathwaysProfile } from '@/types/voice'
import type { RecommendationsResult } from '@/lib/types'

/** Netlify/Vercel: allow up to 26s (Netlify Pro max; also set in netlify.toml [functions] timeout). */
export const maxDuration = 26

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

/** Supabase client for server-side RPC.
 *  Uses the secret/service role key (preferred) so no anon grant migration is required.
 *  Falls back to anon key if service role is not configured. */
function getSupabaseClient() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ??
    process.env.NEXT_PUBLIC_SUPABASE_PROJECT_URL ??
    ''
  const key =
    process.env.SUPABASE_SECRET_KEY ??
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.SUPABASE_ANON_KEY ??
    ''
  if (!url || !key) throw new Error('Supabase URL or key not configured')
  return createClient(url, key)
}

/** Embed a single query using OpenAI text-embedding-3-small. */
async function embedQuery(text: string): Promise<number[]> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OPENAI_API_KEY not configured')
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ input: text, model: 'text-embedding-3-small' }),
  })
  if (!res.ok) throw new Error(`OpenAI embeddings error: ${res.status}`)
  const data = await res.json() as { data: { embedding: number[] }[] }
  return data.data[0].embedding
}

// Step 1 — Use Haiku (fast, ~1-2s) to generate targeted search queries
async function generateSearchQueries(profile: Partial<PathwaysProfile>): Promise<string[]> {
  const profileText = Object.entries(profile)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n')

  const msg = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 512,
    messages: [
      {
        role: 'user',
        content: `You are an immigration research assistant. Given this applicant profile, generate exactly 5 targeted search queries to retrieve the most relevant Canadian immigration information from a vector database of official IRCC documents.

PROFILE:
${profileText}

Rules:
- Each query must be specific and information-dense (not a question — a search phrase)
- Focus on pathways most likely to match: consider purpose (${profile.purpose}), education (${profile.education_level}), occupation (${profile.occupation}), language (${profile.language_ability}), timeline (${profile.timeline})
- If purpose is "asylum", include refugee-specific queries
- If purpose is "work" or profile suggests skilled worker, include Express Entry queries
- Include at least one query about requirements/eligibility and one about processing times/fees

Return ONLY a JSON array of 5 strings, nothing else. Example:
["Express Entry Federal Skilled Worker eligibility requirements", ...]`,
      },
    ],
  })

  const text = msg.content[0].type === 'text' ? msg.content[0].text.trim() : '[]'
  try {
    const parsed = JSON.parse(text)
    if (Array.isArray(parsed)) return parsed.slice(0, 5)
  } catch {
    // fallback queries
  }
  return [
    `Canada immigration ${profile.purpose} visa requirements`,
    `Express Entry eligibility ${profile.occupation}`,
    `Canada PR processing time fees`,
    `IRCC language requirements`,
    `Canadian immigration pathways ${profile.nationality}`,
  ]
}

type SearchHit = {
  document: string
  url: string
  display_name: string
  similarity: number
  scraped_at: string | null
}

// Step 2 — Embed each query and search Supabase pgvector directly (no FastAPI dependency)
async function retrieveChunks(queries: string[]): Promise<SearchHit[]> {
  const supabase = getSupabaseClient()

  const perQuery = await Promise.all(
    queries.map(async (q) => {
      try {
        const embedding = await embedQuery(q)
        const { data, error } = await supabase.rpc('match_knowledge_chunks', {
          query_embedding: embedding,
          match_count: 4,
        })
        if (error) {
          console.error('[retrieveChunks] rpc error:', error.message)
          return [] as SearchHit[]
        }
        return (data as { content: string; url: string; title: string | null; similarity: number; scraped_at: string | null }[]).map(
          (row) => ({
            document: row.content,
            url: row.url,
            display_name: row.title ?? row.url,
            similarity: row.similarity,
            scraped_at: row.scraped_at,
          })
        )
      } catch (e) {
        console.error('[retrieveChunks] query failed:', e instanceof Error ? e.message : e)
        return [] as SearchHit[]
      }
    }),
  )

  // Sort by similarity first, then deduplicate by URL so the best chunk per URL always wins
  const all = perQuery.flat().sort((a, b) => b.similarity - a.similarity)
  const seen = new Set<string>()
  const deduped: SearchHit[] = []
  for (const hit of all) {
    if (!hit.url || seen.has(hit.url)) continue
    seen.add(hit.url)
    deduped.push(hit)
    if (deduped.length >= 10) break
  }

  if (deduped.length === 0) {
    throw new Error('Vector search returned no results. Check OPENAI_API_KEY and Supabase credentials are set, and knowledge_chunks has rows.')
  }

  return deduped
}

// Step 3 — Sonnet synthesizes structured recommendations (faster output than Haiku for large JSON)
async function synthesizeRecommendations(
  profile: Partial<PathwaysProfile>,
  chunks: Array<{ document: string; url: string; display_name: string; similarity: number; scraped_at: string | null }>,
): Promise<RecommendationsResult> {
  const profileText = Object.entries(profile)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n')

  const contextText = chunks
    .map((c, i) => `[SOURCE ${i + 1}: ${c.display_name} — ${c.url}]\n${c.document}`)
    .join('\n\n---\n\n')

  const prompt = `You are an expert Canadian immigration advisor. Based ONLY on the official IRCC sources provided below, generate a personalized immigration recommendation report for this applicant.

APPLICANT PROFILE:
${profileText}

OFFICIAL SOURCES:
${contextText}

INSTRUCTIONS:
1. Analyze which Canadian immigration pathways best match this profile
2. Rank exactly 2-3 pathways by match quality (be realistic — use the sources)
3. For each pathway: cite specific requirements from the sources, give realistic match scores (0-100), and identify the single most impactful next step
4. Build a personalized roadmap for the top pathway with exactly 4 concrete, ordered steps
5. NEVER invent facts not supported by the sources
6. Match scores should reflect genuine eligibility: 90+ = strong match, 70-89 = good match with some gaps, 50-69 = possible but challenging, <50 = unlikely
7. Be concise — keep all string values short (under 120 characters)

Output ONLY valid JSON matching this exact schema (no markdown, no commentary):
{
  "profileSummary": "one sentence describing applicant strengths and immigration situation",
  "topPathwayId": "string matching the id of the #1 pathway",
  "pathways": [
    {
      "id": "kebab-case-id",
      "name": "Full Pathway Name",
      "category": "Permanent Residence | Temporary Work | Study | Refugee Protection",
      "flag": "🇨🇦",
      "matchScore": 85,
      "matchReasons": ["reason 1 tied to profile", "reason 2", "reason 3"],
      "requirements": ["requirement from source", "requirement 2", "requirement 3"],
      "estimatedTimeline": "6-8 months",
      "processingFeeRange": "$1,365 CAD",
      "difficulty": "Easy | Medium | Complex",
      "nextStep": "Most important immediate action",
      "officialUrl": "https://www.canada.ca/...",
      "sources": [{"title": "Source Name", "url": "https://...", "scraped_at": "date"}]
    }
  ],
  "roadmap": [
    {
      "id": "step-id",
      "title": "Step Title",
      "description": "What to do and why",
      "estimatedTime": "2-4 weeks",
      "status": "not_started",
      "dependencies": [],
      "officialUrl": "https://www.canada.ca/...",
      "documents": ["Document name 1", "Document name 2"]
    }
  ],
  "sources": [{"title": "Source Name", "url": "https://...", "scraped_at": "date"}]
}`

  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = msg.content[0].type === 'text' ? msg.content[0].text.trim() : '{}'
  const stopReason = msg.stop_reason
  const clean = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim()

  let parsed: Omit<RecommendationsResult, 'generatedAt'>
  try {
    parsed = JSON.parse(clean)
  } catch {
    console.error('[recommendations] stop_reason:', stopReason, '— raw response (first 500 chars):', clean.slice(0, 500))
    throw new Error('Claude returned invalid JSON')
  }

  return { ...parsed, generatedAt: new Date().toISOString() }
}

export async function POST(request: Request): Promise<Response> {
  let profile: Partial<PathwaysProfile>
  try {
    const body = await request.json()
    profile = body.profile ?? {}
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (!profile.destination_country && !profile.purpose) {
    return Response.json({ error: 'Profile is too incomplete to generate recommendations' }, { status: 422 })
  }

  try {
    console.log('[recommendations] stage 1: generating queries')
    const queries = await generateSearchQueries(profile)
    console.log('[recommendations] stage 2: retrieving chunks for', queries.length, 'queries')
    const chunks = await retrieveChunks(queries)
    console.log('[recommendations] stage 3: synthesizing from', chunks.length, 'chunks')
    const result = await synthesizeRecommendations(profile, chunks)
    console.log('[recommendations] done')
    return Response.json(result)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[recommendations] error:', msg)
    return Response.json({ error: msg }, { status: 500 })
  }
}
