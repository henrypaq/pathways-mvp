'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle2, Loader2, AlertCircle, Sparkles, X } from 'lucide-react'

const PROFILE_KEY = process.env.NEXT_PUBLIC_PROFILE_KEY ?? 'pathways_profile'

interface Document {
  id: string
  user_id: string
  case_id: string
  type: string | null
  file_url: string
  extracted_data: Record<string, unknown> | null
  created_at: string
}

interface ProfileSuggestion {
  docId: string
  docType: string
  updates: Record<string, unknown>
}

interface Props {
  initialDocuments: Document[]
  caseId: string
  userId: string
  onCountChange?: (count: number) => void
  onTypesChange?: (types: Set<string>) => void
}

const REQUIRED_DOCS = [
  { type: 'passport',            name: 'Passport',              description: 'Valid for at least 6 months beyond intended stay' },
  { type: 'employment_letter',   name: 'Employment Letter',     description: 'Must include job title, salary, start date, weekly hours' },
  { type: 'language_test',       name: 'Language Test Results', description: 'IELTS, TOEFL, TEF, TCF, or CELPIP official results' },
  { type: 'education_credential',name: 'Education Credential',  description: 'Degree, diploma, or official transcript' },
  { type: 'bank_statement',      name: 'Bank Statement',        description: 'Last 3 months, showing sufficient funds' },
  { type: 'police_certificate',  name: 'Police Certificate',    description: 'From every country lived in for 6+ months' },
  { type: 'photos',              name: 'Passport Photos',       description: '2 identical photos meeting IRCC specifications' },
]

const DOC_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  REQUIRED_DOCS.map((d) => [d.type, d.name])
)

/** Profile fields that each document type can update — shown in the suggestion banner */
const PROFILE_UPDATE_LABELS: Record<string, Record<string, string>> = {
  passport:            { date_of_birth: 'Date of birth', nationality: 'Nationality' },
  language_test:       { language_test: 'Language test score' },
  employment_letter:   { occupation: 'Occupation', is_employed: 'Currently employed' },
}

function getFileName(filePath: string): string {
  const parts = filePath.split('/')
  const raw = parts[parts.length - 1] ?? filePath
  const underscoreIdx = raw.indexOf('_')
  return underscoreIdx !== -1 ? raw.slice(underscoreIdx + 1) : raw
}

/** One-line human-readable summary of extracted document fields */
function summarizeExtracted(docType: string, extracted: Record<string, unknown>): string {
  if (extracted._error) return 'Could not extract — review manually'
  switch (docType) {
    case 'passport': {
      const parts = [extracted.name, extracted.date_of_birth && `DOB ${extracted.date_of_birth as string}`].filter(Boolean)
      return parts.join(' · ') || 'Passport processed'
    }
    case 'language_test': {
      const parts = [extracted.test_name, extracted.overall_score != null && `Overall ${extracted.overall_score as number}`].filter(Boolean)
      return parts.join(' ') || 'Test results processed'
    }
    case 'employment_letter': {
      const parts = [extracted.job_title, extracted.employer_name && `at ${extracted.employer_name as string}`].filter(Boolean)
      return parts.join(' ') || 'Employment letter processed'
    }
    case 'education_credential': {
      const parts = [extracted.degree_type, extracted.institution_name].filter(Boolean)
      return parts.join(', ') || 'Credential processed'
    }
    case 'bank_statement': {
      if (extracted.closing_balance != null) {
        return `${extracted.currency ?? ''} ${Number(extracted.closing_balance).toLocaleString()} balance`
      }
      return 'Bank statement processed'
    }
    case 'police_certificate':
      return extracted.result ? `Result: ${extracted.result as string}` : 'Certificate processed'
    case 'photos':
      return extracted.meets_ircc_specs ? 'Photos meet IRCC specs' : 'Photos need review'
    default:
      return 'Document analyzed'
  }
}

