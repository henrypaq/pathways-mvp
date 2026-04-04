'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import {
  CheckCircle2, Loader2, AlertTriangle, Upload, X,
  Sparkles, Wand2, Eye, ArrowUpFromLine, FileText,
} from 'lucide-react'
import type { PathwaysProfile } from '@/types/voice'
import { GenerateDocumentModal } from './GenerateDocumentModal'

const GENERATABLE = new Set(['employment_letter'])

interface DocumentRow {
  id: string
  user_id: string
  case_id: string
  type: string | null
  file_url: string
  extracted_data: Record<string, unknown> | null
  created_at: string
}

const REQUIRED_DOCS = [
  { type: 'passport',             label: 'Passport',              hint: 'Valid for at least 6 months beyond intended stay' },
  { type: 'language_test',        label: 'Language Test Results', hint: 'IELTS, CELPIP, TEF, TCF, or TOEFL official results' },
  { type: 'employment_letter',    label: 'Employment Letter',     hint: 'Job title, salary, start date, and weekly hours' },
  { type: 'education_credential', label: 'Education Credential',  hint: 'Degree, diploma, or official transcript' },
  { type: 'bank_statement',       label: 'Bank Statement',        hint: 'Last 3 months showing sufficient settlement funds' },
  { type: 'police_certificate',   label: 'Police Certificate',    hint: 'From every country you\'ve lived in for 6+ months' },
  { type: 'photos',               label: 'Passport Photos',       hint: '2 identical photos meeting IRCC specifications' },
]

function getFileName(filePath: string): string {
  const parts = filePath.split('/')
  const raw = parts[parts.length - 1] ?? filePath
  const underscoreIdx = raw.indexOf('_')
  return underscoreIdx !== -1 ? raw.slice(underscoreIdx + 1) : raw
}

function summarize(docType: string, extracted: Record<string, unknown>): string {
  if (extracted._error) return 'Could not extract — review manually'
  switch (docType) {
    case 'passport': {
      const parts = [extracted.name, extracted.nationality && `· ${extracted.nationality as string}`].filter(Boolean)
      return parts.join(' ') || 'Passport processed'
    }
    case 'language_test':
      return [extracted.test_name, extracted.overall_score != null && `Overall: ${extracted.overall_score as number}`].filter(Boolean).join(' ') || 'Test results processed'
    case 'employment_letter':
      return [extracted.job_title, extracted.employer_name && `at ${extracted.employer_name as string}`].filter(Boolean).join(' ') || 'Employment letter processed'
    case 'education_credential':
      return [extracted.degree_type, extracted.institution_name].filter(Boolean).join(', ') || 'Credential processed'
    case 'bank_statement':
      return extracted.closing_balance != null
        ? `${extracted.currency ?? ''} ${Number(extracted.closing_balance).toLocaleString()} balance`
        : 'Statement processed'
    case 'police_certificate':
      return extracted.result ? `Result: ${extracted.result as string}` : 'Certificate processed'
    case 'photos':
      return extracted.meets_ircc_specs ? 'Photos meet IRCC specs' : 'Photos need review'
    default:
      return 'Document analyzed'
  }
}

function detectIssues(docType: string, extracted: Record<string, unknown>): string[] {
  if (extracted._error) return ['Could not extract data — please verify this document manually']
  const issues: string[] = []
  switch (docType) {
    case 'passport': {
      if (extracted.expiry_date) {
        const expiry = new Date(extracted.expiry_date as string)
        const sixMonthsOut = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000)
        if (expiry < new Date()) issues.push('Passport appears to be expired — you must renew before applying')
        else if (expiry < sixMonthsOut) issues.push('Passport expires within 6 months — renewal may be required')
      }
      break
    }
    case 'language_test': {
      const score = extracted.overall_score as number | undefined
      if (score !== undefined && score < 6)
        issues.push(`Overall score of ${score} is likely below the CLB 7 minimum required for most Express Entry programs`)
      break
    }
    case 'education_credential': {
      if (extracted.is_eca_assessed === false)
        issues.push('Educational Credential Assessment (ECA) may be required — confirm with a designated organization')
      break
    }
    case 'photos': {
      if (extracted.meets_ircc_specs === false)
        issues.push('Photos do not appear to meet IRCC specifications — retake with a certified photographer')
      break
    }
  }
  return issues
}

