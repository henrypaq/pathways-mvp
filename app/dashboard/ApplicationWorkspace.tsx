'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CheckCircle2, Clock, DollarSign, ExternalLink, ChevronRight, ChevronDown,
  Sparkles, ShieldCheck, AlertCircle, FileText, ArrowLeft,
} from 'lucide-react'
import type { PathwayMatch, RecommendedRoadmapStep } from '@/lib/types'
import { DocumentsManager } from './documents/DocumentsManager'
import { RoadmapChecklist } from './RoadmapChecklist'
import type { StepStatus } from './actions'

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
  pathway: PathwayMatch
  roadmapSteps: RecommendedRoadmapStep[]
  roadmapProgress: Record<string, StepStatus>
  caseId: string | null
  userId: string
  initialDocuments: DocumentRow[]
}

// Documents + Requirements merged into one step
const STEPS = [
  { id: 'pathway' as const,   num: 1, label: 'Pathway Overview' },
  { id: 'documents' as const, num: 2, label: 'Documents & Requirements' },
  { id: 'roadmap' as const,   num: 3, label: 'Action Plan' },
]
type StepId = typeof STEPS[number]['id']

// Keyword map: requirement text → best document type to upload
const REQ_TO_DOC: Array<{ keywords: string[]; docType: string; docLabel: string }> = [
  { keywords: ['passport', 'travel document', 'identity document'], docType: 'passport', docLabel: 'Passport' },
  { keywords: ['language', 'english', 'french', 'clb', 'ielts', 'toefl', 'tef', 'celpip', 'proficiency'], docType: 'language_test', docLabel: 'Language Test Results' },
  { keywords: ['work experience', 'employment', 'job offer', 'employer', 'occupation', 'skilled work'], docType: 'employment_letter', docLabel: 'Employment Letter' },
  { keywords: ['education', 'degree', 'diploma', 'credential', 'eca', 'assessment', 'bachelor', 'master'], docType: 'education_credential', docLabel: 'Education Credential' },
  { keywords: ['funds', 'financial', 'settlement', 'bank', 'savings', 'settlement funds'], docType: 'bank_statement', docLabel: 'Bank Statement' },
  { keywords: ['police', 'criminal', 'background check', 'clearance', 'security'], docType: 'police_certificate', docLabel: 'Police Certificate' },
  { keywords: ['photo', 'photograph', 'biometric photo'], docType: 'photos', docLabel: 'Passport Photos' },
]

function getSuggestedDoc(req: string): { docType: string; docLabel: string } | null {
  const lower = req.toLowerCase()
  return REQ_TO_DOC.find((m) => m.keywords.some((kw) => lower.includes(kw))) ?? null
}

// ── Pathway overview step ─────────────────────────────────────────────────────

