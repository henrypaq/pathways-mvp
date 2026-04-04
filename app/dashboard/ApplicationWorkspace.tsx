'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CheckCircle2, Clock, DollarSign, ExternalLink,
  ChevronRight, ShieldCheck, AlertCircle, ArrowLeft, Loader2,
} from 'lucide-react'
import type { PathwayMatch, RecommendedRoadmapStep } from '@/lib/types'
import type { PathwaysProfile } from '@/types/voice'
import { DocumentsStep } from './DocumentsStep'
import { RoadmapStepPage } from './RoadmapStepPage'
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
  profileData?: Partial<PathwaysProfile>
}

const BASE_STEP_DEFS = [
  { id: 'pathway' as const, label: 'Pathway Overview' },
  { id: 'documents' as const, label: 'Documents' },
] as const
type BaseStepId = (typeof BASE_STEP_DEFS)[number]['id']

export type WorkspaceLocation =
  | { kind: 'base'; id: BaseStepId }
  | { kind: 'roadmap'; stepId: string }

function locationKey(loc: WorkspaceLocation): string {
  return loc.kind === 'base' ? `base:${loc.id}` : `roadmap:${loc.stepId}`
}

function parseCheckpointKey(key: string): WorkspaceLocation {
  if (key.startsWith('roadmap:')) {
    return { kind: 'roadmap', stepId: key.slice('roadmap:'.length) }
  }
  const id = key.replace('base:', '') as BaseStepId
  return { kind: 'base', id }
}

function titleForLocation(loc: WorkspaceLocation, roadmapSteps: RecommendedRoadmapStep[]): string {
  if (loc.kind === 'base') {
    return BASE_STEP_DEFS.find((b) => b.id === loc.id)!.label
  }
  return roadmapSteps.find((s) => s.id === loc.stepId)?.title ?? 'Step'
}

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

// ── Pathway overview step ──────────────────────────────────────────────────────

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

// ── Floating checklist panel ───────────────────────────────────────────────────

type SidebarEntry = {
  key: string
  label: string
  sub?: string
  complete: boolean
  current: boolean
}

interface FloatingChecklistProps {
  entries: SidebarEntry[]
  score: number
  requirements: string[]
  uploadedDocTypes: Set<string>
  analyzingDocTypes: Set<string>
  onNavigate: (key: string) => void
}

