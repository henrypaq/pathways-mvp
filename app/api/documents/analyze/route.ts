import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_PROJECT_URL ?? ''
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
  if (!url || !key) throw new Error('Supabase admin credentials not configured')
  return createClient(url, key)
}

// Single combined prompt: detect type + extract data in one Claude call
const COMBINED_PROMPT = `You are analyzing an immigration document. Do two things at once:
1. Identify the document type
2. Extract all relevant fields

Document types and their data schemas:

passport → { "name": "full name", "date_of_birth": "YYYY-MM-DD", "nationality": "ISO-2 code e.g. DZ, IN, PH", "passport_number": "document number", "expiry_date": "YYYY-MM-DD", "issuing_country": "ISO-2 code" }

language_test → { "test_name": "one of: IELTS, CELPIP, TEF_Canada, TCF_Canada, or other", "overall_score": number, "reading_score": number or null, "writing_score": number or null, "listening_score": number or null, "speaking_score": number or null, "test_date": "YYYY-MM-DD" }

employment_letter → { "employer_name": "company name", "job_title": "exact title", "employment_type": "full-time or part-time", "start_date": "YYYY-MM-DD or year only", "annual_salary": number or null, "currency": "3-letter code e.g. CAD", "weekly_hours": number or null }

education_credential → { "institution_name": "university or college name", "degree_type": "Bachelor's, Master's, PhD, Diploma, Certificate, etc.", "field_of_study": "major or subject", "graduation_date": "YYYY-MM-DD or year only", "country": "ISO-2 code where institution is located" }

bank_statement → { "institution_name": "bank name", "account_type": "checking, savings, or other", "closing_balance": number or null, "currency": "3-letter code", "statement_start": "YYYY-MM-DD", "statement_end": "YYYY-MM-DD" }

police_certificate → { "issuing_country": "ISO-2 code", "issue_date": "YYYY-MM-DD", "subject_name": "person's name", "result": "clear or flagged" }

photos → { "count": number, "white_background": true or false, "face_visible": true or false, "meets_ircc_specs": true or false, "issues": [] }

other → {}

Return ONLY valid JSON, no explanation, no markdown:
{
  "doc_type": "<one of: passport, language_test, employment_letter, education_credential, bank_statement, police_certificate, photos, other>",
  "data": { <fields from the matching schema — use null for any unreadable field> }
}`

function extractJson(text: string): Record<string, unknown> | null {
  const trimmed = text.trim()
  // 1. Direct parse
  try { return JSON.parse(trimmed) as Record<string, unknown> } catch { /* try next */ }
  // 2. Strip code fences
  const stripped = trimmed.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim()
  try { return JSON.parse(stripped) as Record<string, unknown> } catch { /* try next */ }
  // 3. Extract first complete {...} block
  const match = trimmed.match(/\{[\s\S]*\}/)
  if (match) {
    try { return JSON.parse(match[0]) as Record<string, unknown> } catch { /* fall through */ }
  }
  return null
}

function buildProfileUpdates(
  docType: string,
  data: Record<string, unknown>,
): Record<string, unknown> {
  const updates: Record<string, unknown> = {}

  if (docType === 'passport') {
    if (data.date_of_birth && typeof data.date_of_birth === 'string') updates.date_of_birth = data.date_of_birth
    if (data.nationality && typeof data.nationality === 'string') updates.nationality = data.nationality
  }

  if (docType === 'language_test') {
    const name = data.test_name as string | null
    const score = data.overall_score != null ? Number(data.overall_score) : null
    if (name && score != null && !isNaN(score)) {
      const knownTests = ['IELTS', 'CELPIP', 'TEF_Canada', 'TCF_Canada']
      updates.language_test = {
        taken: 'yes',
        testName: knownTests.includes(name) ? name : 'other',
        overallScore: score,
      }
    }
  }

  if (docType === 'employment_letter') {
    if (data.job_title && typeof data.job_title === 'string') updates.occupation = data.job_title
    updates.is_employed = true
  }

  return updates
}

