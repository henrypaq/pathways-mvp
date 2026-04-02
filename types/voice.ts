export type OrbState = 'idle' | 'listening' | 'thinking' | 'speaking'

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
    scores?: {
      listening: number
      reading: number
      writing: number
      speaking: number
    }
    selfAssessment?: 'native' | 'fluent' | 'intermediate' | 'basic'
  } | null
  years_of_experience?: '0' | '1' | '2' | '3' | '4' | '5+' | null
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
}
