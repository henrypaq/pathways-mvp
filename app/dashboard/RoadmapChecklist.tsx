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

  const cycleStatus = async (stepId: string) => {
    const current = progress[stepId] ?? 'not_started'
    const next: StepStatus =
      current === 'not_started' ? 'in_progress' : current === 'in_progress' ? 'done' : 'not_started'
    setProgress((prev) => ({ ...prev, [stepId]: next }))
    await updateRoadmapStep(stepId, next)
  }

  return (
    <div className="space-y-2">
      {steps.map((step) => {
        const status = progress[step.id] ?? 'not_started'
        return (
          <button
            key={step.id}
            onClick={() => void cycleStatus(step.id)}
            className="w-full text-left flex items-start gap-3 p-3 rounded-[10px] hover:bg-[#F5F5F5] transition-colors"
          >
            <div
              className={`mt-0.5 w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                status === 'done'
                  ? 'bg-[#1D9E75] border-[#1D9E75]'
                  : status === 'in_progress'
                  ? 'border-[#534AB7]'
                  : 'border-[#D4D4D4]'
              }`}
            >
              {status === 'done' && (
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
              {status === 'in_progress' && (
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
