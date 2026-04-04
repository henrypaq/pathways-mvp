'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, ExternalLink, FileText, AlertTriangle, ChevronDown, ChevronUp, Loader2 } from 'lucide-react'
import { updateSubmissionStep, type StepStatus } from './actions'

// ── Document labels ───────────────────────────────────────────────────────────

const DOC_LABELS: Record<string, string> = {
  passport:             'Passport',
  language_test:        'Language Test Results',
  employment_letter:    'Employment Letter',
  education_credential: 'Education Credential',
  bank_statement:       'Bank Statement',
  police_certificate:   'Police Certificate',
  photos:               'Passport Photos',
}

// ── Step definitions ──────────────────────────────────────────────────────────

interface SubmissionStepDef {
  id: string
  title: string
  instructions: string
  detail?: string         // extra paragraph shown when expanded
  url: string
  urlLabel: string
  docsNeeded?: string[]   // document type keys from DOC_LABELS
  note?: string
}

const SUBMISSION_STEPS: SubmissionStepDef[] = [
  {
    id: 'gckey',
    title: 'Create your IRCC account',
    instructions:
      'Set up a GCKey account (or sign in with a participating bank as a Sign-In Partner). This is the secure portal you will use for all IRCC applications and correspondence.',
    detail:
      'Keep your GCKey username and password in a safe place — you will need it throughout the application process, including to check status updates and respond to IRCC requests.',
    url: 'https://www.canada.ca/en/immigration-refugees-citizenship/services/application/account.html',
    urlLabel: 'Create GCKey account',
  },
  {
    id: 'express_entry_profile',
    title: 'Complete your Express Entry profile',
    instructions:
      'Log in to your IRCC account and start your Express Entry profile. Answer all eligibility questions accurately. Enter your language test scores, education history, and work experience using the correct NOC codes.',
    detail:
      'Your Comprehensive Ranking System (CRS) score is calculated automatically based on your inputs. Higher scores increase your chances of receiving an Invitation to Apply (ITA). Double-check every field — errors can delay or disqualify your application.',
    url: 'https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/works.html',
    urlLabel: 'About Express Entry',
    docsNeeded: ['passport', 'language_test', 'education_credential', 'employment_letter'],
    note: 'Have all your documents open — you will need the exact numbers from each.',
  },
  {
    id: 'pool_submission',
    title: 'Submit your profile to the Express Entry pool',
    instructions:
      'Review your completed Express Entry profile for accuracy, then submit it to the pool. Your CRS score will be locked in at this point. Rounds of invitations are held regularly — the highest-scoring candidates receive an ITA.',
    detail:
      'You can update your profile after submission if your situation changes (e.g. a new language test, a promotion). Updating may improve or lower your CRS score. Monitor the IRCC website for draw results — draws are usually every two weeks.',
    url: 'https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/submit-profile.html',
    urlLabel: 'Submit Express Entry profile',
  },
  {
    id: 'accept_ita',
    title: 'Accept your Invitation to Apply (ITA)',
    instructions:
      'When you receive an ITA via email and in your IRCC account, log in and formally accept it. You will have exactly 60 days from the date of the ITA to submit your complete application — this deadline cannot be extended.',
    url: 'https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/apply-permanent-residence/accept-invitation.html',
    urlLabel: 'Accept your ITA',
    note: '60-day deadline is firm. Start gathering documents immediately.',
  },
  {
    id: 'complete_apr',
    title: 'Complete your Application for Permanent Residence (e-APR)',
    instructions:
      'In your IRCC account, start the electronic Application for Permanent Residence. Complete every section: personal history, addresses for the past 10 years, travel history, employment history, family information, and declarations.',
    detail:
      'Every family member accompanying you must be included. If you have a spouse or common-law partner, their information and supporting documents must also be included. Incomplete applications will be returned.',
    url: 'https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/apply-permanent-residence.html',
    urlLabel: 'Start e-APR',
    docsNeeded: ['passport'],
  },
  {
    id: 'upload_docs',
    title: 'Upload your supporting documents',
    instructions:
      'Upload each required document in your IRCC application portal. Documents must be clear, legible PDFs under 4 MB each. Name your files clearly (e.g. "Passport_Benali.pdf"). IRCC may request additional documents after reviewing your submission.',
    detail:
      'Police certificates are required for every country where you have lived for 6 or more months since the age of 18. If a document is not in English or French, you must include a certified translation.',
    url: 'https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/apply-permanent-residence/collect-documents.html',
    urlLabel: 'Document checklist',
    docsNeeded: ['passport', 'language_test', 'employment_letter', 'education_credential', 'bank_statement', 'police_certificate', 'photos'],
  },
  {
    id: 'pay_fees',
    title: 'Pay application fees',
    instructions:
      'Pay your processing fees online using a credit or debit card. The principal applicant fee is CAD $1,365 (processing) plus CAD $500 (Right of Permanent Residence — paid separately after approval). Include fees for any accompanying family members.',
    url: 'https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/apply-permanent-residence/fee.html',
    urlLabel: 'View fee schedule',
    note: 'Save your payment receipt — you will need it as proof of payment.',
  },
  {
    id: 'biometrics',
    title: 'Provide biometrics',
    instructions:
      'After submitting your application, you will receive a Biometrics Instruction Letter (BIL) from IRCC. Visit an authorized Visa Application Centre (VAC) or Application Support Centre (ASC) within 30 days to have your fingerprints and photo taken.',
    url: 'https://www.canada.ca/en/immigration-refugees-citizenship/services/application/application-forms-guides/guide-5540-collecting-biometrics.html',
    urlLabel: 'Biometrics guide',
    note: 'Book your biometrics appointment as soon as you receive the BIL — slots fill quickly.',
  },
  {
    id: 'monitor',
    title: 'Monitor your application',
    instructions:
      'Log into your IRCC account regularly to check for updates, messages, or requests for additional information. Respond to any IRCC requests promptly — delays in responding can slow down processing or result in a refusal.',
    detail:
      'Processing times vary. Check the IRCC website for current estimates. If your situation changes (address, job, marital status), update your application immediately using the web form.',
    url: 'https://www.canada.ca/en/immigration-refugees-citizenship/services/application/check-status.html',
    urlLabel: 'Check application status',
  },
]

