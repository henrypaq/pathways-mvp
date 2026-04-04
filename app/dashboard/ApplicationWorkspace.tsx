'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CheckCircle2, Clock, DollarSign, ExternalLink, ChevronDown,
  Sparkles, ShieldCheck, AlertCircle, FileText,
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
  { id: 'pathway' as const,      num: 1, label: 'Pathway' },
  { id: 'documents' as const,    num: 2, label: 'Documents' },
  { id: 'requirements' as const, num: 3, label: 'Requirements' },
  { id: 'next-steps' as const,   num: 4, label: 'Next Steps' },
]
type StepId = typeof STEPS[number]['id']

// ── Score ring ────────────────────────────────────────────────────────────────
function ScoreRing({ score }: { score: number }) {
  const r = 32
  const circ = 2 * Math.PI * r
  const color = score >= 80 ? '#1D9E75' : score >= 60 ? '#F59E0B' : '#EF4444'
  return (
    <div className="relative flex items-center justify-center w-24 h-24">
      <svg width="96" height="96" className="-rotate-90">
        <circle cx="48" cy="48" r={r} fill="none" stroke="#F0F0F0" strokeWidth="6" />
        <motion.circle
          cx="48" cy="48" r={r} fill="none" stroke={color} strokeWidth="6"
          strokeLinecap="round" strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: circ - (score / 100) * circ }}
          transition={{ duration: 1.2, ease: 'easeOut', delay: 0.1 }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          className="text-[20px] font-bold leading-none"
          style={{ color }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
        >{score}%</motion.span>
        <span className="text-[10px] text-[#A3A3A3] mt-0.5">match</span>
      </div>
    </div>
  )
}

