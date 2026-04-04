'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import {
  CheckCircle2, Loader2, AlertTriangle, Upload, X, Sparkles,
} from 'lucide-react'

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
      const parts = [extracted.name, extracted.nationality && `Nationality: ${extracted.nationality as string}`].filter(Boolean)
      return parts.join(' · ') || 'Passport processed'
    }
    case 'language_test': {
      return [extracted.test_name, extracted.overall_score != null && `Overall: ${extracted.overall_score as number}`].filter(Boolean).join(' ') || 'Test results processed'
    }
    case 'employment_letter': {
      return [extracted.job_title, extracted.employer_name && `at ${extracted.employer_name as string}`].filter(Boolean).join(' ') || 'Employment letter processed'
    }
    case 'education_credential': {
      return [extracted.degree_type, extracted.institution_name].filter(Boolean).join(', ') || 'Credential processed'
    }
    case 'bank_statement': {
      return extracted.closing_balance != null
        ? `${extracted.currency ?? ''} ${Number(extracted.closing_balance).toLocaleString()} balance`
        : 'Bank statement processed'
    }
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
        else if (expiry < sixMonthsOut) issues.push('Passport expires within 6 months — renewal may be required before your application is processed')
      }
      break
    }
    case 'language_test': {
      const score = extracted.overall_score as number | undefined
      if (score !== undefined && score < 6) {
        issues.push(`Overall score of ${score} is likely below the CLB 7 minimum required for most Express Entry programs`)
      }
      break
    }
    case 'education_credential': {
      if (extracted.is_eca_assessed === false) {
        issues.push('Educational Credential Assessment (ECA) may be required — confirm with a designated organization before applying')
      }
      break
    }
    case 'photos': {
      if (extracted.meets_ircc_specs === false) {
        issues.push('Photos do not appear to meet IRCC specifications — retake with a certified photographer')
      }
      break
    }
  }
  return issues
}

interface Props {
  initialDocuments: DocumentRow[]
  caseId: string | null
  userId: string
  onCountChange: (n: number) => void
  onTypesChange: (types: Set<string>) => void
}

