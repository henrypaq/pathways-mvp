'use client'

import { motion } from 'framer-motion'
import { ExternalLink, Clock, DollarSign, ArrowRight, CheckCircle2, AlertCircle, ShieldCheck } from 'lucide-react'
import type { PathwayMatch } from '@/lib/types'

interface PathwayMatchCardProps {
  pathway: PathwayMatch
  rank: number
  isSelected: boolean
  onSelect: () => void
}

const difficultyConfig = {
  Easy: { bg: 'bg-[#E1F5EE]', text: 'text-[#1D9E75]', border: 'border-[#1D9E75]/20' },
  Medium: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  Complex: { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200' },
}

const scoreColor = (score: number) => {
  if (score >= 80) return { stroke: '#1D9E75', text: 'text-[#1D9E75]' }
  if (score >= 60) return { stroke: '#F59E0B', text: 'text-amber-600' }
  return { stroke: '#EF4444', text: 'text-red-500' }
}

function ScoreRing({ score }: { score: number }) {
  const r = 28
  const circumference = 2 * Math.PI * r
  const { stroke, text } = scoreColor(score)

  return (
    <div className="relative flex items-center justify-center w-20 h-20 flex-shrink-0">
      <svg width="80" height="80" className="-rotate-90">
        <circle cx="40" cy="40" r={r} fill="none" stroke="#F5F5F5" strokeWidth="5" />
        <motion.circle
          cx="40"
          cy="40"
          r={r}
          fill="none"
          stroke={stroke}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference - (score / 100) * circumference }}
          transition={{ duration: 1.2, ease: 'easeOut', delay: 0.2 }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          className={`text-lg font-bold leading-none ${text}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          {score}%
        </motion.span>
        <span className="text-[9px] text-[#A3A3A3] mt-0.5">match</span>
      </div>
    </div>
  )
}

export function PathwayMatchCard({ pathway, rank, isSelected, onSelect }: PathwayMatchCardProps) {
  const diff = difficultyConfig[pathway.difficulty]

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: rank * 0.1 }}
      whileHover={{ y: -2 }}
      onClick={onSelect}
      className={`relative cursor-pointer rounded-[16px] border transition-all duration-200 ${
        pathway.isVerified
          ? isSelected
            ? 'border-[#1D9E75] shadow-[0_0_0_3px_rgba(29,158,117,0.12),0_4px_20px_rgba(29,158,117,0.12)] bg-white'
            : 'border-[#1D9E75]/40 bg-white hover:border-[#1D9E75] hover:shadow-[0_2px_12px_rgba(29,158,117,0.08)]'
          : isSelected
            ? 'border-[#534AB7] shadow-[0_0_0_3px_rgba(83,74,183,0.12),0_4px_20px_rgba(83,74,183,0.12)] bg-white'
            : 'border-[#E5E5E5] bg-white hover:border-[#534AB7]/40 hover:shadow-[0_2px_12px_rgba(0,0,0,0.06)]'
      }`}
    >
      {/* Verified pathway banner */}
      {pathway.isVerified && (
        <div className="flex items-center gap-1.5 px-5 py-2 bg-[#E1F5EE] rounded-t-[15px] border-b border-[#1D9E75]/20">
          <ShieldCheck size={12} className="text-[#1D9E75] flex-shrink-0" />
          <span className="text-[10px] font-semibold text-[#1D9E75] uppercase tracking-wide">
            Verified Immigration Pathway
          </span>
          {rank === 0 && (
            <span className="ml-auto text-[10px] font-semibold text-[#1D9E75]">Best match</span>
          )}
        </div>
      )}

      <div className="p-5">

      {/* Rank badge (non-verified cards only) */}
      {rank === 0 && !pathway.isVerified && (
        <div className="absolute -top-2.5 left-4 px-2.5 py-0.5 bg-[#534AB7] rounded-full text-[10px] font-semibold text-white">
          Best match
        </div>
      )}

      <div className="flex items-start gap-4">
        {/* Left: info */}
        <div className="flex-1 min-w-0">
          {/* Header row */}
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">{pathway.flag}</span>
            <div className="min-w-0">
              <h3 className="font-semibold text-[#171717] text-[14px] leading-tight truncate">
                {pathway.name}
              </h3>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[11px] text-[#A3A3A3]">{pathway.category}</span>
                <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium border ${diff.bg} ${diff.text} ${diff.border}`}>
                  {pathway.difficulty}
                </span>
              </div>
            </div>
          </div>

          {/* Timeline + fee */}
          <div className="flex items-center gap-3 text-[11px] text-[#A3A3A3] mt-2 mb-3">
            <span className="flex items-center gap-1">
              <Clock size={10} />
              {pathway.estimatedTimeline}
            </span>
            <span className="flex items-center gap-1">
              <DollarSign size={10} />
              {pathway.processingFeeRange}
            </span>
          </div>

          {/* Match reasons */}
          <ul className="space-y-1 mb-3">
            {pathway.matchReasons.slice(0, 3).map((r, i) => (
              <li key={i} className="flex items-start gap-1.5 text-[11px] text-[#525252]">
                <CheckCircle2 size={11} className="text-[#1D9E75] mt-0.5 flex-shrink-0" />
                {r}
              </li>
            ))}
          </ul>

          {/* Key requirements */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {pathway.requirements.slice(0, 3).map((req, i) => (
              <span
                key={i}
                className="inline-flex items-center px-2 py-0.5 bg-[#F5F5F5] rounded-full text-[10px] text-[#525252]"
              >
                {req}
              </span>
            ))}
          </div>

          {/* Next step */}
          <div className="flex items-start gap-1.5 p-2.5 bg-[#EEEDFE] rounded-[8px]">
            <AlertCircle size={11} className="text-[#534AB7] mt-0.5 flex-shrink-0" />
            <p className="text-[11px] text-[#534AB7] font-medium leading-tight">{pathway.nextStep}</p>
          </div>
        </div>

        {/* Right: score ring + CTA */}
        <div className="flex flex-col items-center gap-3 flex-shrink-0">
          <ScoreRing score={pathway.matchScore} />

          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={(e) => { e.stopPropagation(); onSelect() }}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-medium transition-colors ${
              isSelected
                ? 'bg-[#534AB7] text-white'
                : 'bg-[#F5F5F5] text-[#525252] hover:bg-[#EEEDFE] hover:text-[#534AB7]'
            }`}
          >
            {isSelected ? 'Selected' : 'View plan'} <ArrowRight size={10} />
          </motion.button>

          {pathway.officialUrl && (
            <a
              href={pathway.officialUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1 text-[10px] text-[#A3A3A3] hover:text-[#534AB7] transition-colors"
            >
              IRCC <ExternalLink size={9} />
            </a>
          )}
        </div>
      </div>

      {/* Source citations footer */}
      {pathway.sources.length > 0 && (
        <div className="mt-3 pt-3 border-t border-[#F5F5F5] flex flex-wrap gap-1.5">
          {pathway.sources.slice(0, 3).map((s, i) => (
            <a
              key={i}
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#FAFAFA] border border-[#E5E5E5] rounded-full text-[10px] text-[#737373] hover:text-[#534AB7] hover:border-[#534AB7]/30 transition-colors"
            >
              <ExternalLink size={8} />
              {s.title}
            </a>
          ))}
        </div>
      )}
      </div>
    </motion.div>
  )
}
