import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_PROJECT_URL ?? ''
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
  if (!url || !key) throw new Error('Supabase admin credentials not configured')
  return createClient(url, key)
}

// Type-specific extraction prompts — Claude returns structured JSON for each document type
const EXTRACTION_PROMPTS: Record<string, string> = {
  passport: `Extract fields from this passport. Return ONLY valid JSON:
{
  "name": "full name as printed",
  "date_of_birth": "YYYY-MM-DD",
  "nationality": "ISO-2 country code e.g. ET, IN, PH",
  "passport_number": "document number",
  "expiry_date": "YYYY-MM-DD",
  "issuing_country": "ISO-2 country code"
}
Use null for any unreadable field.`,

  employment_letter: `Extract fields from this employment letter or reference letter. Return ONLY valid JSON:
{
  "employer_name": "company or organization name",
  "job_title": "exact job title as written",
  "employment_type": "full-time or part-time",
  "start_date": "YYYY-MM-DD or year only if exact date not present",
  "annual_salary": "number only, no currency symbol",
  "currency": "3-letter currency code e.g. CAD",
  "weekly_hours": "number"
}
Use null for any field not present in the letter.`,

  language_test: `Extract results from this language test certificate. Return ONLY valid JSON:
{
  "test_name": "one of: IELTS, CELPIP, TEF_Canada, TCF_Canada, or other",
  "overall_score": "number",
  "reading_score": "number or null",
  "writing_score": "number or null",
  "listening_score": "number or null",
  "speaking_score": "number or null",
  "test_date": "YYYY-MM-DD"
}
Use null for any score not shown.`,

  education_credential: `Extract fields from this degree, diploma, or transcript. Return ONLY valid JSON:
{
  "institution_name": "full name of university or college",
  "degree_type": "Bachelor's, Master's, PhD, Diploma, Certificate, etc.",
  "field_of_study": "major or subject area",
  "graduation_date": "YYYY-MM-DD or year only",
  "country": "ISO-2 country code where institution is located"
}
Use null for any field not present.`,

  bank_statement: `Extract financial summary from this bank statement. Return ONLY valid JSON:
{
  "institution_name": "bank or financial institution name",
  "account_type": "checking, savings, or other",
  "closing_balance": "number only, no currency symbol",
  "currency": "3-letter currency code e.g. CAD, USD",
  "statement_start": "YYYY-MM-DD",
  "statement_end": "YYYY-MM-DD"
}
Use null for any field not visible.`,

  police_certificate: `Extract fields from this police certificate or background check. Return ONLY valid JSON:
{
  "issuing_country": "ISO-2 country code",
  "issue_date": "YYYY-MM-DD",
  "subject_name": "name of person on certificate",
  "result": "clear or flagged"
}
Use null for any field not present.`,

  photos: `Analyze these passport photos for IRCC compliance. Return ONLY valid JSON:
{
  "count": "number of photos",
  "white_background": true or false,
  "face_visible": true or false,
  "meets_ircc_specs": true or false,
  "issues": ["list any compliance issues, empty array if none"]
}`,
}

// Map document type + extracted fields → profile field updates to suggest to the user
function buildProfileUpdates(
  docType: string,
  extracted: Record<string, unknown>,
): Record<string, unknown> {
  const updates: Record<string, unknown> = {}

  if (docType === 'passport') {
    if (extracted.date_of_birth && typeof extracted.date_of_birth === 'string') {
      updates.date_of_birth = extracted.date_of_birth
    }
    if (extracted.nationality && typeof extracted.nationality === 'string') {
      updates.nationality = extracted.nationality
    }
  }

  if (docType === 'language_test') {
    const name = extracted.test_name as string | null
    const score = extracted.overall_score != null ? Number(extracted.overall_score) : null
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
    if (extracted.job_title && typeof extracted.job_title === 'string') {
      updates.occupation = extracted.job_title
    }
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

  // Fetch document record
  const { data: doc, error: docError } = await supabase
    .from('documents')
    .select('id, type, file_url, user_id, case_id')
    .eq('id', documentId)
    .single()

  if (docError || !doc) {
    return Response.json({ error: 'Document not found' }, { status: 404 })
  }

  // Get a short-lived signed URL so we can download the file server-side
  const { data: signed, error: signedError } = await supabase.storage
    .from('documents')
    .createSignedUrl(doc.file_url as string, 60)

  if (signedError || !signed?.signedUrl) {
    console.error('[documents/analyze] signed URL error:', signedError?.message)
    return Response.json({ error: 'Could not access file in storage' }, { status: 500 })
  }

  // Download the file
  const fileRes = await fetch(signed.signedUrl)
  if (!fileRes.ok) {
    return Response.json({ error: 'File download failed' }, { status: 500 })
  }

  const buffer = await fileRes.arrayBuffer()
  const base64 = Buffer.from(buffer).toString('base64')

  // Determine media type from path extension and content-type header
  const path = (doc.file_url as string).toLowerCase()
  const contentType = fileRes.headers.get('content-type') ?? ''
  const isPdf = path.endsWith('.pdf') || contentType.includes('pdf')
  const isJpeg = path.match(/\.(jpg|jpeg)$/) || contentType.includes('jpeg')
  const mediaType = isPdf ? 'application/pdf' : isJpeg ? 'image/jpeg' : 'image/png'

  const docType = doc.type as string
  const prompt = EXTRACTION_PROMPTS[docType] ?? 'Extract all relevant information from this document as JSON.'

  // Build the content block (document for PDFs, image for raster files)
  type PdfSource = { type: 'base64'; media_type: 'application/pdf'; data: string }
  type ImageSource = { type: 'base64'; media_type: 'image/jpeg' | 'image/png'; data: string }

  const contentBlock = isPdf
    ? ({ type: 'document' as const, source: { type: 'base64', media_type: 'application/pdf', data: base64 } as PdfSource })
    : ({ type: 'image' as const, source: { type: 'base64', media_type: mediaType as 'image/jpeg' | 'image/png', data: base64 } as ImageSource })

  let extracted: Record<string, unknown> = {}
  try {
    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: [contentBlock, { type: 'text', text: prompt }],
      }],
    })

    const raw = msg.content[0].type === 'text' ? msg.content[0].text.trim() : '{}'
    const clean = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim()
    extracted = JSON.parse(clean) as Record<string, unknown>
  } catch (err) {
    console.error('[documents/analyze] Claude error:', err instanceof Error ? err.message : err)
    // Don't fail the whole request — store what we know and return
    extracted = { _error: 'Extraction failed', _raw: String(err) }
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

  // Upsert a document_assessment row (requirement_id null until pathway requirements are wired)
  await supabase.from('document_assessments').upsert({
    document_id: documentId,
    requirement_id: null,
    status: extracted._error ? 'needs_review' : 'reviewed',
    confidence: extracted._error ? 0 : 0.85,
    issues: [],
  }, { onConflict: 'document_id' })

  console.log(`[documents/analyze] ${docType} document ${documentId} analyzed — ${Object.keys(extracted).length} fields extracted, ${Object.keys(profileUpdates).length} profile updates`)

  return Response.json({ extracted, profileUpdates })
}