function PathwayStep({ pathway }: { pathway: PathwayMatch }) {
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-[#EBEBEB] p-6 shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
        {pathway.isVerified && (
          <div className="flex items-center gap-1.5 mb-3 text-[#1D9E75]">
            <ShieldCheck size={13} />
            <span className="text-[11px] font-semibold uppercase tracking-wide">Verified Immigration Pathway</span>
          </div>
        )}
        <div className="flex items-start gap-6">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap mb-1.5">
              <span className="text-2xl">{pathway.flag}</span>
              <h2 className="text-[22px] font-bold text-[#171717] leading-tight">{pathway.name}</h2>
            </div>
            <p className="text-[13px] text-[#737373] mb-5">{pathway.category}</p>
            <div className="flex gap-3 flex-wrap">
              <div className="flex items-center gap-2 bg-[#F7F7F7] rounded-xl px-3 py-2">
                <Clock size={13} className="text-[#A3A3A3]" />
                <div>
                  <p className="text-[10px] text-[#A3A3A3] uppercase tracking-wide">Timeline</p>
                  <p className="text-[13px] font-semibold text-[#171717]">{pathway.estimatedTimeline}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-[#F7F7F7] rounded-xl px-3 py-2">
                <DollarSign size={13} className="text-[#A3A3A3]" />
                <div>
                  <p className="text-[10px] text-[#A3A3A3] uppercase tracking-wide">Fees</p>
                  <p className="text-[13px] font-semibold text-[#171717]">{pathway.processingFeeRange}</p>
                </div>
              </div>
              <div className="flex items-center bg-[#F7F7F7] rounded-xl px-3 py-2">
                <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${
                  pathway.difficulty === 'Easy' ? 'bg-[#DCFCE7] text-[#16A34A]' :
                  pathway.difficulty === 'Medium' ? 'bg-[#FEF9C3] text-[#CA8A04]' :
                  'bg-[#FEE2E2] text-[#DC2626]'
                }`}>{pathway.difficulty}</span>
              </div>
            </div>
          </div>
          {/* Match score ring */}
          {(() => {
            const r = 32, circ = 2 * Math.PI * r, score = pathway.matchScore
            const color = score >= 80 ? '#1D9E75' : score >= 60 ? '#F59E0B' : '#EF4444'
            return (
              <div className="relative flex items-center justify-center w-24 h-24 flex-shrink-0">
                <svg width="96" height="96" className="-rotate-90">
                  <circle cx="48" cy="48" r={r} fill="none" stroke="#F0F0F0" strokeWidth="6" />
                  <motion.circle cx="48" cy="48" r={r} fill="none" stroke={color} strokeWidth="6"
                    strokeLinecap="round" strokeDasharray={circ}
                    initial={{ strokeDashoffset: circ }}
                    animate={{ strokeDashoffset: circ - (score / 100) * circ }}
                    transition={{ duration: 1.2, ease: 'easeOut', delay: 0.1 }} />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-[20px] font-bold leading-none" style={{ color }}>{score}%</span>
                  <span className="text-[10px] text-[#A3A3A3] mt-0.5">match</span>
                </div>
              </div>
            )
          })()}
        </div>
      </div>

      {pathway.matchReasons.length > 0 && (
        <div className="bg-white rounded-2xl border border-[#EBEBEB] p-5 shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
          <h3 className="text-[11px] font-semibold text-[#A3A3A3] uppercase tracking-wider mb-3">Why you qualify</h3>
          <ul className="space-y-2.5">
            {pathway.matchReasons.map((r, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <CheckCircle2 size={14} className="text-[#1D9E75] mt-0.5 flex-shrink-0" />
                <span className="text-[13px] text-[#525252] leading-snug">{r}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="bg-[#EEEDFE] rounded-2xl p-5">
        <div className="flex items-start gap-2.5">
          <AlertCircle size={14} className="text-[#534AB7] mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-[11px] font-semibold text-[#534AB7] uppercase tracking-wider mb-1">Your immediate next step</p>
            <p className="text-[13px] text-[#171717] leading-snug">{pathway.nextStep}</p>
          </div>
        </div>
        {pathway.officialUrl && (
          <a href={pathway.officialUrl} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 mt-3 text-[12px] text-[#534AB7] hover:text-[#3C3489] transition-colors font-medium">
            Official IRCC page <ExternalLink size={11} />
          </a>
        )}
      </div>

      {pathway.sources.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold text-[#A3A3A3] uppercase tracking-wider mb-2">Sources</p>
          <div className="flex flex-wrap gap-2">
            {pathway.sources.map((s, i) => (
              <a key={i} href={s.url} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#E5E5E5] rounded-full text-[11px] text-[#525252] hover:border-[#534AB7]/40 hover:text-[#534AB7] transition-colors">
                <ExternalLink size={9} /> {s.title}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Combined Documents & Requirements step ───────────────────────────────────

function DocumentsRequirementsStep({
  pathway,
  initialDocuments,
  uploadedDocTypes,
  caseId,
  userId,
  onCountChange,
  onTypesChange,
}: {
  pathway: PathwayMatch
  initialDocuments: DocumentRow[]
  uploadedDocTypes: Set<string>
  caseId: string | null
  userId: string
  onCountChange: (n: number) => void
  onTypesChange: (types: Set<string>) => void
}) {
  const [expandedReq, setExpandedReq] = useState<number | null>(null)

  return (
    <div className="space-y-6">
      {/* AI-suggested documents per requirement */}
      <div className="bg-white rounded-2xl border border-[#EBEBEB] p-5 shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles size={13} className="text-[#534AB7]" />
          <h3 className="text-[13px] font-semibold text-[#171717]">Required Documents</h3>
        </div>
        <p className="text-[12px] text-[#737373] mb-4">
          Based on your pathway requirements, here&apos;s what you need to upload. AI will verify each one automatically.
        </p>

        <div className="space-y-2">
          {pathway.requirements.map((req, i) => {
            const suggestion = getSuggestedDoc(req)
            const isUploaded = suggestion ? uploadedDocTypes.has(suggestion.docType) : false

            return (
              <div key={i} className="rounded-xl border border-[#EBEBEB] overflow-hidden">
                <button
                  onClick={() => setExpandedReq(expandedReq === i ? null : i)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[#FAFAFA] transition-colors"
                >
                  <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                    isUploaded ? 'bg-[#1D9E75] border-[#1D9E75]' : 'border-[#D4D4D4]'
                  }`}>
                    {isUploaded && (
                      <svg width="7" height="5" viewBox="0 0 7 5" fill="none">
                        <path d="M1 2.5l1.5 1.5 3.5-3.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                    {!isUploaded && <div className="w-1.5 h-1.5 rounded-full bg-[#D4D4D4]" />}
                  </div>
                  <span className="flex-1 text-[13px] text-[#171717] leading-snug">{req}</span>
                  {suggestion && (
                    <span className={`text-[11px] font-medium flex-shrink-0 px-2 py-0.5 rounded-full ${
                      isUploaded ? 'text-[#1D9E75] bg-[#DCFCE7]' : 'text-[#737373] bg-[#F5F5F5]'
                    }`}>
                      {isUploaded ? '✓ Uploaded' : suggestion.docLabel}
                    </span>
                  )}
                  <ChevronDown size={13} className={`text-[#A3A3A3] flex-shrink-0 transition-transform ${expandedReq === i ? 'rotate-180' : ''}`} />
                </button>
                {expandedReq === i && (
                  <div className="px-4 pb-3 border-t border-[#F5F5F5] bg-[#FAFAFA]">
                    <div className="flex items-start gap-2 pt-2.5">
                      <FileText size={12} className="text-[#A3A3A3] mt-0.5 flex-shrink-0" />
                      <p className="text-[12px] text-[#737373] leading-relaxed">
                        {suggestion
                          ? isUploaded
                            ? `Your ${suggestion.docLabel} has been uploaded and will be analyzed for this requirement.`
                            : `Upload your ${suggestion.docLabel} using the uploader below. Select "${suggestion.docLabel}" as the document type.`
                          : 'Upload a relevant document using the uploader below. AI will extract and verify the details automatically.'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Document upload manager */}
      <div>
        <h3 className="text-[13px] font-semibold text-[#171717] mb-1">Upload Documents</h3>
        <p className="text-[12px] text-[#737373] mb-4">
          Select a document type and upload the file. AI will analyze each document and match it to the requirements above.
        </p>
        {caseId ? (
          <DocumentsManager
            initialDocuments={initialDocuments}
            caseId={caseId}
            userId={userId}
            onCountChange={onCountChange}
            onTypesChange={onTypesChange}
          />
        ) : (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-[13px] text-red-700">
            Unable to load document manager — your session may have expired. Please refresh the page.
          </div>
        )}
      </div>
    </div>
  )
}

// ── Floating checklist panel (ProfilePanel style + score) ─────────────────────

interface FloatingChecklistProps {
  steps: typeof STEPS
  activeStep: StepId
  completedSteps: Set<StepId>
  score: number
  docCount: number
  roadmapSteps: RecommendedRoadmapStep[]
  roadmapProgress: Record<string, StepStatus>
  onNavigate: (step: StepId) => void
}

function FloatingChecklist({
  steps, activeStep, completedSteps, score, docCount, roadmapSteps, roadmapProgress, onNavigate,
}: FloatingChecklistProps) {
  const stepsDone = roadmapSteps.filter((s) => roadmapProgress[s.id] === 'done').length
  const scoreColor = score >= 70 ? '#1D9E75' : score >= 40 ? '#F59E0B' : '#534AB7'

  const subLabel: Record<StepId, string | undefined> = {
    pathway: undefined,
    documents: `${docCount} / 7 uploaded`,
    roadmap: roadmapSteps.length > 0 ? `${stepsDone} / ${roadmapSteps.length} done` : undefined,
  }

  return (
    <div
      className="flex flex-col overflow-hidden"
      style={{ width: '248px', background: '#ffffff', borderRadius: '16px', padding: '20px', flexShrink: 0, border: '1px solid #E5E5E5', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}
    >
      {/* Application score */}
      <p style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#A3A3A3', marginBottom: '10px' }}>
        Application Score
      </p>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <motion.span
              key={score}
              initial={{ opacity: 0.5 }}
              animate={{ opacity: 1 }}
              style={{ fontSize: '24px', fontWeight: 700, color: scoreColor, lineHeight: 1 }}
            >
              {score}%
            </motion.span>
            <span style={{ fontSize: '11px', color: '#A3A3A3' }}>
              {score >= 70 ? 'Strong' : score >= 40 ? 'In progress' : 'Getting started'}
            </span>
          </div>
          <div style={{ height: '6px', background: '#F0F0F0', borderRadius: '999px', overflow: 'hidden' }}>
            <motion.div
              animate={{ width: `${score}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              style={{ height: '100%', background: scoreColor, borderRadius: '999px' }}
            />
          </div>
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: '1px', background: '#F0F0F0', marginBottom: '16px' }} />

      {/* Steps */}
      <p style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#A3A3A3', marginBottom: '10px' }}>
        Steps
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {steps.map((step) => {
          const isComplete = completedSteps.has(step.id)
          const isCurrent = activeStep === step.id
          const sub = subLabel[step.id]

          return (
            <button
              key={step.id}
              onClick={() => onNavigate(step.id)}
              className={`w-full text-left rounded-[10px] px-3 py-2.5 transition-colors duration-150 ${
                isCurrent ? 'bg-[#EEEDFE]' : 'hover:bg-[#F5F5F5] active:bg-[#EBEBEB]'
              }`}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                {/* Status dot */}
                <div
                  style={{
                    width: '6px', height: '6px', borderRadius: '50%', flexShrink: 0, marginTop: '5px',
                    background: isComplete ? '#1D9E75' : isCurrent ? '#534AB7' : '#E5E7EB',
                    transition: 'background 0.3s ease',
                  }}
                />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{
                    fontSize: '12px', fontWeight: isCurrent ? 600 : 500,
                    color: isComplete ? '#A3A3A3' : isCurrent ? '#534AB7' : '#525252',
                    transition: 'color 0.2s',
                  }}>
                    {step.label}
                  </div>
                  {sub && (
                    <div style={{ fontSize: '10px', color: '#A3A3A3', marginTop: '1px' }}>{sub}</div>
                  )}
                </div>
                <AnimatePresence>
                  {isComplete && (
                    <motion.span
                      initial={{ opacity: 0, scale: 0.6 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.6 }}
                      transition={{ duration: 0.25 }}
                      style={{ fontSize: '11px', color: '#1D9E75', flexShrink: 0, marginTop: '3px' }}
                    >✓</motion.span>
                  )}
                </AnimatePresence>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Main workspace ─────────────────────────────────────────────────────────────

export function ApplicationWorkspace({
  pathway, roadmapSteps, roadmapProgress: initialProgress, caseId, userId, initialDocuments,
}: Props) {
  const [activeStep, setActiveStep] = useState<StepId>('pathway')
  const [completedSteps, setCompletedSteps] = useState<Set<StepId>>(new Set())
  const [roadmapProgress, setRoadmapProgress] = useState(initialProgress)
  const [docCount, setDocCount] = useState(initialDocuments.length)
  const [uploadedDocTypes, setUploadedDocTypes] = useState<Set<string>>(
    new Set(initialDocuments.map((d) => d.type).filter(Boolean) as string[])
  )

  const activeIndex = STEPS.findIndex((s) => s.id === activeStep)
  const isLastStep = activeIndex === STEPS.length - 1
  const progressPct = (completedSteps.size / STEPS.length) * 100

  // Live application score: docs + roadmap (independent of step completion)
  const stepsDone = roadmapSteps.filter((s) => roadmapProgress[s.id] === 'done').length
  const score = Math.round(
    Math.min(docCount / 7, 1) * 50 +
    (roadmapSteps.length > 0 ? (stepsDone / roadmapSteps.length) * 50 : 0)
  )

  const handleNext = useCallback(() => {
    setCompletedSteps((prev) => new Set(prev).add(activeStep))
    if (!isLastStep) setActiveStep(STEPS[activeIndex + 1].id)
  }, [activeStep, activeIndex, isLastStep])

  const handleBack = useCallback(() => {
    if (activeIndex > 0) setActiveStep(STEPS[activeIndex - 1].id)
  }, [activeIndex])

  const handleNavigate = useCallback((step: StepId) => {
    setActiveStep(step)
  }, [])

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Full-width progress bar */}
      <div className="flex-shrink-0 bg-white border-b border-[#EBEBEB] px-6 py-3">
        <div className="flex items-center gap-3 w-full">
          <span className="text-[10px] font-semibold text-[#A3A3A3] uppercase tracking-wider flex-shrink-0">Progress</span>
          <div className="flex-1 h-1.5 bg-[#F0F0F0] rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-[#534AB7] to-[#7C74D4]"
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
            />
          </div>
          <motion.span
            key={completedSteps.size}
            className="text-[12px] font-bold text-[#534AB7] flex-shrink-0 tabular-nums w-9 text-right"
            initial={{ opacity: 0.5, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.25 }}
          >
            {Math.round(progressPct)}%
          </motion.span>
        </div>
      </div>

      {/* Body */}
      <div className="relative flex-1 flex overflow-hidden">
        {/* Scrollable step content */}
        <div className="flex-1 overflow-y-auto bg-[#FAFAFA] min-w-0">
          <div className="max-w-4xl mx-auto px-8 py-8">
            {/* Step header */}
            <div className="flex items-center gap-3 mb-7">
              <span className="w-7 h-7 rounded-full bg-[#534AB7] text-white text-[11px] font-bold flex items-center justify-center flex-shrink-0">
                {STEPS[activeIndex].num}
              </span>
              <h2 className="text-[18px] font-bold text-[#171717]">{STEPS[activeIndex].label}</h2>
            </div>

            {/* Step content */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeStep}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {activeStep === 'pathway' && <PathwayStep pathway={pathway} />}

                {activeStep === 'documents' && (
                  <DocumentsRequirementsStep
                    pathway={pathway}
                    initialDocuments={initialDocuments}
                    uploadedDocTypes={uploadedDocTypes}
                    caseId={caseId}
                    userId={userId}
                    onCountChange={setDocCount}
                    onTypesChange={setUploadedDocTypes}
                  />
                )}

                {activeStep === 'roadmap' && (
                  <div>
                    <p className="text-[13px] text-[#737373] mb-5">
                      Concrete steps for {pathway.name}. Click each step to track your progress.
                    </p>
                    {roadmapSteps.length > 0 ? (
                      <RoadmapChecklist
                        steps={roadmapSteps}
                        initialProgress={roadmapProgress}
                        onProgressChange={setRoadmapProgress}
                      />
                    ) : (
                      <p className="text-center py-10 text-[13px] text-[#A3A3A3]">
                        No roadmap steps available. Try refreshing your pathway analysis.
                      </p>
                    )}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            {/* Navigation */}
            <div className="mt-10 flex items-center justify-between gap-3">
              <button
                onClick={handleBack}
                disabled={activeIndex === 0}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-medium transition-colors ${
                  activeIndex === 0
                    ? 'text-[#D4D4D4] cursor-default'
                    : 'text-[#737373] hover:text-[#171717] hover:bg-[#F5F5F5] active:bg-[#EBEBEB]'
                }`}
              >
                <ArrowLeft size={13} /> Back
              </button>

              <button
                onClick={handleNext}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-[13px] font-semibold transition-colors active:scale-95 ${
                  completedSteps.has(activeStep) && isLastStep
                    ? 'bg-[#1D9E75] text-white hover:bg-[#178C66]'
                    : completedSteps.has(activeStep)
                    ? 'bg-[#F5F5F5] text-[#A3A3A3] hover:bg-[#EBEBEB]'
                    : 'bg-[#534AB7] text-white hover:bg-[#3C3489]'
                }`}
              >
                {isLastStep
                  ? completedSteps.has(activeStep) ? '✓ Completed' : 'Mark Complete'
                  : completedSteps.has(activeStep)
                  ? <><ChevronRight size={14} /> Continue</>
                  : <>Next Step <ChevronRight size={14} /></>
                }
              </button>
            </div>

            <div className="h-12" />
          </div>
        </div>

        {/* Floating checklist panel */}
        <div className="hidden lg:flex flex-shrink-0 items-start pt-6 pr-6 pl-2">
          <FloatingChecklist
            steps={STEPS}
            activeStep={activeStep}
            completedSteps={completedSteps}
            score={score}
            docCount={docCount}
            roadmapSteps={roadmapSteps}
            roadmapProgress={roadmapProgress}
            onNavigate={handleNavigate}
          />
        </div>
      </div>
    </div>
  )
}