const TOTAL = SUBMISSION_STEPS.length

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  uploadedDocTypes: Set<string>
  docCount: number
  initialProgress: Record<string, StepStatus>
  onProgressChange: (stepId: string, status: StepStatus) => void
}

export function SubmissionStep({ uploadedDocTypes, docCount, initialProgress, onProgressChange }: Props) {
  const [progress, setProgress] = useState<Record<string, StepStatus>>(initialProgress)
  const [pending, setPending] = useState<Set<string>>(new Set())
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [errors, setErrors] = useState<Record<string, string>>({})

  const doneCount = SUBMISSION_STEPS.filter((s) => progress[s.id] === 'done').length
  const progressPct = Math.round((doneCount / TOTAL) * 100)
  const allDocsDone = docCount >= 7

  async function markDone(stepId: string) {
    const next: StepStatus = progress[stepId] === 'done' ? 'not_started' : 'done'
    const prev = progress[stepId] ?? 'not_started'
    setProgress((p) => ({ ...p, [stepId]: next }))
    onProgressChange(stepId, next)
    setPending((p) => new Set(p).add(stepId))
    setErrors((e) => { const n = { ...e }; delete n[stepId]; return n })
    try {
      await updateSubmissionStep(stepId, next)
    } catch {
      setProgress((p) => ({ ...p, [stepId]: prev }))
      onProgressChange(stepId, prev)
      setErrors((e) => ({ ...e, [stepId]: 'Could not save — try again' }))
    } finally {
      setPending((p) => { const n = new Set(p); n.delete(stepId); return n })
    }
  }

  function toggleExpand(stepId: string) {
    setExpanded((prev) => {
      const n = new Set(prev)
      if (n.has(stepId)) n.delete(stepId); else n.add(stepId)
      return n
    })
  }

  return (
    <div className="space-y-5">
      {/* Readiness banner */}
      <div className={`rounded-2xl border p-5 ${
        allDocsDone
          ? 'bg-[#F0FDF7] border-[#BBF7E1]'
          : 'bg-[#FFFBEB] border-[#FDE68A]'
      }`}>
        <div className="flex items-start gap-3">
          {allDocsDone ? (
            <CheckCircle2 size={18} className="text-[#1D9E75] flex-shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle size={18} className="text-[#D97706] flex-shrink-0 mt-0.5" />
          )}
          <div>
            <p className={`text-[13px] font-semibold ${allDocsDone ? 'text-[#065F46]' : 'text-[#92400E]'}`}>
              {allDocsDone
                ? 'All documents uploaded — ready to submit'
                : `${docCount} of 7 documents uploaded`}
            </p>
            <p className={`text-[12px] mt-0.5 ${allDocsDone ? 'text-[#065F46]/80' : 'text-[#92400E]/80'}`}>
              {allDocsDone
                ? 'Follow the steps below to submit your application on the official IRCC portal.'
                : 'Upload your remaining documents before submitting. IRCC will return incomplete applications.'}
            </p>
          </div>
        </div>
      </div>

      {/* Progress header */}
      <div className="bg-white rounded-2xl border border-[#EBEBEB] px-5 py-4 shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
        <div className="flex items-center justify-between mb-2.5">
          <h3 className="text-[13px] font-semibold text-[#171717]">Submission checklist</h3>
          <span className="text-[12px] text-[#737373]">{doneCount} of {TOTAL} steps done</span>
        </div>
        <div className="h-1.5 bg-[#F0F0F0] rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-[#534AB7] to-[#7C74D4]"
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>
        {doneCount === TOTAL && (
          <motion.p
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-2.5 text-[12px] font-medium text-[#1D9E75]"
          >
            ✓ Application submitted — good luck!
          </motion.p>
        )}
      </div>

      {/* Step cards */}
      <div className="space-y-3">
        {SUBMISSION_STEPS.map((step, idx) => {
          const isDone = progress[step.id] === 'done'
          const isPending = pending.has(step.id)
          const isOpen = expanded.has(step.id)
          const hasDetail = !!step.detail

          return (
            <motion.div
              key={step.id}
              layout
              className={`bg-white rounded-2xl border transition-colors shadow-[0_1px_4px_rgba(0,0,0,0.04)] ${
                isDone ? 'border-[#BBF7E1]' : 'border-[#EBEBEB]'
              }`}
            >
              {/* Card header */}
              <div className="px-5 py-4">
                <div className="flex items-start gap-4">
                  {/* Step number */}
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-[11px] font-bold mt-0.5 transition-colors ${
                    isDone ? 'bg-[#1D9E75] text-white' : 'bg-[#F0F0F0] text-[#737373]'
                  }`}>
                    {isDone ? '✓' : idx + 1}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <p className={`text-[13px] font-semibold leading-snug ${isDone ? 'text-[#A3A3A3] line-through decoration-[#A3A3A3]/50' : 'text-[#171717]'}`}>
                        {step.title}
                      </p>
                      {/* Done toggle */}
                      <button
                        onClick={() => void markDone(step.id)}
                        disabled={isPending}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold flex-shrink-0 transition-all ${
                          isDone
                            ? 'bg-[#DCFCE7] text-[#16A34A] hover:bg-[#FEE2E2] hover:text-[#DC2626]'
                            : 'bg-[#F5F5F5] text-[#737373] hover:bg-[#EEEDFE] hover:text-[#534AB7]'
                        } disabled:opacity-50`}
                      >
                        {isPending ? (
                          <Loader2 size={10} className="animate-spin" />
                        ) : isDone ? (
                          'Done ✓'
                        ) : (
                          'Mark done'
                        )}
                      </button>
                    </div>

                    {!isDone && (
                      <p className="text-[12px] text-[#737373] mt-1.5 leading-relaxed">
                        {step.instructions}
                      </p>
                    )}

                    {errors[step.id] && (
                      <p className="text-[11px] text-red-600 mt-1">{errors[step.id]}</p>
                    )}
                  </div>
                </div>

                {/* Expanded detail */}
                <AnimatePresence>
                  {!isDone && isOpen && step.detail && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <p className="text-[12px] text-[#525252] mt-3 ml-11 leading-relaxed border-l-2 border-[#E5E5E5] pl-3">
                        {step.detail}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Card footer — links, docs, note */}
              {!isDone && (
                <div className="px-5 pb-4 ml-11 space-y-3">
                  {/* Note */}
                  {step.note && (
                    <div className="flex items-start gap-2 px-3 py-2 bg-[#FFFBEB] border border-[#FDE68A]/60 rounded-xl">
                      <span className="text-[10px] mt-0.5">⚠️</span>
                      <p className="text-[11px] text-[#92400E] leading-snug">{step.note}</p>
                    </div>
                  )}

                  {/* Documents needed */}
                  {step.docsNeeded && step.docsNeeded.length > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold text-[#A3A3A3] uppercase tracking-wider mb-1.5">Documents to upload here</p>
                      <div className="flex flex-wrap gap-1.5">
                        {step.docsNeeded.map((docType) => {
                          const uploaded = uploadedDocTypes.has(docType)
                          return (
                            <span
                              key={docType}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border ${
                                uploaded
                                  ? 'bg-[#F0FDF7] border-[#BBF7E1] text-[#065F46]'
                                  : 'bg-[#F5F5F5] border-[#E5E5E5] text-[#A3A3A3]'
                              }`}
                            >
                              <FileText size={9} />
                              {DOC_LABELS[docType] ?? docType}
                              {uploaded && ' ✓'}
                            </span>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Action row */}
                  <div className="flex items-center justify-between gap-3 pt-0.5">
                    <a
                      href={step.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#534AB7] text-white text-[12px] font-semibold rounded-full hover:bg-[#3C3489] transition-colors shadow-sm shadow-[#534AB7]/20"
                    >
                      {step.urlLabel} <ExternalLink size={11} />
                    </a>

                    {hasDetail && (
                      <button
                        onClick={() => toggleExpand(step.id)}
                        className="flex items-center gap-1 text-[11px] text-[#A3A3A3] hover:text-[#534AB7] transition-colors"
                      >
                        {isOpen ? (
                          <><ChevronUp size={13} /> Less</>
                        ) : (
                          <><ChevronDown size={13} /> More detail</>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
