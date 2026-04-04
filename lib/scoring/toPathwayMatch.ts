// lib/scoring/toPathwayMatch.ts
// Converts deterministic PathwayResult objects → PathwayMatch objects
// that the results page and PathwayMatchCard component can render directly.

import type { PathwayResult, ScoringResult } from './pathwayScorer'
import type { PathwayMatch } from '@/lib/types'

/** Shown when Express Entry is listed but CLB / official test targets are not yet met */
const EE_LANGUAGE_IMPROVEMENT_TIP =
  'Stronger official test scores (IELTS General, CELPIP-G, TEF Canada, or TCF Canada — often CLB 7+ in all skills for the Federal Skilled Worker stream) can significantly improve your CRS and Express Entry competitiveness.'

const PATHWAY_META: Record<string, {
  category: string
  estimatedTimeline: string
  processingFeeRange: string
  difficulty: 'Easy' | 'Medium' | 'Complex'
  officialUrl: string
}> = {
  CA_EXPRESS_ENTRY: {
    category: 'Permanent Residence',
    estimatedTimeline: '~6 months',
    processingFeeRange: '$1,365 CAD',
    difficulty: 'Complex',
    officialUrl: 'https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry.html',
  },
  CA_PNP_ONTARIO: {
    category: 'Permanent Residence',
    estimatedTimeline: '15–19 months',
    processingFeeRange: '$1,500–$2,000 CAD',
    difficulty: 'Complex',
    officialUrl: 'https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/provincial-nominees.html',
  },
  CA_FAMILY_SPONSORSHIP: {
    category: 'Permanent Residence',
    estimatedTimeline: '12–24 months',
    processingFeeRange: '$1,080 CAD',
    difficulty: 'Medium',
    officialUrl: 'https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/family-sponsorship.html',
  },
}

function toPathwayMatch(r: PathwayResult): PathwayMatch {
  const langReq = r.requirementScores.find((s) => s.requirementKey === 'EE_LANGUAGE')
  const pathwayTips: string[] | undefined =
    r.pathwayCode === 'CA_EXPRESS_ENTRY' && langReq && !langReq.isMet
      ? [EE_LANGUAGE_IMPROVEMENT_TIP]
      : undefined

  const meta = PATHWAY_META[r.pathwayCode] ?? {
    category: 'Immigration Pathway',
    estimatedTimeline: 'Varies',
    processingFeeRange: 'Varies',
    difficulty: 'Complex' as const,
    officialUrl: 'https://www.canada.ca/en/immigration-refugees-citizenship.html',
  }

  // Match reasons = met requirements (shown as positives)
  const matchReasons = r.requirementScores
    .filter(s => s.isMet)
    .slice(0, 3)
    .map(s => s.label)
  if (matchReasons.length === 0) {
    matchReasons.push(`${r.percentage}% match based on your profile`)
  }

  // Requirements list = all scored requirements, gaps annotated
  const requirements = r.requirementScores.slice(0, 4).map(s =>
    s.isMet ? s.label : `${s.label}${s.gap ? ` — ${s.gap}` : ''}`
  )

  const nextStep =
    r.pathwayCode === 'CA_EXPRESS_ENTRY' && langReq && !langReq.isMet
      ? 'Plan an official English or French test (IELTS General or CELPIP-G for English) and aim for CLB 7 or higher in each skill to strengthen your Express Entry profile.'
      : r.topGaps[0] ?? 'Review your eligibility and submit an Express Entry profile'

  return {
    id: r.pathwayCode.toLowerCase().replace(/_/g, '-'),
    name: r.pathwayName,
    category: meta.category,
    flag: '🇨🇦',
    matchScore: r.percentage,
    matchReasons,
    requirements,
    estimatedTimeline: meta.estimatedTimeline,
    processingFeeRange: meta.processingFeeRange,
    difficulty: meta.difficulty,
    nextStep,
    officialUrl: meta.officialUrl,
    sources: [],
    isVerified: true,
    pathwayTips,
  }
}

/**
 * Convert a ScoringResult into PathwayMatch objects ready for the results UI.
 * By default: pathways must pass hard gates and score at least `minScore`.
 * Express Entry is always included so users see the route with gaps/tips (e.g. language tests).
 */
export function scorerToPathwayMatches(
  scoring: ScoringResult,
  minScore = 40,
): PathwayMatch[] {
  return scoring.pathways
    .filter((r) => {
      if (r.pathwayCode === 'CA_EXPRESS_ENTRY') return true
      return !r.hardGateFailed && r.percentage >= minScore
    })
    .sort((a, b) => b.percentage - a.percentage)
    .map(toPathwayMatch)
}
