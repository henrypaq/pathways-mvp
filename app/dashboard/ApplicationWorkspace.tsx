'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
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

const TOTAL_REQUIRED_DOCS = 7

// ── Score helpers ─────────────────────────────────────────────────────────────

function computeScore(
  docCount: number,
  stepsTotal: number,
  stepsDone: number,
  reqsTotal: number,
  reqsViewed: number,
): number {
  const docW = 40, roadmapW = 40, reqW = 20
  const docsScore = Math.min(docCount / TOTAL_REQUIRED_DOCS, 1) * docW
  const roadmapScore = stepsTotal > 0 ? (stepsDone / stepsTotal) * roadmapW : 0
  const reqScore = reqsTotal > 0 ? (reqsViewed / reqsTotal) * reqW : 0
  return Math.round(docsScore + roadmapScore + reqScore)
}

// ── Mini score ring (sidebar) ─────────────────────────────────────────────────

function MiniScoreRing({ score }: { score: number }) {
  const r = 22
  const circ = 2 * Math.PI * r
  const color = score >= 70 ? '#1D9E75' : score >= 40 ? '#F59E0B' : '#534AB7'
  return (
    <div className="relative flex items-center justify-center w-14 h-14">
      <svg width="56" height="56" className="-rotate-90">
        <circle cx="28" cy="28" r={r} fill="none" stroke="#F0F0F0" strokeWidth="4" />
        <motion.circle
          cx="28" cy="28" r={r} fill="none" stroke={color} strokeWidth="4"
          strokeLinecap="round" strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: circ - (score / 100) * circ }}
          transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          className="text-[13px] font-bold leading-none"
          style={{ color }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
        >{score}%</motion.span>
      </div>
    </div>
  )
}

// ── Section wrapper ───────────────────────────────────────────────────────────

function SectionHeader({ num, title }: { num: number; title: string }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <span className="w-6 h-6 rounded-full bg-[#534AB7] text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">
        {num}
      </span>
      <h2 className="text-[16px] font-bold text-[#171717]">{title}</h2>
      <div className="flex-1 h-px bg-[#EBEBEB]" />
    </div>
  )
}

// ── Step 1: Pathway overview ──────────────────────────────────────────────────