interface Props {
  initialDocuments: DocumentRow[]
  caseId: string | null
  userId: string
  profile?: Partial<PathwaysProfile>
  onCountChange: (n: number) => void
  onTypesChange: (types: Set<string>) => void
  onAnalyzingTypesChange?: (types: Set<string>) => void
}

// ── Preview modal ────────────────────────────────────────────────────────────

function PreviewModal({ doc, onClose }: { doc: DocumentRow; onClose: () => void }) {
  const [url, setUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.storage.from('documents').createSignedUrl(doc.file_url, 300)
      setUrl(data?.signedUrl ?? null)
      setLoading(false)
    })()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc.file_url])

  const isImage = /\.(jpg|jpeg|png)$/i.test(doc.file_url)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.18 }}
        className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        style={{ maxHeight: '90vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-[#F0F0F0] flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <FileText size={14} className="text-[#534AB7]" />
            <span className="text-[13px] font-semibold text-[#171717]">
              {REQUIRED_DOCS.find(d => d.type === doc.type)?.label ?? getFileName(doc.file_url)}
            </span>
          </div>
          <button onClick={onClose} className="text-[#A3A3A3] hover:text-[#171717] transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-hidden bg-[#F8F7FB]" style={{ minHeight: '60vh' }}>
          {loading ? (
            <div className="h-full flex items-center justify-center">
              <Loader2 size={24} className="text-[#534AB7] animate-spin" />
            </div>
          ) : !url ? (
            <div className="h-full flex items-center justify-center text-[13px] text-[#A3A3A3]">
              Could not load preview
            </div>
          ) : isImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt="Document preview" className="w-full h-full object-contain" />
          ) : (
            <iframe
              src={url}
              className="w-full h-full border-0"
              style={{ minHeight: '60vh' }}
              title="Document preview"
            />
          )}
        </div>
      </motion.div>
    </div>
  )
}

// ── Main component ───────────────────────────────────────────────────────────

