'use client'

import { useState } from 'react'
import { updateRoadmapStep, type StepStatus } from './actions'
import type { RecommendedRoadmapStep } from '@/lib/types'

export function RoadmapChecklist({
  steps,
  initialProgress,
}: {
  steps: RecommendedRoadmapStep[]
  initialProgress: Record<string, StepStatus>
}) {
  const [progress, setProgress] = useState(initialProgress)
  const [pending, setPending] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const cycleStatus = async (stepId: string) => {
    if (pending) return
    const current = progress[stepId] ?? 'not_started'
    const next: StepStatus =
      current === 'not_started' ? 'in_progress' : current === 'in_progress' ? 'done' : 'not_started'

    // Optimistic update
    setProgress((prev) => ({ ...prev, [stepId]: next }))
    setError(null)
    setPending(stepId)

    try {
      await updateRoadmapStep(stepId, next)
    } catch {
      // Revert on error
      setProgress((prev) => ({ ...prev, [stepId]: current }))
      setError('Failed to save. Please try again.')
    } finally {
      setPending(null)
    }
  }

  return (
    <div className="space-y-2">
      {error && (
        <p className="text-[11px] text-[#DC2626] mb-2">{error}</p>
      )}
      {steps.map((step) => {
        const status = progress[step.id] ?? 'not_started'
        const isLoading = pending === step.id

        return (
          <button
            key={step.id}
            onClick={() => void cycleStatus(step.id)}
            disabled={isLoading || (pending !== null && pending !== step.id)}
            className="w-full text-left flex items-start gap-3 p-3 rounded-[10px] hover:bg-[#F5F5F5] transition-colors disabled:opacity-60"
          >
            <div
              className={`mt-0.5 w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                isLoading
                  ? 'border-[#A3A3A3] animate-pulse'
                  : status === 'done'
                  ? 'bg-[#1D9E75] border-[#1D9E75]'
                  : status === 'in_progress'
                  ? 'border-[#534AB7]'
                  : 'border-[#D4D4D4]'
              }`}
            >
              {!isLoading && status === 'done' && (
                <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                  <path
                    d="M1 3l2 2 4-4"
                    stroke="white"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
              {!isLoading && status === 'in_progress' && (
                <div className="w-1.5 h-1.5 rounded-full bg-[#534AB7]" />
              )}
            </div>
            <div className="min-w-0">
              <p
                className={`text-[13px] font-medium leading-tight ${
                  status === 'done' ? 'text-[#A3A3A3] line-through' : 'text-[#171717]'
                }`}
              >
                {step.title}
              </p>
              <p className="text-[11px] text-[#A3A3A3] mt-0.5">{step.estimatedTime}</p>
            </div>
          </button>
        )
      })}
    </div>
  )
}
