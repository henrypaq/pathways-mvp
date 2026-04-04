'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CheckCircle2, Clock, DollarSign, ExternalLink, ChevronDown, ChevronRight,
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

const STEPS = [
  { id: 'pathway' as const,      num: 1, label: 'Pathway Overview' },
  { id: 'documents' as const,    num: 2, label: 'Documents' },
  { id: 'requirements' as const, num: 3, label: 'Requirements' },
  { id: 'roadmap' as const,      num: 4, label: 'Action Plan' },
]
type StepId = typeof STEPS[number]['id']

// ── Pathway overview ──────────────────────────────────────────────────────────

function PathwayStep({ pathway }: { pathway: PathwayMatch }) {
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-[#EBEBEB] p-5 shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
        {pathway.isVerified && (
          <div className="flex items-center gap-1.5 mb-3 text-[#1D9E75]">
            <ShieldCheck size={12} />
            <span className="text-[10px] font-semibold uppercase tracking-wide">Verified Immigration Pathway</span>
          </div>
        )}
        <div className="flex items-start gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-xl">{pathway.flag}</span>
              <h2 className="text-[18px] font-bold text-[#171717] leading-tight">{pathway.name}</h2>
            </div>
            <p className="text-[12px] text-[#737373] mb-4">{pathway.category}</p>
            <div className="flex gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 bg-[#F7F7F7] rounded-lg px-2.5 py-1.5">
                <Clock size={11} className="text-[#A3A3A3]" />
                <div>
                  <p className="text-[9px] text-[#A3A3A3] uppercase tracking-wide">Timeline</p>
                  <p className="text-[11px] font-semibold text-[#171717]">{pathway.estimatedTimeline}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 bg-[#F7F7F7] rounded-lg px-2.5 py-1.5">
                <DollarSign size={11} className="text-[#A3A3A3]" />
                <div>
                  <p className="text-[9px] text-[#A3A3A3] uppercase tracking-wide">Fees</p>
                  <p className="text-[11px] font-semibold text-[#171717]">{pathway.processingFeeRange}</p>
                </div>
              </div>
              <div className="flex items-center justify-center bg-[#F7F7F7] rounded-lg px-2.5 py-1.5">
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  pathway.difficulty === 'Easy' ? 'bg-[#DCFCE7] text-[#16A34A]' :
                  pathway.difficulty === 'Medium' ? 'bg-[#FEF9C3] text-[#CA8A04]' :
                  'bg-[#FEE2E2] text-[#DC2626]'
                }`}>{pathway.difficulty}</span>
              </div>
            </div>
          </div>
          {/* Match score ring */}
          {(() => {
            const r = 28, circ = 2 * Math.PI * r, score = pathway.matchScore
            const color = score >= 80 ? '#1D9E75' : score >= 60 ? '#F59E0B' : '#EF4444'
            return (
              <div className="relative flex items-center justify-center w-20 h-20 flex-shrink-0">
                <svg width="80" height="80" className="-rotate-90">
                  <circle cx="40" cy="40" r={r} fill="none" stroke="#F0F0F0" strokeWidth="5" />
                  <motion.circle cx="40" cy="40" r={r} fill="none" stroke={color} strokeWidth="5"
                    strokeLinecap="round" strokeDasharray={circ}
                    initial={{ strokeDashoffset: circ }}
                    animate={{ strokeDashoffset: circ - (score / 100) * circ }}
                    transition={{ duration: 1.2, ease: 'easeOut', delay: 0.1 }} />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-[17px] font-bold leading-none" style={{ color }}>{score}%</span>
                  <span className="text-[9px] text-[#A3A3A3] mt-0.5">match</span>
                </div>
              </div>
            )
          })()}
        </div>
      </div>

      {pathway.matchReasons.length > 0 && (
        <div className="bg-white rounded-2xl border border-[#EBEBEB] p-5 shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
          <h3 className="text-[10px] font-semibold text-[#A3A3A3] uppercase tracking-wider mb-3">Why you qualify</h3>
          <ul className="space-y-2">
            {pathway.matchReasons.map((r, i) => (
              <li key={i} className="flex items-start gap-2">
                <CheckCircle2 size={13} className="text-[#1D9E75] mt-0.5 flex-shrink-0" />
                <span className="text-[12px] text-[#525252] leading-snug">{r}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="bg-[#EEEDFE] rounded-2xl p-4">
        <div className="flex items-start gap-2">
          <AlertCircle size={13} className="text-[#534AB7] mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-[10px] font-semibold text-[#534AB7] uppercase tracking-wider mb-1">Your immediate next step</p>
            <p className="text-[12px] text-[#171717] leading-snug">{pathway.nextStep}</p>
          </div>
        </div>
        {pathway.officialUrl && (
          <a href={pathway.officialUrl} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 mt-3 text-[11px] text-[#534AB7] hover:text-[#3C3489] transition-colors font-medium">
            Official IRCC page <ExternalLink size={10} />
          </a>
        )}
      </div>

      {pathway.sources.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold text-[#A3A3A3] uppercase tracking-wider mb-2">Sources</p>
          <div className="flex flex-wrap gap-1.5">
            {pathway.sources.map((s, i) => (
              <a key={i} href={s.url} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-[#E5E5E5] rounded-full text-[10px] text-[#525252] hover:border-[#534AB7]/40 hover:text-[#534AB7] transition-colors">
                <ExternalLink size={8} /> {s.title}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Requirements step ─────────────────────────────────────────────────────────

function RequirementsStep({
  pathway,
  uploadedDocTypes,
}: {
  pathway: PathwayMatch
  uploadedDocTypes: Set<string>
}) {
  const [expanded, setExpanded] = useState<number | null>(null)

  // Simple keyword matching: does this requirement relate to an uploaded doc type?
  const docTypeKeywords: Record<string, string[]> = {
    passport: ['passport', 'travel document', 'identity'],
    language_test: ['language', 'english', 'french', 'ielts', 'toefl', 'clb', 'tef', 'celpip'],
    employment_letter: ['employment', 'work experience', 'job offer', 'employer', 'occupation'],
    education_credential: ['education', 'degree', 'diploma', 'credential', 'eca', 'assessment'],
    bank_statement: ['funds', 'financial', 'settlement', 'bank', 'savings'],
    police_certificate: ['police', 'criminal', 'background check', 'clearance'],
    photos: ['photo', 'photograph', 'biometric'],
  }

  function getMatchingDocType(req: string): string | null {
    const lower = req.toLowerCase()
    for (const [docType, keywords] of Object.entries(docTypeKeywords)) {
      if (uploadedDocTypes.has(docType) && keywords.some((kw) => lower.includes(kw))) {
        return docType
      }
    }
    return null
  }

  return (
    <div className="space-y-4">
      <p className="text-[12px] text-[#737373]">
        Upload documents in the Documents step — they'll be automatically matched to requirements below.
      </p>

      <div className="space-y-2">
        {pathway.requirements.map((req, i) => {
          const matchedDoc = getMatchingDocType(req)
          return (
            <div key={i} className="bg-white rounded-xl border border-[#EBEBEB] overflow-hidden shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
              <button
                onClick={() => setExpanded(expanded === i ? null : i)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left"
              >
                <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                  matchedDoc ? 'bg-[#1D9E75] border-[#1D9E75]' : 'border-[#D4D4D4]'
                }`}>
                  {matchedDoc && (
                    <svg width="7" height="5" viewBox="0 0 7 5" fill="none">
                      <path d="M1 2.5l1.5 1.5 3.5-3.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                  {!matchedDoc && <div className="w-1.5 h-1.5 rounded-full bg-[#D4D4D4]" />}
                </div>
                <span className="flex-1 text-[12px] text-[#171717] leading-snug">{req}</span>
                {matchedDoc && (
                  <span className="text-[10px] font-medium text-[#1D9E75] flex-shrink-0">Uploaded</span>
                )}
                <ChevronDown size={13} className={`text-[#A3A3A3] transition-transform flex-shrink-0 ${expanded === i ? 'rotate-180' : ''}`} />
              </button>
              {expanded === i && (
                <div className="px-4 pb-3 pt-1 border-t border-[#F5F5F5]">
                  <div className="flex items-start gap-2 p-2.5 bg-[#FAFAFA] rounded-lg">
                    <FileText size={11} className="text-[#A3A3A3] mt-0.5 flex-shrink-0" />
                    <p className="text-[11px] text-[#737373] leading-relaxed">
                      {matchedDoc
                        ? 'A document has been uploaded that may satisfy this requirement. AI verification is coming soon.'
                        : 'Upload a document that demonstrates this requirement. Our AI will extract and verify the relevant details automatically.'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="p-3.5 bg-[#F7F7FF] border border-[#534AB7]/15 rounded-xl flex items-start gap-2.5">
        <Sparkles size={13} className="text-[#534AB7] mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-[11px] font-semibold text-[#534AB7] mb-0.5">AI-powered verification coming soon</p>
          <p className="text-[11px] text-[#737373] leading-relaxed">
            Uploaded documents will be automatically matched to each requirement and any gaps will be flagged.
          </p>
        </div>
      </div>
    </div>
  )
}

// ── Floating checklist panel (ProfilePanel style) ─────────────────────────────

interface FloatingChecklistProps {
  steps: typeof STEPS
  activeStep: StepId
  completedSteps: Set<StepId>
  docCount: number
  roadmapSteps: RecommendedRoadmapStep[]
  roadmapProgress: Record<string, StepStatus>
  requirementsTotal: number
  uploadedDocTypes: Set<string>
  onNavigate: (step: StepId) => void
}

function FloatingChecklist({
  steps, activeStep, completedSteps, docCount, roadmapSteps, roadmapProgress,
  requirementsTotal, uploadedDocTypes, onNavigate,
}: FloatingChecklistProps) {
  const stepMeta: Record<StepId, { sub?: string }> = {
    pathway: {},
    documents: { sub: `${docCount} / 7 uploaded` },
    requirements: {
      sub: (() => {
        const docTypeKeywords: Record<string, string[]> = {
          passport: ['passport', 'travel document', 'identity'],
          language_test: ['language', 'english', 'french', 'ielts', 'toefl', 'clb'],
          employment_letter: ['employment', 'work experience', 'job offer'],
          education_credential: ['education', 'degree', 'diploma', 'credential'],
          bank_statement: ['funds', 'financial', 'settlement'],
          police_certificate: ['police', 'criminal', 'background'],
          photos: ['photo', 'photograph'],
        }
        // can't run full check here, just show upload count as proxy
        const uploaded = Array.from(uploadedDocTypes).length
        return requirementsTotal > 0 ? `${uploaded} docs uploaded` : undefined
      })(),
    },
    roadmap: {
      sub: (() => {
        const done = roadmapSteps.filter((s) => roadmapProgress[s.id] === 'done').length
        return roadmapSteps.length > 0 ? `${done} / ${roadmapSteps.length} done` : undefined
      })(),
    },
  }

  return (
    <div
      className="flex flex-col overflow-hidden border border-gray-200 shadow-sm"
      style={{ width: '240px', background: '#ffffff', borderRadius: '16px', padding: '20px', flexShrink: 0 }}
    >
      {/* Header */}
      <p
        className="text-gray-500"
        style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '16px' }}
      >
        Application Steps
      </p>

      {/* Progress bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
        <div
          className="bg-gray-100"
          style={{ flex: 1, height: '4px', borderRadius: '999px', overflow: 'hidden' }}
        >
          <motion.div
            animate={{ width: `${(completedSteps.size / steps.length) * 100}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            style={{ height: '100%', background: '#534AB7', borderRadius: '999px' }}
          />
        </div>
        <span className="text-gray-500" style={{ fontSize: '10px', whiteSpace: 'nowrap' }}>
          {completedSteps.size} / {steps.length}
        </span>
      </div>

      {/* Step items */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {steps.map((step) => {
          const isComplete = completedSteps.has(step.id)
          const isCurrent = activeStep === step.id && !isComplete
          const meta = stepMeta[step.id]

          return (
            <button
              key={step.id}
              onClick={() => onNavigate(step.id)}
              style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              {/* Status dot */}
              <div
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  flexShrink: 0,
                  marginTop: '5px',
                  background: isComplete ? '#1D9E75' : isCurrent ? '#534AB7' : '#E5E7EB',
                  transition: 'background 0.3s ease',
                }}
              />

              <div style={{ minWidth: 0, flex: 1 }}>
                <div
                  style={{
                    fontSize: '12px',
                    fontWeight: isCurrent ? 600 : 500,
                    color: isComplete ? '#A3A3A3' : isCurrent ? '#534AB7' : '#525252',
                    marginBottom: meta.sub ? '2px' : 0,
                    textDecoration: isComplete ? 'none' : 'none',
                    transition: 'color 0.2s',
                  }}
                >
                  {step.label}
                </div>
                {meta.sub && (
                  <div style={{ fontSize: '10px', color: '#A3A3A3' }}>
                    {meta.sub}
                  </div>
                )}
              </div>

              {/* Checkmark for completed steps */}
              <AnimatePresence>
                {isComplete && (
                  <motion.span
                    initial={{ opacity: 0, scale: 0.6 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.6 }}
                    transition={{ duration: 0.25 }}
                    style={{ fontSize: '11px', color: '#1D9E75', flexShrink: 0, marginTop: '3px' }}
                  >
                    ✓
                  </motion.span>
                )}
              </AnimatePresence>
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

  const handleNext = useCallback(() => {
    setCompletedSteps((prev) => new Set(prev).add(activeStep))
    if (!isLastStep) {
      setActiveStep(STEPS[activeIndex + 1].id)
    }
  }, [activeStep, activeIndex, isLastStep])

  const handleBack = useCallback(() => {
    if (activeIndex > 0) {
      setActiveStep(STEPS[activeIndex - 1].id)
    }
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
            className="text-[12px] font-bold text-[#534AB7] flex-shrink-0 tabular-nums"
            initial={{ opacity: 0.5, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.25 }}
          >
            {Math.round(progressPct)}%
          </motion.span>
        </div>
      </div>

      {/* Body: step content + floating checklist */}
      <div className="relative flex-1 overflow-hidden">
        {/* Scrollable step content */}
        <div className="h-full overflow-y-auto bg-[#FAFAFA]">
          <div className="max-w-2xl mx-auto px-6 py-8 lg:pr-[280px]">
            {/* Step label */}
            <div className="flex items-center gap-2 mb-6">
              <span className="w-6 h-6 rounded-full bg-[#534AB7] text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                {STEPS[activeIndex].num}
              </span>
              <h2 className="text-[16px] font-bold text-[#171717]">{STEPS[activeIndex].label}</h2>
            </div>

            {/* Step content with transition */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeStep}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                {activeStep === 'pathway' && <PathwayStep pathway={pathway} />}

                {activeStep === 'documents' && (
                  <div>
                    <p className="text-[12px] text-[#737373] mb-5">
                      Upload the documents required for {pathway.name}. AI will analyze each one and extract key details automatically.
                    </p>
                    {caseId ? (
                      <DocumentsManager
                        initialDocuments={initialDocuments}
                        caseId={caseId}
                        userId={userId}
                        onCountChange={setDocCount}
                        onTypesChange={(types) => setUploadedDocTypes(types)}
                      />
                    ) : (
                      <p className="text-[13px] text-[#A3A3A3]">Unable to load document manager. Please refresh.</p>
                    )}
                  </div>
                )}

                {activeStep === 'requirements' && (
                  <RequirementsStep pathway={pathway} uploadedDocTypes={uploadedDocTypes} />
                )}

                {activeStep === 'roadmap' && (
                  <div>
                    <p className="text-[12px] text-[#737373] mb-5">
                      Concrete steps for {pathway.name}. Click a step to mark it in progress or complete.
                    </p>
                    {roadmapSteps.length > 0 ? (
                      <RoadmapChecklist
                        steps={roadmapSteps}
                        initialProgress={roadmapProgress}
                        onProgressChange={setRoadmapProgress}
                      />
                    ) : (
                      <div className="text-center py-10 text-[13px] text-[#A3A3A3]">
                        No roadmap steps available. Try refreshing your pathway analysis.
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            {/* Navigation buttons */}
            <div className="mt-10 flex items-center justify-between gap-3">
              <button
                onClick={handleBack}
                disabled={activeIndex === 0}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-medium transition-colors ${
                  activeIndex === 0
                    ? 'text-[#D4D4D4] cursor-default'
                    : 'text-[#737373] hover:text-[#171717] hover:bg-[#F5F5F5]'
                }`}
              >
                <ArrowLeft size={13} /> Back
              </button>

              <button
                onClick={handleNext}
                className={`flex items-center gap-1.5 px-5 py-2.5 rounded-full text-[13px] font-semibold transition-colors ${
                  completedSteps.has(activeStep) && isLastStep
                    ? 'bg-[#1D9E75] text-white hover:bg-[#178C66]'
                    : completedSteps.has(activeStep)
                    ? 'bg-[#F5F5F5] text-[#A3A3A3]'
                    : 'bg-[#534AB7] text-white hover:bg-[#3C3489]'
                }`}
              >
                {completedSteps.has(activeStep) && !isLastStep ? (
                  <>Revisit <ChevronRight size={13} /></>
                ) : isLastStep ? (
                  completedSteps.has(activeStep) ? '✓ Complete' : 'Mark Complete'
                ) : (
                  <>Next Step <ChevronRight size={13} /></>
                )}
              </button>
            </div>

            <div className="h-8" />
          </div>
        </div>

        {/* Floating checklist panel — desktop only */}
        <div className="absolute right-6 top-6 hidden lg:block">
          <FloatingChecklist
            steps={STEPS}
            activeStep={activeStep}
            completedSteps={completedSteps}
            docCount={docCount}
            roadmapSteps={roadmapSteps}
            roadmapProgress={roadmapProgress}
            requirementsTotal={pathway.requirements.length}
            uploadedDocTypes={uploadedDocTypes}
            onNavigate={handleNavigate}
          />
        </div>
      </div>
    </div>
  )
}
