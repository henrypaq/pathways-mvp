import Anthropic from '@anthropic-ai/sdk'
import type { PathwaysProfile } from '@/types/voice'
import type { RecommendationsResult, PathwayMatch, RecommendedRoadmapStep, SourceCitation } from '@/lib/types'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

// Step 1 — Ask Claude to generate targeted search queries from the profile
async function generateSearchQueries(profile: Partial<PathwaysProfile>): Promise<string[]> {
  const profileText = Object.entries(profile)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n')

  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-4-5',
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

// Step 2 — Retrieve chunks from the FastAPI RAG backend
async function retrieveChunks(queries: string[]): Promise<Array<{ document: string; url: string; display_name: string; similarity: number; scraped_at: string }>> {
  const results = await Promise.allSettled(
    queries.map((q) =>
      fetch(`${BASE_URL}/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q, n_results: 4 }),
      }).then((r) => r.json()),
    ),
  )

  const all: Array<{ document: string; url: string; display_name: string; similarity: number; scraped_at: string }> = []
  const seenUrls = new Set<string>()

  for (const result of results) {
    if (result.status !== 'fulfilled') continue
    const data = result.value
    if (!Array.isArray(data.results)) continue
    for (const chunk of data.results) {
      if (!seenUrls.has(chunk.url)) {
        seenUrls.add(chunk.url)
        all.push(chunk)
      }
    }
  }

  // Sort by similarity descending, keep top 15
  return all.sort((a, b) => b.similarity - a.similarity).slice(0, 15)
}

// Step 3 — Claude synthesizes structured recommendations from profile + chunks
async function synthesizeRecommendations(
  profile: Partial<PathwaysProfile>,
  chunks: Array<{ document: string; url: string; display_name: string; similarity: number; scraped_at: string }>,
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
2. Rank 2-4 pathways by match quality (be realistic — use the sources)
3. For each pathway: cite specific requirements from the sources, give realistic match scores (0-100), and identify the single most impactful next step
4. Build a personalized roadmap for the top pathway with concrete, ordered steps
5. NEVER invent facts not supported by the sources
6. Match scores should reflect genuine eligibility: 90+ = strong match, 70-89 = good match with some gaps, 50-69 = possible but challenging, <50 = unlikely

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
    model: 'claude-sonnet-4-5',
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = msg.content[0].type === 'text' ? msg.content[0].text.trim() : '{}'

  // Strip markdown code fences if present
  const clean = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim()

  let parsed: Omit<RecommendationsResult, 'generatedAt'>
  try {
    parsed = JSON.parse(clean)
  } catch {
    throw new Error('Claude returned invalid JSON')
  }

  return {
    ...parsed,
    generatedAt: new Date().toISOString(),
  }
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
    const queries = await generateSearchQueries(profile)
    const chunks = await retrieveChunks(queries)
    const result = await synthesizeRecommendations(profile, chunks)
    return Response.json(result)
  } catch (err) {
    console.error('[recommendations] error:', err)
    return Response.json({ error: 'Failed to generate recommendations' }, { status: 500 })
  }
}