// ── Step 1: Pathway overview ──────────────────────────────────────────────────
function PathwayStep({ pathway }: { pathway: PathwayMatch }) {
  return (
    <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">
      {/* Header card */}
      <div className="bg-white rounded-2xl border border-[#EBEBEB] p-6 shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
        {pathway.isVerified && (
          <div className="flex items-center gap-1.5 mb-4 text-[#1D9E75]">
            <ShieldCheck size={13} />
            <span className="text-[11px] font-semibold uppercase tracking-wide">Verified Immigration Pathway</span>
          </div>
        )}
        <div className="flex items-start gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-2xl">{pathway.flag}</span>
              <h2 className="text-[20px] font-bold text-[#171717] leading-tight">{pathway.name}</h2>
            </div>
            <p className="text-[13px] text-[#737373]">{pathway.category}</p>
            <div className="flex gap-3 mt-4 flex-wrap">
              <div className="flex items-center gap-1.5 bg-[#F7F7F7] rounded-lg px-3 py-2">
                <Clock size={12} className="text-[#A3A3A3]" />
                <div>
                  <p className="text-[10px] text-[#A3A3A3] uppercase tracking-wide">Timeline</p>
                  <p className="text-[12px] font-semibold text-[#171717]">{pathway.estimatedTimeline}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 bg-[#F7F7F7] rounded-lg px-3 py-2">
                <DollarSign size={12} className="text-[#A3A3A3]" />
                <div>
                  <p className="text-[10px] text-[#A3A3A3] uppercase tracking-wide">Fees</p>
                  <p className="text-[12px] font-semibold text-[#171717]">{pathway.processingFeeRange}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 bg-[#F7F7F7] rounded-lg px-3 py-2">
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  pathway.difficulty === 'Easy' ? 'bg-[#DCFCE7] text-[#16A34A]' :
                  pathway.difficulty === 'Medium' ? 'bg-[#FEF9C3] text-[#CA8A04]' :
                  'bg-[#FEE2E2] text-[#DC2626]'
                }`}>{pathway.difficulty}</span>
              </div>
            </div>
          </div>
          <ScoreRing score={pathway.matchScore} />
        </div>
      </div>

      {/* Why you qualify */}
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

      {/* Key requirements */}
      {pathway.requirements.length > 0 && (
        <div className="bg-white rounded-2xl border border-[#EBEBEB] p-5 shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
          <h3 className="text-[11px] font-semibold text-[#A3A3A3] uppercase tracking-wider mb-3">Key requirements</h3>
          <ul className="space-y-2">
            {pathway.requirements.map((r, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#534AB7] flex-shrink-0" />
                <span className="text-[13px] text-[#525252] leading-snug">{r}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Next step */}
      <div className="bg-[#EEEDFE] rounded-2xl p-5">
        <div className="flex items-start gap-2.5">
          <AlertCircle size={14} className="text-[#534AB7] mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-[11px] font-semibold text-[#534AB7] uppercase tracking-wider mb-1">Your immediate next step</p>
            <p className="text-[13px] text-[#171717] leading-snug">{pathway.nextStep}</p>
          </div>
        </div>
        {pathway.officialUrl && (
          <a
            href={pathway.officialUrl} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 mt-3 text-[12px] text-[#534AB7] hover:text-[#3C3489] transition-colors font-medium"
          >
            Official IRCC page <ExternalLink size={11} />
          </a>
        )}
      </div>

      {/* Sources */}
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

// ── Step 3: Requirements check ────────────────────────────────────────────────
function RequirementsStep({ pathway }: { pathway: PathwayMatch }) {
  const [expanded, setExpanded] = useState<number | null>(null)

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <div className="mb-6">
        <h2 className="text-[18px] font-bold text-[#171717]">Requirements Checklist</h2>
        <p className="text-[13px] text-[#737373] mt-1">
          Upload documents in the Documents step — AI will automatically verify each requirement below.
        </p>
      </div>

      <div className="space-y-3">
        {pathway.requirements.map((req, i) => (
          <div key={i} className="bg-white rounded-xl border border-[#EBEBEB] overflow-hidden shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
            <button
              onClick={() => setExpanded(expanded === i ? null : i)}
              className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
            >
              <div className="w-5 h-5 rounded-full border-2 border-[#D4D4D4] flex-shrink-0 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-[#D4D4D4]" />
              </div>
              <span className="flex-1 text-[13px] text-[#171717] leading-snug">{req}</span>
              {expanded === i ? <ChevronDown size={14} className="text-[#A3A3A3] rotate-180" /> : <ChevronDown size={14} className="text-[#A3A3A3]" />}
            </button>
            {expanded === i && (
              <div className="px-4 pb-4 pt-1 border-t border-[#F5F5F5]">
                <div className="flex items-start gap-2 p-3 bg-[#FAFAFA] rounded-lg">
                  <FileText size={12} className="text-[#A3A3A3] mt-0.5 flex-shrink-0" />
                  <p className="text-[12px] text-[#737373] leading-relaxed">
                    Upload a document that demonstrates this requirement. Our AI will extract and verify the relevant details automatically.
                  </p>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-6 p-4 bg-[#F7F7FF] border border-[#534AB7]/15 rounded-xl flex items-start gap-3">
        <Sparkles size={14} className="text-[#534AB7] mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-[12px] font-semibold text-[#534AB7] mb-0.5">AI-powered verification coming soon</p>
          <p className="text-[12px] text-[#737373] leading-relaxed">
            Once you upload your documents, AI will automatically match them to each requirement above and flag any gaps or issues.
          </p>
        </div>
      </div>
    </div>
  )
}

// ── Main workspace ─────────────────────────────────────────────────────────────
export function ApplicationWorkspace({
  pathway, roadmapSteps, roadmapProgress, caseId, userId, initialDocuments,
}: Props) {
  const [activeStep, setActiveStep] = useState<StepId>('pathway')

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Step tab bar */}
      <div className="flex-shrink-0 bg-white border-b border-[#EBEBEB] px-4 sm:px-6 overflow-x-auto">
        <div className="flex items-center min-w-max">
          {STEPS.map((step, i) => (
            <div key={step.id} className="flex items-center">
              <button
                onClick={() => setActiveStep(step.id)}
                className={`flex items-center gap-2 py-[14px] px-3 text-[12px] font-medium border-b-2 transition-all whitespace-nowrap ${
                  activeStep === step.id
                    ? 'border-[#534AB7] text-[#534AB7]'
                    : 'border-transparent text-[#A3A3A3] hover:text-[#525252] hover:border-[#D4D4D4]'
                }`}
              >
                <span className={`w-[18px] h-[18px] rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0 transition-all ${
                  activeStep === step.id
                    ? 'bg-[#534AB7] text-white'
                    : 'bg-[#F0F0F0] text-[#A3A3A3]'
                }`}>
                  {step.num}
                </span>
                {step.label}
              </button>
              {i < STEPS.length - 1 && (
                <div className="w-6 h-px bg-[#E5E5E5] flex-shrink-0" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step content */}
      <div className="flex-1 overflow-y-auto bg-[#FAFAFA]">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeStep}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
          >
            {activeStep === 'pathway' && <PathwayStep pathway={pathway} />}

            {activeStep === 'documents' && (
              <div className="max-w-2xl mx-auto px-6 py-8">
                <div className="mb-6">
                  <h2 className="text-[18px] font-bold text-[#171717]">Your Documents</h2>
                  <p className="text-[13px] text-[#737373] mt-1">
                    Upload the documents required for {pathway.name}. AI will analyze each one and extract key details automatically.
                  </p>
                </div>
                {caseId ? (
                  <DocumentsManager
                    initialDocuments={initialDocuments}
                    caseId={caseId}
                    userId={userId}
                  />
                ) : (
                  <p className="text-[13px] text-[#A3A3A3]">Unable to load document manager. Please refresh.</p>
                )}
              </div>
            )}

            {activeStep === 'requirements' && <RequirementsStep pathway={pathway} />}

            {activeStep === 'next-steps' && (
              <div className="max-w-2xl mx-auto px-6 py-8">
                <div className="mb-6">
                  <h2 className="text-[18px] font-bold text-[#171717]">Your Roadmap</h2>
                  <p className="text-[13px] text-[#737373] mt-1">
                    Concrete steps for {pathway.name}. Click a step to mark it in progress or complete.
                  </p>
                </div>
                {roadmapSteps.length > 0 ? (
                  <div className="space-y-3">
                    <RoadmapChecklist steps={roadmapSteps} initialProgress={roadmapProgress} />
                  </div>
                ) : (
                  <div className="text-center py-12 text-[13px] text-[#A3A3A3]">
                    No roadmap steps available. Try refreshing your pathway analysis.
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
