import type { PreferredLocaleCode } from '@/lib/loginLocales'

export type OrbState = 'idle' | 'listening' | 'thinking' | 'speaking'

/**
 * Stored in profiles.data alongside PathwaysProfile fields.
 * Voice, UI copy, and future localized features should read this.
 */
export type AppProfilePreferences = {
  preferred_language?: PreferredLocaleCode
}

export interface PathwaysProfile {
  // Required
  current_country: string
  nationality: string
  destination_country: string
  purpose: string
  language_ability: string
  timeline: string

  // Optional
  occupation?: string
  is_employed?: boolean
  education_level?: string
  family_situation?: string
  has_job_offer?: boolean
  current_visa_status?: string
  income_savings?: string
  prior_immigration_attempts?: string
  age?: string
  date_of_birth?: string
  destination_region?: string
  field_of_study?: string
  language_scores?: string
  language_test?: {
    taken: 'yes' | 'no' | 'planning'
    testName?: 'IELTS' | 'TEF_Canada' | 'CELPIP' | 'TCF_Canada' | 'other'
    otherTestName?: string
    overallScore?: number
    selfAssessment?: 'native' | 'fluent' | 'intermediate' | 'basic'
  } | null
  years_of_experience?: '0' | '1' | '2' | '3' | '4' | '5+' | null
  /** Simplified NOC TEER proxy: professional/managerial (TEER 0-2), skilled trade/technical (TEER 3), or other/service (TEER 4-5) */
  occupation_skill_level?: 'professional' | 'skilled_trade' | 'other'
  /** Spouse or common-law partner is a Canadian citizen or permanent resident */
  has_canadian_sponsor?: boolean
  /** Parent, sibling, or adult child who is a Canadian citizen or permanent resident */
  has_canadian_relative?: boolean
}

export interface ConversationTurn {
  role: 'user' | 'assistant'
  content: string // cleaned, no PROFILE_DELTA tokens
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string // clean text, no PROFILE_DELTA tokens
  timestamp: number
}

export const REQUIRED_PROFILE_FIELDS: (keyof PathwaysProfile)[] = [
  'current_country',
  'nationality',
  'destination_country',
  'purpose',
  'language_ability',
  'timeline',
]

/**
 * Consolidates flat language test fields emitted by the voice/chat AI
 * (language_test_taken, language_test_name, language_test_score, language_test_self)
 * into the structured language_test nested object expected by PathwaysProfile.
 * Safe to call on every profile update — no-ops if already structured or fields absent.
 */
export function normalizeVoiceProfile(
  profile: Partial<PathwaysProfile>
): Partial<PathwaysProfile> {
  const raw = profile as Record<string, unknown>
  const taken = raw.language_test_taken as string | undefined
  if (!taken) return profile
  // Already structured — don't overwrite with potentially stale flat fields
  if (profile.language_test) return profile

  const consolidated: PathwaysProfile['language_test'] = {
    taken: taken as 'yes' | 'no' | 'planning',
  }
  const testName = raw.language_test_name as string | undefined
  if (testName) {
    consolidated.testName = testName as 'IELTS' | 'TEF_Canada' | 'CELPIP' | 'TCF_Canada' | 'other'
  }
  const score = raw.language_test_score
  if (score != null) {
    const parsed = parseFloat(String(score))
    if (!isNaN(parsed)) consolidated.overallScore = parsed
  }
  const selfAssessment = raw.language_test_self as string | undefined
  if (selfAssessment) {
    consolidated.selfAssessment = selfAssessment as 'native' | 'fluent' | 'intermediate' | 'basic'
  }
  return { ...profile, language_test: consolidated }
}

export const PROFILE_FIELD_LABELS: Record<keyof PathwaysProfile, string> = {
  current_country: 'Current country',
  nationality: 'Nationality',
  destination_country: 'Destination',
  purpose: 'Purpose',
  language_ability: 'Language',
  timeline: 'Timeline',
  occupation: 'Occupation',
  is_employed: 'Currently employed',
  education_level: 'Education',
  family_situation: 'Family',
  has_job_offer: 'Job offer',
  current_visa_status: 'Visa status',
  income_savings: 'Finances',
  prior_immigration_attempts: 'Prior attempts',
  age: 'Age',
  date_of_birth: 'Date of birth',
  destination_region: 'Region preference',
  field_of_study: 'Field of study',
  language_scores: 'Language scores',
  language_test: 'Language test',
  years_of_experience: 'Years of experience',
  occupation_skill_level: 'Occupation skill level',
  has_canadian_sponsor: 'Canadian sponsor (spouse/partner)',
  has_canadian_relative: 'Canadian relative',
}