function FloatingChecklist({ entries, score, requirements, uploadedDocTypes, analyzingDocTypes, onNavigate }: FloatingChecklistProps) {
  const scoreColor = score >= 70 ? '#1D9E75' : score >= 40 ? '#F59E0B' : '#534AB7'
  const metCount = requirements.filter((req) => {
    const s = getSuggestedDoc(req)
    return s ? uploadedDocTypes.has(s.docType) && !analyzingDocTypes.has(s.docType) : false
  }).length

  return (
    <div className="flex w-full min-w-0 max-w-[400px] flex-col rounded-2xl border border-[#E5E5E5] bg-white p-5 shadow-[0_4px_16px_rgba(0,0,0,0.08)]">
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
          <div className="h-1.5 rounded-full bg-[#F0F0F0] overflow-hidden">
            <motion.div
              animate={{ width: `${score}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              style={{ height: '100%', background: scoreColor, borderRadius: '999px' }}
            />
          </div>
        </div>
      </div>

      <div className="h-px bg-[#F0F0F0] mb-4" />

      {/* Requirements first */}
      {requirements.length > 0 && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px', marginBottom: '8px' }}>
            <p style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#A3A3A3' }}>
              Requirements
            </p>
            <span style={{ fontSize: '10px', color: '#A3A3A3' }}>{metCount}/{requirements.length} met</span>
          </div>
          <div className="flex flex-col gap-0.5 mb-4">
            {requirements.map((req, i) => {
              const suggestion = getSuggestedDoc(req)
              const isAnalyzing = suggestion ? analyzingDocTypes.has(suggestion.docType) : false
              const isMet = suggestion ? uploadedDocTypes.has(suggestion.docType) && !isAnalyzing : false
              return (
                <div key={i} className="flex items-start gap-2.5 px-2 py-1.5 rounded-lg">
                  <div className="mt-0.5 w-3.5 h-3.5 flex-shrink-0 flex items-center justify-center">
                    {isAnalyzing ? (
                      <Loader2 size={12} className="text-[#534AB7] animate-spin" />
                    ) : isMet ? (
                      <div className="w-3.5 h-3.5 rounded-full bg-[#1D9E75] flex items-center justify-center">
                        <svg width="6" height="4" viewBox="0 0 6 4" fill="none">
                          <path d="M0.5 2l1.5 1.5 3.5-3" stroke="white" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                    ) : (
                      <div className="w-3.5 h-3.5 rounded-full border-2 border-[#D4D4D4]" />
                    )}
                  </div>
                  <span style={{ fontSize: '11px', color: isMet ? '#A3A3A3' : '#525252', lineHeight: '1.4' }}>{req}</span>
                </div>
              )
            })}
          </div>
          <div className="h-px bg-[#F0F0F0] mb-4" />
        </>
      )}

      <p style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#A3A3A3', marginBottom: '10px' }}>
        Steps
      </p>
      <div className="flex flex-col gap-0.5">
        {entries.map((e) => (
          <button
            key={e.key}
            type="button"
            onClick={() => onNavigate(e.key)}
            className={`w-full text-left rounded-[10px] px-3 py-2.5 transition-colors duration-150 ${
              e.current ? 'bg-[#EEEDFE]' : 'hover:bg-[#F5F5F5] active:bg-[#EBEBEB]'
            }`}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <div
                style={{
                  width: '6px', height: '6px', borderRadius: '50%', flexShrink: 0, marginTop: '5px',
                  background: e.complete ? '#1D9E75' : e.current ? '#534AB7' : '#E5E7EB',
                  transition: 'background 0.3s ease',
                }}
              />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{
                  fontSize: '12px', fontWeight: e.current ? 600 : 500,
                  color: e.complete ? '#A3A3A3' : e.current ? '#534AB7' : '#525252',
                  transition: 'color 0.2s',
                }}>
                  {e.label}
                </div>
                {e.sub && (
                  <div style={{ fontSize: '10px', color: '#A3A3A3', marginTop: '1px' }}>{e.sub}</div>
                )}
              </div>
              <AnimatePresence>
                {e.complete && (
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
        ))}
      </div>
    </div>
  )
}

// ── Main workspace ─────────────────────────────────────────────────────────────

export function ApplicationWorkspace({
  pathway, roadmapSteps, roadmapProgress: initialProgress, caseId, userId, initialDocuments, profileData,
}: Props) {
  const [location, setLocation] = useState<WorkspaceLocation>({ kind: 'base', id: 'pathway' })
  const [completedSteps, setCompletedSteps] = useState<Set<BaseStepId>>(new Set())
  const [roadmapProgress, setRoadmapProgress] = useState(initialProgress)
  const [docCount, setDocCount] = useState(initialDocuments.length)
  const [uploadedDocTypes, setUploadedDocTypes] = useState<Set<string>>(
    new Set(initialDocuments.map((d) => d.type).filter(Boolean) as string[])
  )
  const [analyzingDocTypes, setAnalyzingDocTypes] = useState<Set<string>>(new Set())

  useEffect(() => {
    setRoadmapProgress(initialProgress)
  }, [initialProgress])

  const flatLocations = useMemo((): WorkspaceLocation[] => {
    const tail = roadmapSteps.map((s) => ({ kind: 'roadmap' as const, stepId: s.id }))
    return [
      { kind: 'base', id: 'pathway' },
      { kind: 'base', id: 'documents' },
      ...tail,
    ]
  }, [roadmapSteps])

  const activeKey = locationKey(location)
  const activeIndex = flatLocations.findIndex((l) => locationKey(l) === activeKey)
  const isLastStep = activeIndex >= 0 && activeIndex === flatLocations.length - 1

  const baseDoneCount = BASE_STEP_DEFS.filter((b) => completedSteps.has(b.id)).length
  const roadmapDoneCount = roadmapSteps.filter((s) => roadmapProgress[s.id] === 'done').length
  const totalFlat = flatLocations.length
  const doneFlat = baseDoneCount + roadmapDoneCount
  const progressPct = totalFlat > 0 ? (doneFlat / totalFlat) * 100 : 0

  const stepsDone = roadmapSteps.filter((s) => roadmapProgress[s.id] === 'done').length
  const score = Math.round(
    Math.min(docCount / 7, 1) * 50 +
    (roadmapSteps.length > 0 ? (stepsDone / roadmapSteps.length) * 50 : 0)
  )

  const isCurrentComplete =
    location.kind === 'base'
      ? completedSteps.has(location.id)
      : roadmapProgress[location.stepId] === 'done'

  const sidebarEntries = useMemo((): SidebarEntry[] => {
    const entries: SidebarEntry[] = []
    for (const s of BASE_STEP_DEFS) {
      const key = `base:${s.id}`
      entries.push({
        key,
        label: s.label,
        sub: s.id === 'documents' ? `${docCount} / 7 uploaded` : undefined,
        complete: completedSteps.has(s.id),
        current: activeKey === key,
      })
    }
    for (const step of roadmapSteps) {
      const key = `roadmap:${step.id}`
      const done = roadmapProgress[step.id] === 'done'
      entries.push({
        key,
        label: step.title,
        sub: done ? 'Done' : step.estimatedTime,
        complete: done,
        current: activeKey === key,
      })
    }
    return entries
  }, [activeKey, completedSteps, docCount, roadmapProgress, roadmapSteps])

  const handleNext = useCallback(() => {
    const idx = flatLocations.findIndex((l) => locationKey(l) === activeKey)
    if (idx < 0) return
    if (location.kind === 'base') {
      setCompletedSteps((prev) => new Set(prev).add(location.id))
      if (idx < flatLocations.length - 1) {
        setLocation(flatLocations[idx + 1])
      }
    } else if (idx < flatLocations.length - 1) {
      setLocation(flatLocations[idx + 1])
    }
  }, [activeKey, flatLocations, location])

  const handleBack = useCallback(() => {
    if (activeIndex > 0) setLocation(flatLocations[activeIndex - 1])
  }, [activeIndex, flatLocations])

  const handleNavigate = useCallback((key: string) => {
    setLocation(parseCheckpointKey(key))
  }, [])

  const handleRoadmapSaved = useCallback((stepId: string, status: StepStatus) => {
    setRoadmapProgress((prev) => ({ ...prev, [stepId]: status }))
  }, [])

  const currentRoadmapStep =
    location.kind === 'roadmap'
      ? roadmapSteps.find((s) => s.id === location.stepId)
      : undefined

  const motionKey = activeKey

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-[#FAFAFA]">
      {/* Progress strip — white bar so the track reads clearly vs page background */}
      <div className="flex-shrink-0 bg-white border-b border-[#EBEBEB] px-6 py-3">
        <div className="flex items-center gap-3 w-full">
          <span className="text-[10px] font-semibold text-[#A3A3A3] uppercase tracking-wider flex-shrink-0">Progress</span>
          <div className="flex-1 h-1.5 rounded-full bg-white shadow-[inset_0_0_0_1px_#E5E5E5] overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-[#534AB7] to-[#7C74D4]"
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
            />
          </div>
          <motion.span
            key={doneFlat}
            className="text-[12px] font-bold text-[#534AB7] flex-shrink-0 tabular-nums w-9 text-right"
            initial={{ opacity: 0.5, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.25 }}
          >
            {Math.round(progressPct)}%
          </motion.span>
        </div>
      </div>

      {/* Single vertical scroll (scrollbar at viewport right); sidebar is sticky */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain bg-[#FAFAFA]">
        <div className="flex flex-col lg:flex-row lg:items-start gap-8 px-6 py-8 lg:px-8 pb-16">
        <div className="flex-1 min-w-0 w-full">
          <div className="mx-auto w-full max-w-3xl px-1 sm:px-2 md:px-4 py-8">
            {/* Step header */}
            <div className="flex items-center gap-3 mb-7">
              <span className="w-7 h-7 rounded-full bg-[#534AB7] text-white text-[11px] font-bold flex items-center justify-center flex-shrink-0">
                {activeIndex >= 0 ? activeIndex + 1 : 1}
              </span>
              <h2 className="text-[18px] font-bold text-[#171717]">{titleForLocation(location, roadmapSteps)}</h2>
            </div>

            {/* Step content */}
            <AnimatePresence mode="wait">
              <motion.div
                key={motionKey}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {location.kind === 'base' && location.id === 'pathway' && <PathwayStep pathway={pathway} />}

                {location.kind === 'base' && location.id === 'documents' && (
                  caseId ? (
                    <DocumentsStep
                      initialDocuments={initialDocuments}
                      caseId={caseId}
                      userId={userId}
                      profile={profileData}
                      onCountChange={setDocCount}
                      onTypesChange={setUploadedDocTypes}
                      onAnalyzingTypesChange={setAnalyzingDocTypes}
                    />
                  ) : (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-[13px] text-red-700">
                      Unable to load document manager — your session may have expired. Please refresh the page.
                    </div>
                  )
                )}

                {location.kind === 'roadmap' && currentRoadmapStep && (
                  <RoadmapStepPage
                    step={currentRoadmapStep}
                    initialStatus={roadmapProgress[currentRoadmapStep.id] ?? 'not_started'}
                    onSaved={handleRoadmapSaved}
                  />
                )}

                {location.kind === 'roadmap' && !currentRoadmapStep && (
                  <p className="text-center py-10 text-[13px] text-[#A3A3A3]">
                    This step is no longer on your roadmap. Choose another item in the checklist.
                  </p>
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
                type="button"
                onClick={handleNext}
                disabled={isLastStep && location.kind === 'roadmap'}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-[13px] font-semibold transition-colors active:scale-95 ${
                  location.kind === 'base' && isCurrentComplete && isLastStep
                    ? 'bg-[#1D9E75] text-white hover:bg-[#178C66]'
                    : location.kind === 'base' && isCurrentComplete
                    ? 'bg-[#F5F5F5] text-[#A3A3A3] hover:bg-[#EBEBEB]'
                    : isLastStep && location.kind === 'roadmap'
                    ? 'bg-[#F5F5F5] text-[#D4D4D4] cursor-default'
                    : 'bg-[#534AB7] text-white hover:bg-[#3C3489]'
                }`}
              >
                {isLastStep
                  ? location.kind === 'base'
                    ? isCurrentComplete ? '✓ Completed' : 'Mark Complete'
                    : 'End of plan'
                  : location.kind === 'base' && isCurrentComplete
                  ? <><ChevronRight size={14} /> Continue</>
                  : <>Next Step <ChevronRight size={14} /></>
                }
              </button>
            </div>

            <div className="h-12" />
          </div>
        </div>

        <aside className="w-full max-w-md mx-auto lg:mx-0 lg:w-[min(420px,38vw)] lg:min-w-[300px] shrink-0 lg:sticky lg:top-5 lg:self-start lg:max-h-[calc(100dvh-7.5rem)] lg:overflow-y-auto">
          <FloatingChecklist
            entries={sidebarEntries}
            score={score}
            requirements={pathway.requirements}
            uploadedDocTypes={uploadedDocTypes}
            analyzingDocTypes={analyzingDocTypes}
            onNavigate={handleNavigate}
          />
        </aside>
        </div>
      </div>
    </div>
  )
}
