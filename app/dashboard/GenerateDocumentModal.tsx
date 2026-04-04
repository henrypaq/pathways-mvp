'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { X, Sparkles, Loader2, AlertTriangle, FileText, RotateCcw } from 'lucide-react'
import type { PathwaysProfile } from '@/types/voice'

interface DocumentRow {
  id: string
  user_id: string
  case_id: string
  type: string | null
  file_url: string
  extracted_data: Record<string, unknown> | null
  created_at: string
}

interface Props {
  docType: 'employment_letter'
  profile?: Partial<PathwaysProfile>
  userId: string
  caseId: string
  onGenerated: (doc: DocumentRow) => void
  onClose: () => void
}

// Fields for each generatable document type
interface EmploymentLetterFields {
  employee_name: string
  job_title: string
  employer_name: string
  employer_address: string
  start_date: string
  employment_type: string
  weekly_hours: string
  annual_salary: string
  currency: string
  supervisor_name: string
  supervisor_title: string
}

function Field({
  label, hint, children,
}: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold text-[#525252] uppercase tracking-wider mb-1">
        {label}
      </label>
      {children}
      {hint && <p className="text-[10px] text-[#A3A3A3] mt-0.5">{hint}</p>}
    </div>
  )
}

const inputCls = 'w-full border border-[#E5E5E5] rounded-lg text-[13px] text-[#171717] px-3 py-2 focus:outline-none focus:border-[#534AB7] transition-colors bg-white placeholder:text-[#A3A3A3]'
const selectCls = `${inputCls} appearance-none`

