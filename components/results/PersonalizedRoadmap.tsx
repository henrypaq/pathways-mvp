'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, Circle, Clock, ChevronDown, ExternalLink, FileText } from 'lucide-react'
import type { RecommendedRoadmapStep } from '@/lib/types'
import { useI18n } from '@/context/I18nContext'

interface PersonalizedRoadmapProps {
  steps: RecommendedRoadmapStep[]
  pathwayName: string
}

function RoadmapStepRow({ step, index, total }: { step: RecommendedRoadmapStep; index: number; total: number }) {
  const { t } = useI18n()
  const [expanded, setExpanded] = useState(index === 0)

  const statusConfig = {
    not_started: { icon: Circle, color: 'text-[#D4D4D4]', label: t('roadmap.status.todo'), lineColor: 'bg-[#E5E5E5]' },
    in_progress: { icon: Circle, color: 'text-[#534AB7]', label: t('roadmap.status.inProgress'), lineColor: 'bg-[#534AB7]' },
    complete: { icon: CheckCircle2, color: 'text-[#1D9E75]', label: t('roadmap.status.complete'), lineColor: 'bg-[#1D9E75]' },
    blocked: { icon: Circle, color: 'text-amber-500', label: t('roadmap.status.blocked'), lineColor: 'bg-amber-400' },
  }

  const { icon: StatusIcon, color, lineColor } = statusConfig[step.status]
  const isLast = index === total - 1

  return (
    <div className="relative">
      {!isLast && (
        <div className={`absolute left-[15px] top-8 bottom-0 w-0.5 ${lineColor} opacity-30`} />
      )}

      <div>
        <button
          onClick={() => setExpanded((e) => !e)}
          className="w-full flex items-start gap-3 text-left group py-2 px-1 rounded-[8px] hover:bg-[#FAFAFA] transition-colors"
        >
          <div className="relative z-10 mt-0.5 flex-shrink-0">
            <StatusIcon size={16} className={color} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[13px] font-medium text-[#171717] leading-tight">{step.title}</span>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="flex items-center gap-1 text-[10px] text-[#A3A3A3]">
                  <Clock size={9} /> {step.estimatedTime}
                </span>
                <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
                  <ChevronDown size={13} className="text-[#D4D4D4] group-hover:text-[#A3A3A3] transition-colors" />
                </motion.div>
              </div>
            </div>
          </div>
        </button>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <div className="ml-7 pb-3 pr-1">
                <p className="text-[12px] text-[#525252] leading-relaxed mb-2">{step.description}</p>

                {step.documents && step.documents.length > 0 && (
                  <div className="mb-2">
                    <p className="text-[10px] font-semibold text-[#A3A3A3] uppercase tracking-wide mb-1.5">{t('roadmap.documentsNeeded')}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {step.documents.map((doc, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#F5F5F5] rounded-full text-[10px] text-[#525252]"
                        >
                          <FileText size={9} />
                          {doc}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {step.officialUrl && (
                  <a
                    href={step.officialUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-[#534AB7] hover:opacity-70 transition-opacity"
                  >
                    {t('roadmap.officialGuide')} <ExternalLink size={10} />
                  </a>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

export function PersonalizedRoadmap({ steps, pathwayName }: PersonalizedRoadmapProps) {
  const { t } = useI18n()
  const completedCount = steps.filter((s) => s.status === 'complete').length
  const progressPct = steps.length > 0 ? Math.round((completedCount / steps.length) * 100) : 0

  return (
    <div className="rounded-2xl border border-[#E5E5E5] bg-white overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.06)]">
      <div className="px-5 py-4 border-b border-[#F5F5F5]">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-[13px] font-semibold text-[#171717]">{t('roadmap.title')}</h3>
          <span className="text-[11px] text-[#A3A3A3]">{t('roadmap.steps', { n: String(steps.length) })}</span>
        </div>
        <p className="text-[11px] text-[#737373] mb-3">{pathwayName}</p>

        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-[#F0F0F0] rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-[#534AB7] rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.8, delay: 0.3, ease: 'easeOut' }}
            />
          </div>
          <span className="text-[10px] text-[#A3A3A3] flex-shrink-0">{progressPct}%</span>
        </div>
      </div>

      <div className="px-4 py-3 space-y-0">
        {steps.map((step, i) => (
          <RoadmapStepRow key={step.id} step={step} index={i} total={steps.length} />
        ))}
      </div>
    </div>
  )
}
