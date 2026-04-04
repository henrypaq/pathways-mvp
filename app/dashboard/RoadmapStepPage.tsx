'use client'

import { useState, useEffect } from 'react'
import { FileText, ExternalLink } from 'lucide-react'
import { updateRoadmapStep, type StepStatus } from './actions'
import type { RecommendedRoadmapStep } from '@/lib/types'

const STATUS_OPTIONS: { value: StepStatus; label: string }[] = [
  { value: 'not_started', label: 'Not started' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'done', label: 'Done' },
]

export function RoadmapStepPage({
  step,
  initialStatus,
  onSaved,
}: {
  step: RecommendedRoadmapStep
  initialStatus: StepStatus
  onSaved: (stepId: string, status: StepStatus) => void
}) {
  const [status, setStatus] = useState<StepStatus>(initialStatus)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setStatus(initialStatus)
  }, [step.id, initialStatus])

  const setStatusAndPersist = async (next: StepStatus) => {
    if (pending || next === status) return
    const prev = status
    setStatus(next)
    onSaved(step.id, next)
    setError(null)
    setPending(true)

    try {
      await updateRoadmapStep(step.id, next)
    } catch {
      setStatus(prev)
      onSaved(step.id, prev)
      setError('Could not save status. Try again.')
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="space-y-6">
      <p className="text-[13px] text-[#737373] leading-relaxed">{step.description}</p>

      <div className="flex items-start gap-2.5 px-4 py-3 bg-[#F7F7F7] rounded-xl border border-[#EBEBEB]">
        <span className="text-[11px] text-[#A3A3A3] leading-relaxed">
          Complete this step in real life, then update your status below to track your progress.
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-semibold text-[#A3A3A3] uppercase tracking-wide mr-1">Status</span>
        {STATUS_OPTIONS.map(({ value, label }) => {
          const active = status === value
          return (
            <button
              key={value}
              type="button"
              disabled={pending}
              onClick={() => void setStatusAndPersist(value)}
              className={`px-3 py-1.5 rounded-full text-[12px] font-medium transition-colors disabled:opacity-50 ${
                active
                  ? value === 'done'
                    ? 'bg-[#1D9E75] text-white'
                    : value === 'in_progress'
                      ? 'bg-[#534AB7] text-white'
                      : 'bg-[#171717] text-white'
                  : 'bg-[#F5F5F5] text-[#525252] hover:bg-[#EBEBEB]'
              }`}
            >
              {label}
            </button>
          )
        })}
      </div>

      {error && <p className="text-[12px] text-[#DC2626]">{error}</p>}

      <div className="flex flex-wrap gap-4 text-[12px] text-[#737373]">
        <span>
          <span className="text-[#A3A3A3]">Estimated time: </span>
          {step.estimatedTime}
        </span>
        {step.dependencies.length > 0 && (
          <span>
            <span className="text-[#A3A3A3]">Depends on: </span>
            {step.dependencies.join(', ')}
          </span>
        )}
      </div>

      {step.documents && step.documents.length > 0 && (
        <div className="bg-white rounded-2xl border border-[#EBEBEB] p-5 shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
          <p className="text-[11px] font-semibold text-[#A3A3A3] uppercase tracking-wider mb-3">Documents to prepare</p>
          <ul className="space-y-2">
            {step.documents.map((doc, i) => (
              <li key={i} className="flex items-start gap-2 text-[13px] text-[#525252]">
                <FileText size={14} className="text-[#A3A3A3] mt-0.5 flex-shrink-0" />
                {doc}
              </li>
            ))}
          </ul>
        </div>
      )}

      {step.officialUrl && (
        <a
          href={step.officialUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#EEEDFE] text-[13px] font-medium text-[#534AB7] hover:bg-[#E0DEF8] transition-colors"
        >
          Official IRCC resource <ExternalLink size={14} />
        </a>
      )}
    </div>
  )
}