export function GenerateDocumentModal({ docType, profile, userId, caseId, onGenerated, onClose }: Props) {
  const [fields, setFields] = useState<EmploymentLetterFields>({
    employee_name: '',
    job_title: profile?.occupation ?? '',
    employer_name: '',
    employer_address: '',
    start_date: '',
    employment_type: 'full-time',
    weekly_hours: '40',
    annual_salary: '',
    currency: 'CAD',
    supervisor_name: '',
    supervisor_title: 'Manager',
  })

  const [step, setStep] = useState<'form' | 'preview'>('form')
  const [generating, setGenerating] = useState(false)
  const [previewText, setPreviewText] = useState('')
  const [generatedDoc, setGeneratedDoc] = useState<DocumentRow | null>(null)
  const [error, setError] = useState<string | null>(null)

  function set(key: keyof EmploymentLetterFields, value: string) {
    setFields((prev) => ({ ...prev, [key]: value }))
  }

  async function handleGenerate() {
    setError(null)
    setGenerating(true)
    try {
      const res = await fetch('/api/documents/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: docType, fields, userId, caseId }),
      })
      const data = await res.json() as { document?: DocumentRow; previewText?: string; error?: string }
      if (!res.ok || data.error) throw new Error(data.error ?? 'Generation failed')
      setPreviewText(data.previewText ?? '')
      setGeneratedDoc(data.document ?? null)
      setStep('preview')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setGenerating(false)
    }
  }

  function handleUse() {
    if (generatedDoc) onGenerated(generatedDoc)
  }

  function handleRegenerate() {
    setStep('form')
    setPreviewText('')
    setGeneratedDoc(null)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#F0F0F0] flex items-start justify-between gap-4 flex-shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <Sparkles size={14} className="text-[#534AB7]" />
              <h2 className="text-[14px] font-semibold text-[#171717]">Generate Employment Letter</h2>
            </div>
            <p className="text-[12px] text-[#737373]">
              {step === 'form'
                ? 'AI will draft the letter — your employer signs the final copy.'
                : 'Review the generated letter, then upload it to your application.'}
            </p>
          </div>
          <button onClick={onClose} className="text-[#A3A3A3] hover:text-[#171717] transition-colors mt-0.5 flex-shrink-0">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {step === 'form' && (
            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Your full name">
                  <input className={inputCls} value={fields.employee_name} onChange={e => set('employee_name', e.target.value)} placeholder="Jane Smith" />
                </Field>
                <Field label="Job title">
                  <input className={inputCls} value={fields.job_title} onChange={e => set('job_title', e.target.value)} placeholder="Software Engineer" />
                </Field>
              </div>

              <Field label="Employer / company name">
                <input className={inputCls} value={fields.employer_name} onChange={e => set('employer_name', e.target.value)} placeholder="Acme Corp Ltd." />
              </Field>

              <Field label="Employer address" hint="City and country is sufficient">
                <input className={inputCls} value={fields.employer_address} onChange={e => set('employer_address', e.target.value)} placeholder="Toronto, Ontario, Canada" />
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Start date">
                  <input type="date" className={inputCls} value={fields.start_date} onChange={e => set('start_date', e.target.value)} />
                </Field>
                <Field label="Employment type">
                  <select className={selectCls} value={fields.employment_type} onChange={e => set('employment_type', e.target.value)}>
                    <option value="full-time">Full-time</option>
                    <option value="part-time">Part-time</option>
                  </select>
                </Field>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <Field label="Weekly hours">
                  <input type="number" className={inputCls} value={fields.weekly_hours} onChange={e => set('weekly_hours', e.target.value)} placeholder="40" min={1} max={80} />
                </Field>
                <Field label="Annual salary">
                  <input type="number" className={inputCls} value={fields.annual_salary} onChange={e => set('annual_salary', e.target.value)} placeholder="75000" />
                </Field>
                <Field label="Currency">
                  <select className={selectCls} value={fields.currency} onChange={e => set('currency', e.target.value)}>
                    <option value="CAD">CAD</option>
                    <option value="USD">USD</option>
                    <option value="GBP">GBP</option>
                    <option value="EUR">EUR</option>
                    <option value="AUD">AUD</option>
                  </select>
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Supervisor name">
                  <input className={inputCls} value={fields.supervisor_name} onChange={e => set('supervisor_name', e.target.value)} placeholder="John Doe" />
                </Field>
                <Field label="Supervisor title">
                  <input className={inputCls} value={fields.supervisor_title} onChange={e => set('supervisor_title', e.target.value)} placeholder="Manager" />
                </Field>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
                  <AlertTriangle size={13} className="text-red-500 flex-shrink-0" />
                  <p className="text-[12px] text-red-700">{error}</p>
                </div>
              )}

              <div className="pt-1 pb-1 bg-[#F9F8FF] rounded-xl px-4 py-3 border border-[#E8E4FF]">
                <p className="text-[11px] text-[#534AB7] leading-relaxed">
                  <strong>Note:</strong> This generates a draft. Your employer must review and sign the final letter before submission.
                </p>
              </div>
            </div>
          )}

          {step === 'preview' && (
            <div className="px-6 py-5">
              <div className="flex items-center gap-2 mb-3">
                <FileText size={13} className="text-[#A3A3A3]" />
                <p className="text-[11px] font-semibold text-[#A3A3A3] uppercase tracking-wider">Generated letter</p>
              </div>
              <div className="bg-[#FAFAFA] border border-[#EBEBEB] rounded-xl p-4 text-[12px] text-[#525252] leading-relaxed whitespace-pre-wrap font-mono max-h-72 overflow-y-auto">
                {previewText}
              </div>
              <p className="mt-3 text-[11px] text-[#A3A3A3]">
                This PDF will be uploaded and analyzed automatically. Have your supervisor sign the printed copy.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#F0F0F0] flex items-center justify-between gap-3 flex-shrink-0 bg-white">
          {step === 'form' ? (
            <>
              <button onClick={onClose} className="text-[13px] text-[#737373] hover:text-[#171717] transition-colors">
                Cancel
              </button>
              <button
                onClick={() => void handleGenerate()}
                disabled={generating}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#534AB7] text-white text-[13px] font-semibold rounded-full hover:bg-[#3C3489] transition-colors disabled:opacity-60"
              >
                {generating ? (
                  <><Loader2 size={14} className="animate-spin" /> Generating…</>
                ) : (
                  <><Sparkles size={14} /> Generate letter</>
                )}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleRegenerate}
                className="flex items-center gap-1.5 text-[13px] text-[#737373] hover:text-[#171717] transition-colors"
              >
                <RotateCcw size={13} /> Edit & regenerate
              </button>
              <button
                onClick={handleUse}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#1D9E75] text-white text-[13px] font-semibold rounded-full hover:bg-[#178C66] transition-colors"
              >
                Use this letter
              </button>
            </>
          )}
        </div>
      </motion.div>
    </div>
  )
}