function PathwaySection({ pathway }: { pathway: PathwayMatch }) {
  return (
    <div className="space-y-4">
      {/* Header card */}
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
              <h3 className="text-[17px] font-bold text-[#171717] leading-tight">{pathway.name}</h3>
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
          <div className="relative flex items-center justify-center w-20 h-20 flex-shrink-0">
            {(() => {
              const r = 28, circ = 2 * Math.PI * r
              const score = pathway.matchScore
              const color = score >= 80 ? '#1D9E75' : score >= 60 ? '#F59E0B' : '#EF4444'
              return (
                <>
                  <svg width="80" height="80" className="-rotate-90">
                    <circle cx="40" cy="40" r={r} fill="none" stroke="#F0F0F0" strokeWidth="5" />
                    <motion.circle
                      cx="40" cy="40" r={r} fill="none" stroke={color} strokeWidth="5"
                      strokeLinecap="round" strokeDasharray={circ}
                      initial={{ strokeDashoffset: circ }}
                      animate={{ strokeDashoffset: circ - (score / 100) * circ }}
                      transition={{ duration: 1.2, ease: 'easeOut', delay: 0.1 }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-[17px] font-bold leading-none" style={{ color }}>{score}%</span>
                    <span className="text-[9px] text-[#A3A3A3] mt-0.5">match</span>
                  </div>
                </>
              )
            })()}
          </div>
        </div>
      </div>

      {/* Why you qualify */}
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

      {/* Immediate next step */}
      <div className="bg-[#EEEDFE] rounded-2xl p-4">
        <div className="flex items-start gap-2">
          <AlertCircle size={13} className="text-[#534AB7] mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-[10px] font-semibold text-[#534AB7] uppercase tracking-wider mb-1">Your immediate next step</p>
            <p className="text-[12px] text-[#171717] leading-snug">{pathway.nextStep}</p>
          </div>
        </div>
        {pathway.officialUrl && (
          <a
            href={pathway.officialUrl} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 mt-3 text-[11px] text-[#534AB7] hover:text-[#3C3489] transition-colors font-medium"
          >
            Official IRCC page <ExternalLink size={10} />
          </a>
        )}
      </div>

      {/* Sources */}
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

// ── Step 3: Requirements ──────────────────────────────────────────────────────

function RequirementsSection({
  pathway,
  onRequirementView,
}: {
  pathway: PathwayMatch
  onRequirementView: (index: number) => void
}) {
  const [expanded, setExpanded] = useState<number | null>(null)

  const toggle = (i: number) => {
    const next = expanded === i ? null : i
    setExpanded(next)
    if (next !== null) onRequirementView(next)
  }

  return (
    <div className="space-y-4">
      <p className="text-[12px] text-[#737373]">
        Upload documents in the Documents section — AI will automatically verify each requirement.
      </p>

      <div className="space-y-2">
        {pathway.requirements.map((req, i) => (
          <div key={i} className="bg-white rounded-xl border border-[#EBEBEB] overflow-hidden shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
            <button
              onClick={() => toggle(i)}
              className="w-full flex items-center gap-3 px-4 py-3 text-left"
            >
              <div className="w-4 h-4 rounded-full border-2 border-[#D4D4D4] flex-shrink-0 flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-[#D4D4D4]" />
              </div>
              <span className="flex-1 text-[12px] text-[#171717] leading-snug">{req}</span>
              <ChevronDown
                size={13}
                className={`text-[#A3A3A3] transition-transform ${expanded === i ? 'rotate-180' : ''}`}
              />
            </button>
            {expanded === i && (
              <div className="px-4 pb-3 pt-1 border-t border-[#F5F5F5]">
                <div className="flex items-start gap-2 p-2.5 bg-[#FAFAFA] rounded-lg">
                  <FileText size={11} className="text-[#A3A3A3] mt-0.5 flex-shrink-0" />
                  <p className="text-[11px] text-[#737373] leading-relaxed">
                    Upload a document that demonstrates this requirement. Our AI will extract and verify the relevant details automatically.
                  </p>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="p-3.5 bg-[#F7F7FF] border border-[#534AB7]/15 rounded-xl flex items-start gap-2.5">
        <Sparkles size={13} className="text-[#534AB7] mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-[11px] font-semibold text-[#534AB7] mb-0.5">AI-powered verification coming soon</p>
          <p className="text-[11px] text-[#737373] leading-relaxed">
            Once you upload your documents, AI will automatically match them to each requirement and flag any gaps.
          </p>
        </div>
      </div>
    </div>
  )
}

// ── Sidebar checklist ─────────────────────────────────────────────────────────

interface SidebarSection {
  id: string
  label: string
  done: number
  total: number
  onClick: () => void
  active: boolean
}

function SidebarItem({ section }: { section: SidebarSection }) {
  const complete = section.total > 0 ? section.done >= section.total : section.done > 0
  const progress = section.total > 0 ? section.done / section.total : 1

  return (
    <button
      onClick={section.onClick}
      className={`w-full text-left px-3 py-2.5 rounded-[10px] transition-colors group ${
        section.active ? 'bg-[#EEEDFE]' : 'hover:bg-[#F5F5F5]'
      }`}
    >
      <div className="flex items-center gap-2.5 mb-1.5">
        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
          complete
            ? 'bg-[#1D9E75] border-[#1D9E75]'
            : section.active
            ? 'border-[#534AB7]'
            : 'border-[#D4D4D4]'
        }`}>
          {complete && (
            <svg width="7" height="5" viewBox="0 0 7 5" fill="none">
              <path d="M1 2.5l1.5 1.5 3.5-3.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
          {!complete && section.active && (
            <div className="w-1.5 h-1.5 rounded-full bg-[#534AB7]" />
          )}
        </div>
        <span className={`text-[12px] font-medium transition-colors ${
          section.active ? 'text-[#534AB7]' : 'text-[#171717] group-hover:text-[#534AB7]'
        }`}>
          {section.label}
        </span>
      </div>
      {section.total > 0 && (
        <div className="pl-[26px]">
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1 bg-[#F0F0F0] rounded-full overflow-hidden">
              <motion.div
                className={`h-full rounded-full ${complete ? 'bg-[#1D9E75]' : 'bg-[#534AB7]'}`}
                initial={{ width: 0 }}
                animate={{ width: `${Math.round(progress * 100)}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              />
            </div>
            <span className="text-[10px] text-[#A3A3A3] flex-shrink-0">{section.done}/{section.total}</span>
          </div>
        </div>
      )}
    </button>
  )
}

// ── Main workspace ─────────────────────────────────────────────────────────────

export function ApplicationWorkspace({
  pathway, roadmapSteps, roadmapProgress: initialProgress, caseId, userId, initialDocuments,
}: Props) {
  const [roadmapProgress, setRoadmapProgress] = useState(initialProgress)
  const [docCount, setDocCount] = useState(initialDocuments.length)
  const [requirementsViewed, setRequirementsViewed] = useState<Set<number>>(new Set())
  const [activeSection, setActiveSection] = useState('pathway')

  const pathwayRef = useRef<HTMLDivElement>(null)
  const documentsRef = useRef<HTMLDivElement>(null)
  const requirementsRef = useRef<HTMLDivElement>(null)
  const roadmapRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // Track active section via IntersectionObserver
  useEffect(() => {
    const root = scrollContainerRef.current
    if (!root) return

    const entries: Record<string, number> = {}
    const observer = new IntersectionObserver(
      (obs) => {
        obs.forEach((e) => {
          entries[e.target.id] = e.intersectionRatio
        })
        const topSection = Object.entries(entries).sort((a, b) => b[1] - a[1])[0]
        if (topSection) setActiveSection(topSection[0])
      },
      { root, threshold: [0, 0.25, 0.5, 0.75, 1] }
    )

    const refs = [
      { id: 'pathway', ref: pathwayRef },
      { id: 'documents', ref: documentsRef },
      { id: 'requirements', ref: requirementsRef },
      { id: 'roadmap', ref: roadmapRef },
    ]
    refs.forEach(({ id, ref }) => {
      if (ref.current) {
        ref.current.id = id
        observer.observe(ref.current)
      }
    })

    return () => observer.disconnect()
  }, [])

  const scrollToSection = useCallback((sectionId: string) => {
    const map: Record<string, React.RefObject<HTMLDivElement | null>> = {
      pathway: pathwayRef,
      documents: documentsRef,
      requirements: requirementsRef,
      roadmap: roadmapRef,
    }
    const ref = map[sectionId]
    const container = scrollContainerRef.current
    if (!ref?.current || !container) return
    const top = ref.current.offsetTop - 24
    container.scrollTo({ top, behavior: 'smooth' })
  }, [pathwayRef, documentsRef, requirementsRef, roadmapRef])

  const handleRequirementView = useCallback((index: number) => {
    setRequirementsViewed((prev) => {
      if (prev.has(index)) return prev
      return new Set(prev).add(index)
    })
  }, [])

  // Compute score
  const stepsDone = roadmapSteps.filter((s) => roadmapProgress[s.id] === 'done').length
  const score = computeScore(
    docCount,
    roadmapSteps.length,
    stepsDone,
    pathway.requirements.length,
    requirementsViewed.size,
  )

  const sidebarSections: SidebarSection[] = [
    {
      id: 'pathway',
      label: 'Pathway Overview',
      done: 1,
      total: 0,
      onClick: () => scrollToSection('pathway'),
      active: activeSection === 'pathway',
    },
    {
      id: 'documents',
      label: 'Documents',
      done: docCount,
      total: TOTAL_REQUIRED_DOCS,
      onClick: () => scrollToSection('documents'),
      active: activeSection === 'documents',
    },
    {
      id: 'requirements',
      label: 'Requirements',
      done: requirementsViewed.size,
      total: pathway.requirements.length,
      onClick: () => scrollToSection('requirements'),
      active: activeSection === 'requirements',
    },
    {
      id: 'roadmap',
      label: 'Action Plan',
      done: stepsDone,
      total: roadmapSteps.length,
      onClick: () => scrollToSection('roadmap'),
      active: activeSection === 'roadmap',
    },
  ]

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Progress bar row */}
      <div className="flex-shrink-0 bg-white border-b border-[#EBEBEB] px-6 py-3">
        <div className="flex items-center gap-3 max-w-4xl">
          <span className="text-[10px] font-semibold text-[#A3A3A3] uppercase tracking-wider flex-shrink-0">Progress</span>
          <div className="flex-1 h-1.5 bg-[#F0F0F0] rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-[#534AB7] to-[#7C74D4]"
              initial={{ width: '0%' }}
              animate={{ width: `${score}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          </div>
          <motion.span
            className="text-[12px] font-bold text-[#534AB7] flex-shrink-0 tabular-nums"
            key={score}
            initial={{ opacity: 0.6, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.25 }}
          >
            {score}%
          </motion.span>
        </div>
      </div>

      {/* Body: left content + right sidebar */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: continuous scrollable content */}
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto bg-[#FAFAFA]">
          <div className="max-w-2xl mx-auto px-6 py-8 space-y-10">
            {/* Section 1: Pathway Overview */}
            <div ref={pathwayRef}>
              <SectionHeader num={1} title="Pathway Overview" />
              <PathwaySection pathway={pathway} />
            </div>

            {/* Section 2: Documents */}
            <div ref={documentsRef}>
              <SectionHeader num={2} title="Documents" />
              <p className="text-[12px] text-[#737373] mb-5">
                Upload the documents required for {pathway.name}. AI will analyze each one and extract key details automatically.
              </p>
              {caseId ? (
                <DocumentsManager
                  initialDocuments={initialDocuments}
                  caseId={caseId}
                  userId={userId}
                  onCountChange={setDocCount}
                />
              ) : (
                <p className="text-[13px] text-[#A3A3A3]">Unable to load document manager. Please refresh.</p>
              )}
            </div>

            {/* Section 3: Requirements */}
            <div ref={requirementsRef}>
              <SectionHeader num={3} title="Requirements" />
              <RequirementsSection pathway={pathway} onRequirementView={handleRequirementView} />
            </div>

            {/* Section 4: Action Plan */}
            <div ref={roadmapRef}>
              <SectionHeader num={4} title="Action Plan" />
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

            {/* Bottom padding */}
            <div className="h-12" />
          </div>
        </div>

        {/* Right: sticky sidebar */}
        <div className="w-60 flex-shrink-0 border-l border-[#EBEBEB] bg-white overflow-y-auto flex flex-col">
          {/* Score */}
          <div className="flex-shrink-0 p-4 border-b border-[#F5F5F5]">
            <p className="text-[10px] font-semibold text-[#A3A3A3] uppercase tracking-wider mb-3">Application Score</p>
            <div className="flex items-center gap-3">
              <MiniScoreRing score={score} />
              <div>
                <p className="text-[11px] font-semibold text-[#171717]">
                  {score >= 70 ? 'Strong application' : score >= 40 ? 'In progress' : 'Getting started'}
                </p>
                <p className="text-[10px] text-[#A3A3A3] mt-0.5 leading-snug">
                  {score < 100 ? 'Complete the sections below to improve your score' : 'All sections complete!'}
                </p>
              </div>
            </div>
          </div>

          {/* Section checklist */}
          <div className="flex-1 p-3 space-y-0.5">
            <p className="text-[10px] font-semibold text-[#A3A3A3] uppercase tracking-wider px-3 pt-1 pb-2">Sections</p>
            {sidebarSections.map((section) => (
              <SidebarItem key={section.id} section={section} />
            ))}
          </div>

          {/* Tips */}
          <div className="flex-shrink-0 p-4 border-t border-[#F5F5F5]">
            <div className="bg-[#F7F7FF] rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Sparkles size={11} className="text-[#534AB7]" />
                <p className="text-[10px] font-semibold text-[#534AB7]">Tip</p>
              </div>
              <p className="text-[10px] text-[#737373] leading-relaxed">
                {docCount === 0
                  ? 'Start by uploading your passport — AI will fill in your date of birth and nationality automatically.'
                  : stepsDone === 0
                  ? 'Check off action plan steps as you complete them to track your progress.'
                  : 'Review each requirement to confirm you meet the eligibility criteria.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