export async function POST(request: Request): Promise<Response> {
  let documentId: string
  try {
    const body = await request.json() as { documentId?: string }
    if (!body.documentId) return Response.json({ error: 'documentId required' }, { status: 400 })
    documentId = body.documentId
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const supabase = getSupabaseAdmin()

  const { data: doc, error: docError } = await supabase
    .from('documents')
    .select('id, type, file_url, user_id, case_id')
    .eq('id', documentId)
    .single()

  if (docError || !doc) return Response.json({ error: 'Document not found' }, { status: 404 })

  // Signed URL to download file
  const { data: signed, error: signedError } = await supabase.storage
    .from('documents')
    .createSignedUrl(doc.file_url as string, 60)

  if (signedError || !signed?.signedUrl) {
    console.error('[documents/analyze] signed URL error:', signedError?.message)
    return Response.json({ error: 'Could not access file in storage' }, { status: 500 })
  }

  const fileRes = await fetch(signed.signedUrl)
  if (!fileRes.ok) return Response.json({ error: 'File download failed' }, { status: 500 })

  const buffer = await fileRes.arrayBuffer()
  const base64 = Buffer.from(buffer).toString('base64')

  const path = (doc.file_url as string).toLowerCase()
  const contentType = fileRes.headers.get('content-type') ?? ''
  const isPdf = path.endsWith('.pdf') || contentType.includes('pdf')
  const isJpeg = path.match(/\.(jpg|jpeg)$/) || contentType.includes('jpeg')
  const mediaType = isPdf ? 'application/pdf' : isJpeg ? 'image/jpeg' : 'image/png'

  type PdfSource = { type: 'base64'; media_type: 'application/pdf'; data: string }
  type ImageSource = { type: 'base64'; media_type: 'image/jpeg' | 'image/png'; data: string }

  const contentBlock = isPdf
    ? ({ type: 'document' as const, source: { type: 'base64', media_type: 'application/pdf', data: base64 } as PdfSource })
    : ({ type: 'image' as const, source: { type: 'base64', media_type: mediaType as 'image/jpeg' | 'image/png', data: base64 } as ImageSource })

  // Single combined Claude call: detect type + extract data
  let docType = (doc.type as string | null) ?? null
  let extracted: Record<string, unknown> = {}

  try {
    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: [contentBlock, { type: 'text', text: COMBINED_PROMPT }],
      }],
    })

    const raw = msg.content[0].type === 'text' ? msg.content[0].text : ''
    const parsed = extractJson(raw)

    if (parsed) {
      const detectedType = typeof parsed.doc_type === 'string' ? parsed.doc_type : null
      const VALID_TYPES = new Set(['passport', 'language_test', 'employment_letter', 'education_credential', 'bank_statement', 'police_certificate', 'photos'])

      if (detectedType && VALID_TYPES.has(detectedType)) {
        docType = detectedType
      } else if (!docType) {
        docType = 'other'
      }

      extracted = (parsed.data as Record<string, unknown>) ?? {}
    } else {
      // Claude returned something but we couldn't parse it — soft failure
      console.warn('[documents/analyze] Could not parse JSON response:', raw.slice(0, 200))
      extracted = {}
      if (!docType) docType = 'other'
    }
  } catch (err) {
    console.error('[documents/analyze] Claude error:', err instanceof Error ? err.message : err)
    extracted = { _error: 'Extraction failed' }
    if (!docType) docType = 'other'
  }

  // Update document type in DB if it was unknown
  if ((doc.type as string | null) !== docType) {
    await supabase.from('documents').update({ type: docType }).eq('id', documentId)
  }

  const profileUpdates = buildProfileUpdates(docType, extracted)

  // Persist extracted data
  const { error: updateError } = await supabase
    .from('documents')
    .update({ extracted_data: extracted })
    .eq('id', documentId)

  if (updateError) {
    console.error('[documents/analyze] DB update error:', updateError.message)
  }

  await supabase.from('document_assessments').upsert({
    document_id: documentId,
    requirement_id: null,
    status: extracted._error ? 'needs_review' : 'reviewed',
    confidence: extracted._error ? 0 : 0.85,
    issues: [],
  }, { onConflict: 'document_id' })

  console.log(`[documents/analyze] ${docType} document ${documentId} — ${Object.keys(extracted).length} fields, ${Object.keys(profileUpdates).length} profile updates`)

  return Response.json({ extracted, profileUpdates, detectedType: docType })
}