export function DocumentsManager({ initialDocuments, caseId, userId, onCountChange, onTypesChange }: Props) {
  const [documents, setDocuments] = useState<Document[]>(initialDocuments)
  const [selectedType, setSelectedType] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [analyzing, setAnalyzing] = useState<Set<string>>(new Set())
  const [profileSuggestion, setProfileSuggestion] = useState<ProfileSuggestion | null>(null)
  const [profileApplied, setProfileApplied] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  useEffect(() => {
    onCountChange?.(documents.length)
    onTypesChange?.(new Set(documents.map((d) => d.type).filter(Boolean) as string[]))
  }, [documents.length, onCountChange, onTypesChange, documents])

  const uploadedTypes = new Set(documents.map((d) => d.type))

  async function analyzeDocument(docId: string, docType: string) {
    setAnalyzing((prev) => new Set(prev).add(docId))
    try {
      const res = await fetch('/api/documents/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId: docId }),
      })
      if (!res.ok) return

      const { extracted, profileUpdates } = await res.json() as {
        extracted: Record<string, unknown>
        profileUpdates: Record<string, unknown>
      }

      // Update local document state with extracted data
      setDocuments((prev) =>
        prev.map((d) => d.id === docId ? { ...d, extracted_data: extracted } : d)
      )

      // Surface profile update suggestion if relevant fields were found
      if (Object.keys(profileUpdates).length > 0) {
        setProfileSuggestion({ docId, docType, updates: profileUpdates })
        setProfileApplied(false)
      }
    } catch (err) {
      console.error('[DocumentsManager] analysis failed:', err)
    } finally {
      setAnalyzing((prev) => { const next = new Set(prev); next.delete(docId); return next })
    }
  }

  async function handleFile(file: File) {
    setUploadError(null)

    if (!selectedType) {
      setUploadError('Please select a document type first.')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('File exceeds the 10 MB limit.')
      return
    }
    const allowed = ['application/pdf', 'image/jpeg', 'image/png']
    if (!allowed.includes(file.type)) {
      setUploadError('Only PDF, JPG, and PNG files are accepted.')
      return
    }

    setUploading(true)
    try {
      const filePath = `${userId}/${selectedType}/${Date.now()}_${file.name}`

      const { data: storageData, error: storageError } = await supabase.storage
        .from('documents')
        .upload(filePath, file)

      if (storageError) {
        setUploadError(`Storage upload failed: ${storageError.message}`)
        return
      }

      const { data: row, error: dbError } = await supabase
        .from('documents')
        .insert({ user_id: userId, case_id: caseId, type: selectedType, file_url: storageData.path, extracted_data: null })
        .select()
        .single()

      if (dbError) {
        setUploadError(dbError.message)
        await supabase.storage.from('documents').remove([storageData.path])
        return
      }

      const newDoc = row as Document
      setDocuments((prev) => [newDoc, ...prev])
      setSelectedType('')
      if (fileInputRef.current) fileInputRef.current.value = ''

      // Kick off AI analysis immediately after upload
      void analyzeDocument(newDoc.id, selectedType)
    } finally {
      setUploading(false)
    }
  }

  async function handleDelete(doc: Document) {
    setDeleteError(null)
    setConfirmDeleteId(null)
    const { error: storageError } = await supabase.storage.from('documents').remove([doc.file_url])
    if (storageError) { setDeleteError(storageError.message); return }
    const { error: dbError } = await supabase.from('documents').delete().eq('id', doc.id)
    if (dbError) { setDeleteError(dbError.message); return }
    setDocuments((prev) => prev.filter((d) => d.id !== doc.id))
    if (profileSuggestion?.docId === doc.id) setProfileSuggestion(null)
  }

  async function applyProfileUpdates(updates: Record<string, unknown>) {
    try {
      // Merge into localStorage profile
      const raw = typeof window !== 'undefined' ? localStorage.getItem(PROFILE_KEY) : null
      const existing = raw ? (JSON.parse(raw) as Record<string, unknown>) : {}
      const merged = { ...existing, ...updates }
      localStorage.setItem(PROFILE_KEY, JSON.stringify(merged))

      // Best-effort Supabase update
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('id, data').eq('user_id', user.id).single()
        if (profile) {
          await supabase.from('profiles').update({ data: { ...(profile.data as Record<string, unknown>), ...updates } }).eq('id', profile.id)
        }
      }

      setProfileApplied(true)
      setTimeout(() => { setProfileSuggestion(null); setProfileApplied(false) }, 2000)
    } catch (err) {
      console.error('[DocumentsManager] profile update failed:', err)
    }
  }

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      const file = e.dataTransfer.files[0]
      if (file) void handleFile(file)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedType, caseId, userId]
  )

  return (
    <div className="max-w-3xl pb-6">
      {/* Profile update suggestion banner */}
      {profileSuggestion && (
        <div className={`mb-4 rounded-[12px] border p-4 flex items-start gap-3 transition-all ${
          profileApplied
            ? 'bg-[#E1F5EE] border-[#1D9E75]/30'
            : 'bg-[#FFFBEB] border-amber-200'
        }`}>
          <Sparkles size={16} className={`flex-shrink-0 mt-0.5 ${profileApplied ? 'text-[#1D9E75]' : 'text-amber-500'}`} />
          <div className="flex-1 min-w-0">
            {profileApplied ? (
              <p className="text-[13px] font-medium text-[#1D9E75]">Profile updated</p>
            ) : (
              <>
                <p className="text-[13px] font-medium text-[#171717] mb-1">
                  Update your profile from this {DOC_TYPE_LABELS[profileSuggestion.docType]?.toLowerCase() ?? 'document'}?
                </p>
                <p className="text-[11px] text-[#737373] mb-3">
                  {Object.keys(profileSuggestion.updates)
                    .map((k) => PROFILE_UPDATE_LABELS[profileSuggestion.docType]?.[k] ?? k)
                    .join(' · ')}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => void applyProfileUpdates(profileSuggestion.updates)}
                    className="px-3 py-1.5 bg-[#534AB7] text-white text-[12px] font-medium rounded-lg hover:bg-[#3C3489] transition-colors"
                  >
                    Apply to profile
                  </button>
                  <button
                    onClick={() => setProfileSuggestion(null)}
                    className="px-3 py-1.5 bg-transparent text-[#737373] text-[12px] rounded-lg hover:text-[#171717] transition-colors"
                  >
                    Dismiss
                  </button>
                </div>
              </>
            )}
          </div>
          {!profileApplied && (
            <button onClick={() => setProfileSuggestion(null)} className="flex-shrink-0 text-[#A3A3A3] hover:text-[#737373] transition-colors">
              <X size={14} />
            </button>
          )}
        </div>
      )}

      {/* Required Documents Checklist */}
      <div className="bg-white border border-[#E5E5E5] rounded-[12px] p-5 mb-4">
        <h3 className="text-[11px] font-semibold text-[#A3A3A3] uppercase tracking-wider mb-4">Required Documents</h3>
        <div className="space-y-2">
          {REQUIRED_DOCS.map((doc) => {
            const uploaded = uploadedTypes.has(doc.type)
            return (
              <div key={doc.type} className="flex items-center gap-3 py-2.5 border-b border-[#F5F5F5] last:border-0">
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-[#171717]">{doc.name}</p>
                  <p className="text-[11px] text-[#A3A3A3] mt-0.5">{doc.description}</p>
                </div>
                <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ${
                  uploaded ? 'bg-[#DCFCE7] text-[#16A34A]' : 'bg-[#F5F5F5] text-[#A3A3A3]'
                }`}>
                  {uploaded ? 'Uploaded' : 'Not uploaded'}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Upload Section */}
      <div className="bg-white border border-[#E5E5E5] rounded-[12px] p-5 mb-4">
        <h3 className="text-[11px] font-semibold text-[#A3A3A3] uppercase tracking-wider mb-4">Upload a Document</h3>

        <div className="mb-4">
          <label className="block text-[11px] text-[#A3A3A3] uppercase tracking-wider mb-1.5">Document Type</label>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="w-full border border-[#E5E5E5] rounded-[8px] text-[13px] text-[#171717] px-3 py-2 focus:outline-none focus:border-[#534AB7] transition-colors bg-white appearance-none"
          >
            <option value="">Select document type…</option>
            {REQUIRED_DOCS.map((d) => (
              <option key={d.type} value={d.type}>{d.name}</option>
            ))}
          </select>
        </div>

        <div
          onDragOver={(e) => { e.preventDefault(); if (selectedType) setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => { if (selectedType) fileInputRef.current?.click() }}
          className={`border-2 border-dashed rounded-[10px] p-8 text-center transition-colors ${
            !selectedType
              ? 'border-[#E5E5E5] opacity-50 cursor-not-allowed'
              : dragOver
              ? 'border-[#534AB7] bg-[#EEEDFE] cursor-pointer'
              : 'border-[#E5E5E5] hover:border-[#534AB7]/50 hover:bg-[#FAFAFA] cursor-pointer'
          }`}
        >
          <div className="flex flex-col items-center gap-2">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[#A3A3A3]">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            {uploading ? (
              <p className="text-[13px] text-[#534AB7] font-medium">Uploading…</p>
            ) : (
              <>
                <p className="text-[13px] text-[#525252]">
                  Drag your file here or <span className="text-[#534AB7] font-medium">click to browse</span>
                </p>
                <p className="text-[11px] text-[#A3A3A3]">PDF, JPG, PNG · Max 10 MB</p>
              </>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            className="hidden"
            onChange={(e) => { const file = e.target.files?.[0]; if (file) void handleFile(file) }}
          />
        </div>

        {uploadError && <p className="mt-3 text-[12px] text-[#DC2626]">{uploadError}</p>}
      </div>

      {/* Uploaded Documents */}
      <div className="bg-white border border-[#E5E5E5] rounded-[12px] p-5">
        <h3 className="text-[11px] font-semibold text-[#A3A3A3] uppercase tracking-wider mb-4">Uploaded Documents</h3>

        {deleteError && <p className="mb-3 text-[12px] text-[#DC2626]">{deleteError}</p>}

        {documents.length === 0 ? (
          <p className="text-[13px] text-[#A3A3A3] py-2">No documents uploaded yet.</p>
        ) : (
          <div className="space-y-3">
            {documents.map((doc) => {
              const isAnalyzing = analyzing.has(doc.id)
              const hasExtracted = doc.extracted_data && !doc.extracted_data._error
              const hasError = doc.extracted_data?._error

              return (
                <div key={doc.id} className="border border-[#F0F0F0] rounded-[10px] p-3">
                  <div className="flex items-center gap-3">
                    {/* Status icon */}
                    <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-[#F5F5F5]">
                      {isAnalyzing ? (
                        <Loader2 size={14} className="text-[#534AB7] animate-spin" />
                      ) : hasExtracted ? (
                        <CheckCircle2 size={14} className="text-[#1D9E75]" />
                      ) : hasError ? (
                        <AlertCircle size={14} className="text-amber-500" />
                      ) : (
                        <div className="w-2 h-2 rounded-full bg-[#A3A3A3]" />
                      )}
                    </div>

                    {/* File info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[12px] font-medium text-[#171717]">
                          {DOC_TYPE_LABELS[doc.type ?? ''] ?? doc.type ?? '—'}
                        </span>
                        <span className="text-[11px] text-[#A3A3A3] truncate max-w-[180px]">
                          {getFileName(doc.file_url)}
                        </span>
                      </div>

                      {/* Analysis status / extracted summary */}
                      <p className="text-[11px] mt-0.5 leading-tight">
                        {isAnalyzing ? (
                          <span className="text-[#534AB7]">Analyzing with AI…</span>
                        ) : hasExtracted ? (
                          <span className="text-[#1D9E75]">
                            {summarizeExtracted(doc.type ?? '', doc.extracted_data!)}
                          </span>
                        ) : hasError ? (
                          <span className="text-amber-600">Could not extract — review manually</span>
                        ) : (
                          <span className="text-[#A3A3A3]">
                            {new Date(doc.created_at).toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' })}
                          </span>
                        )}
                      </p>
                    </div>

                    {/* Delete — two-step confirmation */}
                    {confirmDeleteId === doc.id ? (
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                          onClick={() => void handleDelete(doc)}
                          className="text-[11px] text-white bg-[#DC2626] hover:bg-[#B91C1C] transition-colors font-medium px-2 py-1 rounded-md"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="text-[11px] text-[#A3A3A3] hover:text-[#525252] transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteId(doc.id)}
                        className="flex-shrink-0 text-[11px] text-[#A3A3A3] hover:text-[#DC2626] transition-colors font-medium"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