export function DocumentsStep({ initialDocuments, caseId, userId, profile, onCountChange, onTypesChange, onAnalyzingTypesChange }: Props) {
  const [documents, setDocuments] = useState<DocumentRow[]>(initialDocuments)
  const [dragOver, setDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [analyzing, setAnalyzing] = useState<Set<string>>(new Set())
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [generateModalOpen, setGenerateModalOpen] = useState(false)
  const [previewDoc, setPreviewDoc] = useState<DocumentRow | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  const PROFILE_KEY = process.env.NEXT_PUBLIC_PROFILE_KEY ?? 'pathways_profile'

  useEffect(() => {
    onCountChange(documents.length)
    onTypesChange(new Set(documents.map((d) => d.type).filter(Boolean) as string[]))
  }, [documents, onCountChange, onTypesChange])

  useEffect(() => {
    if (!onAnalyzingTypesChange) return
    const types = new Set(
      documents
        .filter(d => analyzing.has(d.id))
        .map(d => d.type)
        .filter((t): t is string => !!t)
    )
    onAnalyzingTypesChange(types)
  }, [analyzing, documents, onAnalyzingTypesChange])

  async function analyzeDocument(docId: string) {
    setAnalyzing((prev) => new Set(prev).add(docId))
    try {
      const res = await fetch('/api/documents/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId: docId }),
      })
      if (!res.ok) return
      const { extracted, profileUpdates, detectedType } = await res.json() as {
        extracted: Record<string, unknown>
        profileUpdates: Record<string, unknown>
        detectedType?: string
      }
      setDocuments((prev) => prev.map((d) =>
        d.id === docId
          ? { ...d, extracted_data: extracted, type: detectedType ?? d.type }
          : d
      ))

      if (Object.keys(profileUpdates).length > 0) {
        try {
          const raw = localStorage.getItem(PROFILE_KEY)
          const existing = raw ? (JSON.parse(raw) as Record<string, unknown>) : {}
          localStorage.setItem(PROFILE_KEY, JSON.stringify({ ...existing, ...profileUpdates }))
          const { data: { user } } = await supabase.auth.getUser()
          if (user) {
            const { data: prof } = await supabase.from('profiles').select('id, data').eq('user_id', user.id).single()
            if (prof) await supabase.from('profiles').update({ data: { ...(prof.data as Record<string, unknown>), ...profileUpdates } }).eq('id', prof.id)
          }
        } catch { /* best-effort */ }
      }
    } catch (err) {
      console.error('[DocumentsStep] analysis failed:', err)
    } finally {
      setAnalyzing((prev) => { const next = new Set(prev); next.delete(docId); return next })
    }
  }

  async function uploadFile(file: File): Promise<DocumentRow | null> {
    if (file.size > 10 * 1024 * 1024) {
      setUploadError(`"${file.name}" exceeds the 10 MB limit.`)
      return null
    }
    if (!['application/pdf', 'image/jpeg', 'image/png'].includes(file.type)) {
      setUploadError(`"${file.name}" — only PDF, JPG, and PNG files are accepted.`)
      return null
    }
    if (!caseId) { setUploadError('Session error — please refresh the page.'); return null }

    const filePath = `${userId}/uploads/${Date.now()}_${file.name}`
    const { data: storageData, error: storageError } = await supabase.storage.from('documents').upload(filePath, file)
    if (storageError) { setUploadError(`Upload failed: ${storageError.message}`); return null }

    const { data: row, error: dbError } = await supabase
      .from('documents')
      .insert({ user_id: userId, case_id: caseId, type: null, file_url: storageData.path, extracted_data: null })
      .select().single()
    if (dbError) {
      setUploadError(dbError.message)
      await supabase.storage.from('documents').remove([storageData.path])
      return null
    }
    return row as DocumentRow
  }

  async function handleFiles(files: File[]) {
    if (!files.length) return
    setUploadError(null)
    setUploading(true)
    try {
      const results = await Promise.all(files.map(uploadFile))
      const uploaded = results.filter((r): r is DocumentRow => r !== null)
      if (uploaded.length > 0) {
        setDocuments((prev) => [...uploaded, ...prev])
        if (fileInputRef.current) fileInputRef.current.value = ''
        // Analyze all in parallel
        uploaded.forEach(doc => void analyzeDocument(doc.id))
      }
    } finally {
      setUploading(false)
    }
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false)
    const files = Array.from(e.dataTransfer.files)
    if (files.length) void handleFiles(files)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId, userId])

  async function handleDelete(doc: DocumentRow) {
    setConfirmDeleteId(null)
    await supabase.storage.from('documents').remove([doc.file_url])
    await supabase.from('documents').delete().eq('id', doc.id)
    setDocuments((prev) => prev.filter((d) => d.id !== doc.id))
  }

  function handleGenerated(doc: DocumentRow) {
    setDocuments((prev) => [doc, ...prev])
    setGenerateModalOpen(false)
    void analyzeDocument(doc.id)
  }

  const uploadedByType = new Map(documents.map((d) => [d.type ?? '', d]))
  const uploadedCount = REQUIRED_DOCS.filter((d) => uploadedByType.has(d.type)).length

  return (
    <div className="space-y-0">
      {/* Single unified card */}
      <div className="bg-white rounded-2xl border border-[#EBEBEB] overflow-hidden shadow-[0_1px_4px_rgba(0,0,0,0.04)]">

        {/* Header */}
        <div className="px-6 py-4 border-b border-[#F5F5F5] flex items-center justify-between">
          <div>
            <h3 className="text-[14px] font-semibold text-[#171717]">Documents</h3>
            <p className="text-[12px] text-[#737373] mt-0.5">{uploadedCount} of {REQUIRED_DOCS.length} requirements fulfilled</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-20 h-1.5 bg-[#F0F0F0] rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-[#534AB7] rounded-full"
                animate={{ width: `${(uploadedCount / REQUIRED_DOCS.length) * 100}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              />
            </div>
          </div>
        </div>

        {/* Drop zone */}
        <div className="px-6 py-5 border-b border-[#F5F5F5]">
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`relative border-2 border-dashed rounded-2xl transition-all cursor-pointer ${
              dragOver
                ? 'border-[#534AB7] bg-[#EEEDFE]'
                : 'border-[#E0DEFF] hover:border-[#534AB7] hover:bg-[#FAFAFE] bg-[#FDFCFF]'
            }`}
            style={{ minHeight: '160px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <div className="flex flex-col items-center gap-3 py-8 px-6 text-center">
              <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
                uploading ? 'bg-[#EEEDFE]' : dragOver ? 'bg-[#534AB7]' : 'bg-[#EEEDFE]'
              }`}>
                {uploading
                  ? <Loader2 size={22} className="text-[#534AB7] animate-spin" />
                  : <Upload size={20} className={dragOver ? 'text-white' : 'text-[#534AB7]'} />
                }
              </div>
              {uploading ? (
                <p className="text-[13px] font-medium text-[#534AB7]">Uploading…</p>
              ) : (
                <>
                  <p className="text-[13px] font-medium text-[#171717]">
                    Drop files here, or <span className="text-[#534AB7]">click to browse</span>
                  </p>
                  <p className="text-[11px] text-[#A3A3A3] max-w-xs leading-relaxed">
                    PDF, JPG, PNG · Max 10 MB · Multiple files at once · AI identifies each document automatically
                  </p>
                </>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              multiple
              className="hidden"
              onChange={(e) => {
                const files = Array.from(e.target.files ?? [])
                if (files.length) void handleFiles(files)
              }}
            />
          </div>

          <AnimatePresence>
            {uploadError && (
              <motion.div
                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                animate={{ opacity: 1, height: 'auto', marginTop: 8 }}
                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                className="overflow-hidden"
              >
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
                  <AlertTriangle size={13} className="text-red-500 flex-shrink-0" />
                  <p className="text-[12px] text-red-700 flex-1">{uploadError}</p>
                  <button onClick={() => setUploadError(null)} className="text-red-400 hover:text-red-600 transition-colors flex-shrink-0">
                    <X size={13} />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Checklist rows */}
        <div className="divide-y divide-[#F9F9F9]">
          {REQUIRED_DOCS.map((docSpec) => {
            const doc = uploadedByType.get(docSpec.type)
            const isAnalyzing = doc ? analyzing.has(doc.id) : false
            const hasData = doc?.extracted_data && !doc.extracted_data._error
            const issues = doc?.extracted_data ? detectIssues(docSpec.type, doc.extracted_data) : []
            const isUploaded = !!doc

            return (
              <div key={docSpec.type} className="px-6 py-4">
                <div className="flex items-start gap-3.5">
                  {/* Status icon */}
                  <div className="mt-0.5 flex-shrink-0 w-5 h-5 flex items-center justify-center">
                    {isAnalyzing ? (
                      <Loader2 size={15} className="text-[#534AB7] animate-spin" />
                    ) : isUploaded && issues.length > 0 ? (
                      <div className="w-5 h-5 rounded-full bg-amber-100 flex items-center justify-center">
                        <AlertTriangle size={10} className="text-amber-600" />
                      </div>
                    ) : isUploaded ? (
                      <CheckCircle2 size={19} className="text-[#1D9E75]" />
                    ) : (
                      <div className="w-4.5 h-4.5 rounded-full border-2 border-[#D4D4D4]" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-[13px] font-medium leading-snug ${isUploaded ? 'text-[#171717]' : 'text-[#525252]'}`}>
                        {docSpec.label}
                      </p>

                      {/* Actions */}
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {isUploaded ? (
                          <>
                            {/* Preview */}
                            <button
                              onClick={() => setPreviewDoc(doc)}
                              title="Preview document"
                              className="w-7 h-7 rounded-lg flex items-center justify-center text-[#A3A3A3] hover:text-[#534AB7] hover:bg-[#F4F2FF] transition-colors"
                            >
                              <Eye size={13} />
                            </button>

                            {confirmDeleteId === doc.id ? (
                              <>
                                <button onClick={() => void handleDelete(doc)} className="text-[11px] text-red-600 font-semibold hover:text-red-800 transition-colors px-2">Remove</button>
                                <button onClick={() => setConfirmDeleteId(null)} className="text-[11px] text-[#A3A3A3] hover:text-[#525252] transition-colors">Cancel</button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => fileInputRef.current?.click()}
                                  className="text-[11px] text-[#737373] hover:text-[#534AB7] font-medium transition-colors px-2 py-1 rounded-lg hover:bg-[#F4F2FF]"
                                >
                                  Replace
                                </button>
                                <button onClick={() => setConfirmDeleteId(doc.id)} className="w-7 h-7 rounded-lg flex items-center justify-center text-[#D4D4D4] hover:text-[#A3A3A3] hover:bg-[#F5F5F5] transition-colors">
                                  <X size={13} />
                                </button>
                              </>
                            )}
                          </>
                        ) : (
                          <div className="flex items-center gap-2">
                            {GENERATABLE.has(docSpec.type) && (
                              <button
                                onClick={() => setGenerateModalOpen(true)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold bg-gradient-to-r from-[#534AB7] to-[#7B6FD6] text-white hover:from-[#3C3489] hover:to-[#534AB7] transition-all shadow-sm shadow-[#534AB7]/20"
                              >
                                <Wand2 size={10} />
                                Generate with AI
                              </button>
                            )}
                            <button
                              onClick={() => fileInputRef.current?.click()}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold bg-white border border-[#E0DEFF] text-[#534AB7] hover:bg-[#F4F2FF] hover:border-[#C5BFFF] transition-all"
                            >
                              <ArrowUpFromLine size={10} />
                              Upload
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Status line */}
                    <p className="text-[11px] mt-0.5 leading-snug">
                      {isAnalyzing ? (
                        <span className="text-[#534AB7] flex items-center gap-1">
                          <Sparkles size={9} /> Identifying and analyzing with AI…
                        </span>
                      ) : hasData ? (
                        <span className="text-[#1D9E75]">{summarize(docSpec.type, doc!.extracted_data!)}</span>
                      ) : doc?.extracted_data?._error ? (
                        <span className="text-amber-600">{getFileName(doc.file_url)}</span>
                      ) : isUploaded ? (
                        <span className="text-[#A3A3A3]">{getFileName(doc.file_url)}</span>
                      ) : (
                        <span className="text-[#A3A3A3]">{docSpec.hint}</span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Issue flags */}
                <AnimatePresence>
                  {issues.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-2.5 ml-[34px] flex items-start gap-2 p-2.5 bg-amber-50 border border-amber-200/80 rounded-xl">
                        <AlertTriangle size={11} className="text-amber-500 mt-0.5 flex-shrink-0" />
                        <p className="text-[11px] text-amber-800 leading-relaxed">{issues[0]}</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
        </div>
      </div>

      {/* Preview modal */}
      <AnimatePresence>
        {previewDoc && (
          <PreviewModal doc={previewDoc} onClose={() => setPreviewDoc(null)} />
        )}
      </AnimatePresence>

      {/* Generate modal */}
      {generateModalOpen && caseId && (
        <GenerateDocumentModal
          docType="employment_letter"
          profile={profile}
          userId={userId}
          caseId={caseId}
          onGenerated={handleGenerated}
          onClose={() => setGenerateModalOpen(false)}
        />
      )}
    </div>
  )
}