export function DocumentsStep({ initialDocuments, caseId, userId, onCountChange, onTypesChange }: Props) {
  const [documents, setDocuments] = useState<DocumentRow[]>(initialDocuments)
  const [selectedType, setSelectedType] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [analyzing, setAnalyzing] = useState<Set<string>>(new Set())
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const uploadZoneRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  const PROFILE_KEY = process.env.NEXT_PUBLIC_PROFILE_KEY ?? 'pathways_profile'

  useEffect(() => {
    onCountChange(documents.length)
    onTypesChange(new Set(documents.map((d) => d.type).filter(Boolean) as string[]))
  }, [documents, onCountChange, onTypesChange])

  const scrollToUpload = (type: string) => {
    setSelectedType(type)
    uploadZoneRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    setTimeout(() => fileInputRef.current?.click(), 400)
  }

  async function analyzeDocument(docId: string) {
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
      setDocuments((prev) => prev.map((d) => d.id === docId ? { ...d, extracted_data: extracted } : d))

      // Auto-apply non-intrusive profile updates
      if (Object.keys(profileUpdates).length > 0) {
        try {
          const raw = localStorage.getItem(PROFILE_KEY)
          const existing = raw ? (JSON.parse(raw) as Record<string, unknown>) : {}
          localStorage.setItem(PROFILE_KEY, JSON.stringify({ ...existing, ...profileUpdates }))
          const { data: { user } } = await supabase.auth.getUser()
          if (user) {
            const { data: profile } = await supabase.from('profiles').select('id, data').eq('user_id', user.id).single()
            if (profile) await supabase.from('profiles').update({ data: { ...(profile.data as Record<string, unknown>), ...profileUpdates } }).eq('id', profile.id)
          }
        } catch { /* best-effort */ }
      }
    } catch (err) {
      console.error('[DocumentsStep] analysis failed:', err)
    } finally {
      setAnalyzing((prev) => { const next = new Set(prev); next.delete(docId); return next })
    }
  }

  async function handleFile(file: File) {
    setUploadError(null)
    if (!selectedType) { setUploadError('Please select a document type first.'); return }
    if (!caseId) { setUploadError('Session error — please refresh the page.'); return }
    if (file.size > 10 * 1024 * 1024) { setUploadError('File exceeds the 10 MB limit.'); return }
    if (!['application/pdf', 'image/jpeg', 'image/png'].includes(file.type)) {
      setUploadError('Only PDF, JPG, and PNG files are accepted.')
      return
    }
    setUploading(true)
    try {
      const filePath = `${userId}/${selectedType}/${Date.now()}_${file.name}`
      const { data: storageData, error: storageError } = await supabase.storage.from('documents').upload(filePath, file)
      if (storageError) { setUploadError(`Upload failed: ${storageError.message}`); return }
      const { data: row, error: dbError } = await supabase
        .from('documents')
        .insert({ user_id: userId, case_id: caseId, type: selectedType, file_url: storageData.path, extracted_data: null })
        .select().single()
      if (dbError) {
        setUploadError(dbError.message)
        await supabase.storage.from('documents').remove([storageData.path])
        return
      }
      const newDoc = row as DocumentRow
      setDocuments((prev) => [newDoc, ...prev])
      setSelectedType('')
      if (fileInputRef.current) fileInputRef.current.value = ''
      void analyzeDocument(newDoc.id)
    } finally {
      setUploading(false)
    }
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) void handleFile(file)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedType, caseId, userId])

  async function handleDelete(doc: DocumentRow) {
    setConfirmDeleteId(null)
    await supabase.storage.from('documents').remove([doc.file_url])
    await supabase.from('documents').delete().eq('id', doc.id)
    setDocuments((prev) => prev.filter((d) => d.id !== doc.id))
  }

  const uploadedByType = new Map(documents.map((d) => [d.type ?? '', d]))
  const uploadedCount = REQUIRED_DOCS.filter((d) => uploadedByType.has(d.type)).length

  return (
    <div className="space-y-6">
      {/* Required documents checklist */}
      <div className="bg-white rounded-2xl border border-[#EBEBEB] overflow-hidden shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
        <div className="px-6 py-4 border-b border-[#F5F5F5] flex items-center justify-between">
          <div>
            <h3 className="text-[14px] font-semibold text-[#171717]">Document Checklist</h3>
            <p className="text-[12px] text-[#737373] mt-0.5">{uploadedCount} of {REQUIRED_DOCS.length} documents uploaded</p>
          </div>
          {/* Mini progress bar */}
          <div className="w-24 h-1.5 bg-[#F0F0F0] rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-[#534AB7] rounded-full"
              animate={{ width: `${(uploadedCount / REQUIRED_DOCS.length) * 100}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>
        </div>

        <div className="divide-y divide-[#F9F9F9]">
          {REQUIRED_DOCS.map((docSpec) => {
            const doc = uploadedByType.get(docSpec.type)
            const isAnalyzing = doc ? analyzing.has(doc.id) : false
            const hasData = doc?.extracted_data && !doc.extracted_data._error
            const issues = doc?.extracted_data ? detectIssues(docSpec.type, doc.extracted_data) : []
            const isUploaded = !!doc

            return (
              <div key={docSpec.type} className="px-6 py-4">
                <div className="flex items-start gap-4">
                  {/* Status icon */}
                  <div className="mt-0.5 flex-shrink-0">
                    {isAnalyzing ? (
                      <div className="w-5 h-5 flex items-center justify-center">
                        <Loader2 size={16} className="text-[#534AB7] animate-spin" />
                      </div>
                    ) : isUploaded && issues.length > 0 ? (
                      <div className="w-5 h-5 rounded-full bg-amber-100 flex items-center justify-center">
                        <AlertTriangle size={11} className="text-amber-600" />
                      </div>
                    ) : isUploaded ? (
                      <CheckCircle2 size={20} className="text-[#1D9E75]" />
                    ) : (
                      <div className="w-5 h-5 rounded-full border-2 border-[#D4D4D4]" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-[13px] font-medium ${isUploaded && issues.length === 0 ? 'text-[#171717]' : isUploaded ? 'text-[#171717]' : 'text-[#525252]'}`}>
                        {docSpec.label}
                      </p>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {isUploaded ? (
                          <>
                            {confirmDeleteId === doc!.id ? (
                              <>
                                <button onClick={() => void handleDelete(doc!)} className="text-[11px] text-red-600 font-medium hover:text-red-800 transition-colors">Remove</button>
                                <button onClick={() => setConfirmDeleteId(null)} className="text-[11px] text-[#A3A3A3] hover:text-[#525252] transition-colors">Cancel</button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => scrollToUpload(docSpec.type)}
                                  className="text-[11px] text-[#534AB7] font-medium hover:text-[#3C3489] transition-colors"
                                >
                                  Replace
                                </button>
                                <button onClick={() => setConfirmDeleteId(doc!.id)} className="text-[#D4D4D4] hover:text-[#A3A3A3] transition-colors">
                                  <X size={13} />
                                </button>
                              </>
                            )}
                          </>
                        ) : (
                          <button
                            onClick={() => scrollToUpload(docSpec.type)}
                            className="text-[11px] font-medium text-[#534AB7] hover:text-[#3C3489] transition-colors px-2.5 py-1 rounded-full bg-[#EEEDFE] hover:bg-[#E0DEFF]"
                          >
                            Upload
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Status line */}
                    <p className="text-[11px] mt-0.5">
                      {isAnalyzing ? (
                        <span className="text-[#534AB7] flex items-center gap-1">
                          <Sparkles size={10} /> Analyzing with AI…
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
                      <div className="mt-3 ml-9 flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                        <AlertTriangle size={12} className="text-amber-600 mt-0.5 flex-shrink-0" />
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

      {/* Upload zone */}
      <div className="bg-white rounded-2xl border border-[#EBEBEB] shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
        <div className="px-6 pt-6 pb-4">
          <h3 className="text-[15px] font-semibold text-[#171717] mb-1">Upload Document</h3>
          <p className="text-[12px] text-[#737373]">Choose a document type, then drop your file or click to browse. AI analyzes each upload automatically.</p>
        </div>

        <div className="px-6 pb-6 space-y-3">
          {/* Type dropdown */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="w-full border border-[#E5E5E5] rounded-xl text-[13px] text-[#171717] px-3 py-2.5 focus:outline-none focus:border-[#534AB7] transition-colors bg-white appearance-none"
          >
            <option value="">Select document type…</option>
            {REQUIRED_DOCS.map((d) => (
              <option key={d.type} value={d.type}>{d.label}</option>
            ))}
          </select>

          {/* Drop zone */}
          <div
            ref={uploadZoneRef}
            onDragOver={(e) => { e.preventDefault(); if (selectedType) setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => { if (selectedType) fileInputRef.current?.click() }}
            className={`relative border-2 border-dashed rounded-2xl transition-all ${
              !selectedType
                ? 'border-[#E5E5E5] opacity-50 cursor-not-allowed'
                : dragOver
                ? 'border-[#534AB7] bg-[#EEEDFE] cursor-pointer'
                : 'border-[#D4D4D4] hover:border-[#534AB7] hover:bg-[#FAFAFE] cursor-pointer'
            }`}
            style={{ minHeight: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <div className="flex flex-col items-center gap-4 py-8 px-6 text-center">
              <div className={`w-14 h-14 rounded-full flex items-center justify-center ${
                uploading ? 'bg-[#EEEDFE]' : selectedType ? 'bg-[#EEEDFE]' : 'bg-[#F0F0F0]'
              }`}>
                {uploading
                  ? <Loader2 size={24} className="text-[#534AB7] animate-spin" />
                  : <Upload size={22} className={selectedType ? 'text-[#534AB7]' : 'text-[#A3A3A3]'} />}
              </div>
              {uploading ? (
                <p className="text-[13px] font-medium text-[#534AB7]">Uploading…</p>
              ) : selectedType ? (
                <>
                  <p className="text-[13px] text-[#525252]">
                    Drop your <strong className="text-[#534AB7]">{REQUIRED_DOCS.find(d => d.type === selectedType)?.label}</strong> here
                  </p>
                  <p className="text-[11px] text-[#A3A3A3]">or click to browse · PDF, JPG, PNG · Max 10 MB</p>
                </>
              ) : (
                <p className="text-[13px] text-[#A3A3A3]">Select a document type above to begin uploading</p>
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

          {uploadError && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
              <AlertTriangle size={13} className="text-red-500 flex-shrink-0" />
              <p className="text-[12px] text-red-700">{uploadError}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
