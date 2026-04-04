import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import { createTextPdf } from '@/lib/documents/simplePdf'

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_PROJECT_URL ?? ''
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
  if (!url || !key) throw new Error('Supabase admin credentials not configured')
  return createClient(url, key)
}

type GenerateFields = Record<string, string>

function buildPrompt(type: string, fields: GenerateFields): string {
  if (type === 'employment_letter') {
    return `Generate a professional employment confirmation letter for Canadian immigration purposes.

Use these details (use reasonable defaults for any blank fields):
- Employee name: ${fields.employee_name || 'the applicant'}
- Job title: ${fields.job_title || '[Job Title]'}
- Employer / company name: ${fields.employer_name || '[Employer Name]'}
- Employer address: ${fields.employer_address || '[Company Address]'}
- Employment start date: ${fields.start_date || '[Start Date]'}
- Employment type: ${fields.employment_type || 'full-time'}
- Weekly hours: ${fields.weekly_hours || '40'}
- Annual salary: ${fields.annual_salary ? `${fields.annual_salary} ${fields.currency || 'CAD'}` : '[Salary] CAD'}
- Supervisor name: ${fields.supervisor_name || '[Supervisor Name]'}
- Supervisor title: ${fields.supervisor_title || 'Manager'}

Write a complete, formal letter. Structure:
1. Today's date (${new Date().toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' })}) on first line
2. Blank line, then company name and address
3. Blank line, then "To Whom It May Concern,"
4. Paragraph confirming name, title, and start date with employment type
5. Paragraph on compensation — annual salary and weekly hours
6. One sentence stating this letter was issued for immigration purposes
7. "Sincerely," closing with supervisor name, title, and company name

Return ONLY the letter text. Separate paragraphs with a blank line.`
  }

  return `Generate a professional ${type.replace(/_/g, ' ')} document for Canadian immigration purposes based on: ${JSON.stringify(fields)}. Return ONLY the document text.`
}

export async function POST(req: Request): Promise<Response> {
  let body: { type: string; fields: GenerateFields; userId: string; caseId: string }
  try {
    body = await req.json() as typeof body
    if (!body.type || !body.userId || !body.caseId) {
      return Response.json({ error: 'type, userId, and caseId are required' }, { status: 400 })
    }
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const GENERATABLE = new Set(['employment_letter'])
  if (!GENERATABLE.has(body.type)) {
    return Response.json({ error: `Document type "${body.type}" cannot be generated` }, { status: 400 })
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const supabase = getSupabaseAdmin()

  // 1. Generate document text
  let previewText: string
  try {
    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1200,
      messages: [{ role: 'user', content: buildPrompt(body.type, body.fields) }],
    })
    previewText = msg.content[0].type === 'text' ? msg.content[0].text.trim() : ''
    if (!previewText) throw new Error('Empty generation response')
  } catch (err) {
    console.error('[documents/generate] Claude error:', err)
    return Response.json({ error: 'Failed to generate document content' }, { status: 500 })
  }

  // 2. Convert to PDF
  const titles: Record<string, string> = {
    employment_letter: 'Employment Confirmation Letter',
  }
  const pdfBuffer = createTextPdf(titles[body.type] ?? 'Generated Document', previewText)

  // 3. Upload to Supabase Storage
  const filePath = `${body.userId}/${body.type}/${Date.now()}_generated.pdf`
  const { data: storageData, error: storageError } = await supabase.storage
    .from('documents')
    .upload(filePath, pdfBuffer, { contentType: 'application/pdf' })

  if (storageError || !storageData) {
    console.error('[documents/generate] Storage error:', storageError?.message)
    return Response.json({ error: 'Failed to store generated document' }, { status: 500 })
  }

  // 4. Insert document record
  const { data: doc, error: dbError } = await supabase
    .from('documents')
    .insert({
      user_id: body.userId,
      case_id: body.caseId,
      type: body.type,
      file_url: storageData.path,
      extracted_data: null,
    })
    .select()
    .single()

  if (dbError || !doc) {
    console.error('[documents/generate] DB error:', dbError?.message)
    await supabase.storage.from('documents').remove([storageData.path])
    return Response.json({ error: 'Failed to save document record' }, { status: 500 })
  }

  console.log(`[documents/generate] ${body.type} generated for user ${body.userId} → doc ${doc.id as string}`)
  return Response.json({ document: doc, previewText })
}
