import type { UserProfile, LanguageTest } from './pathwayScorer'

// Mirrors the PathwaysProfile.language_test shape stored in Supabase profiles.data.
type StoredLanguageTest = {
  taken: 'yes' | 'no' | 'planning'
  testName?: 'IELTS' | 'TEF_Canada' | 'CELPIP' | 'TCF_Canada' | 'other'
  otherTestName?: string
  overallScore?: number
  selfAssessment?: 'native' | 'fluent' | 'intermediate' | 'basic'
}

// PURPOSE_OPTIONS in ManualProfileForm: ['Work', 'Study', 'Family', 'Asylum', 'Lifestyle']
function mapPurpose(raw: unknown): UserProfile['purposeOfMove'] {
  const map: Record<string, UserProfile['purposeOfMove']> = {
    Work: 'work',     work: 'work',
    Study: 'study',   study: 'study',
    Family: 'family', family: 'family',
    Asylum: 'asylum', asylum: 'asylum',
    Lifestyle: 'other', other: 'other',
  }
  return map[raw as string] ?? 'other'
}

// LANGUAGE_OPTIONS in ManualProfileForm: ['None', 'Basic', 'Intermediate', 'Fluent', 'Native']
function mapLanguageAbility(raw: unknown): UserProfile['languageAbility'] {
  const map: Record<string, UserProfile['languageAbility']> = {
    Native: 'native',       native: 'native',
    Fluent: 'fluent',       fluent: 'fluent',
    Intermediate: 'intermediate', intermediate: 'intermediate',
    Basic: 'basic',         basic: 'basic',
    None: 'basic',          // 'None' maps to the lowest level
  }
  return map[raw as string] ?? 'basic'
}

// TIMELINE_OPTIONS in ManualProfileForm:
// ['ASAP', 'Within 3 months', 'Within 6 months', 'Within a year', 'Just exploring']
function mapTimeline(raw: unknown): UserProfile['timeline'] {
  const s = (raw as string) ?? ''
  if (s === 'ASAP' || s === 'Within 3 months') return 'urgent'
  if (s === 'Within 6 months' || s === 'Within a year') return 'within_year'
  return 'flexible' // 'Just exploring' and any unknown value
}

// EDUCATION_OPTIONS in ManualProfileForm: ["High school", "Bachelor's", "Master's", "PhD", "Other"]
function mapEducationLevel(raw: unknown): UserProfile['educationLevel'] | undefined {
  const map: Record<string, UserProfile['educationLevel']> = {
    'High school': 'high_school', high_school: 'high_school',
    "Bachelor's":  'bachelor',    bachelor: 'bachelor',
    "Master's":    'master',      master: 'master',
    PhD:           'phd',         phd: 'phd',
    Diploma:       'diploma',     diploma: 'diploma',
  }
  return map[raw as string] // returns undefined for 'Other' and unknown values
}

// FAMILY_OPTIONS in ManualProfileForm: ['Single', 'Married', 'Married with children', 'Single parent']
// Note: hasCanadianSpouseOrPartner and hasCanadianCitizenOrPRRelative are not captured
// by the current onboarding form and remain undefined. These are the hard gates for
// Family Sponsorship scoring — users who genuinely qualify will need a future onboarding step.
function mapFamilySituation(raw: unknown): UserProfile['familySituation'] | undefined {
  const s = raw as string | undefined
  if (!s) return undefined
  const lower = s.toLowerCase()
  if (lower === 'married with children') {
    return { relationshipType: 'spouse', hasDependents: true }
  }
  if (lower === 'married') {
    return { relationshipType: 'spouse', hasDependents: false }
  }
  if (lower === 'single parent') {
    return { hasDependents: true }
  }
  return undefined // 'Single' — no family situation context
}

// Builds a LanguageTest from the flat key-value fields that the voice/chat AI emits
// via PROFILE_DELTA (e.g. language_test_taken, language_test_name, language_test_score,
// language_test_self). Used as a fallback when no structured language_test object is present.
function mapLanguageTestFromFlat(data: Record<string, unknown>): LanguageTest | null {
  const taken = data.language_test_taken as string | undefined
  if (!taken) return null
  const result: LanguageTest = {
    taken: taken as LanguageTest['taken'],
    testName: (data.language_test_name as LanguageTest['testName']) ?? undefined,
    selfAssessment: (data.language_test_self as LanguageTest['selfAssessment']) ?? undefined,
  }
  if (taken === 'yes' && data.language_test_score != null) {
    const parsed = parseFloat(data.language_test_score as string)
    if (!isNaN(parsed)) result.overallScore = parsed
  }
  return result
}

function mapLanguageTest(raw: unknown): LanguageTest | null {
  if (!raw || typeof raw !== 'object') return null
  const stored = raw as StoredLanguageTest

  const result: LanguageTest = {
    taken: stored.taken,
    testName: stored.testName,
    selfAssessment: stored.selfAssessment,
  }

  if (stored.overallScore != null && stored.taken === 'yes') {
    result.overallScore = stored.overallScore
  }

  return result
}

// Maps the JSONB blob stored in profiles.data (a Partial<PathwaysProfile> from types/voice.ts)
// to the UserProfile shape expected by scoreAllPathways().
// Every field is mapped explicitly; missing or unrecognized values fall back to safe defaults.
export function mapProfileToScorer(
  data: Record<string, unknown>
): UserProfile {
  return {
    // Source: profiles.data.current_country — ISO-2 country code, set by CountrySelect
    currentResidence: (data.current_country as string) ?? '',

    // Source: profiles.data.nationality — ISO-2 country code, set by CountrySelect
    nationality: (data.nationality as string) ?? '',

    // Source: profiles.data.date_of_birth — ISO date 'YYYY-MM-DD', set by DateOfBirthPicker.
    // Defaults to '' when absent; age score will fall back to 0 (45_plus bracket).
    dateOfBirth: (data.date_of_birth as string) ?? '',

    // Source: profiles.data.destination_country — ISO-2 country code, set by CountrySelect
    destinationCountry: (data.destination_country as string) || undefined,

    // Source: profiles.data.purpose — one of 'Work'|'Study'|'Family'|'Asylum'|'Lifestyle'
    purposeOfMove: mapPurpose(data.purpose),

    // Source: profiles.data.language_ability — one of 'None'|'Basic'|'Intermediate'|'Fluent'|'Native'
    languageAbility: mapLanguageAbility(data.language_ability),

    // Source: profiles.data.timeline — one of 'ASAP'|'Within 3 months'|'Within 6 months'|'Within a year'|'Just exploring'
    timeline: mapTimeline(data.timeline),

    // Source: profiles.data.occupation — free-text job title from TextInput
    occupation: (data.occupation as string) || undefined,

    // nocTeer is not collected in the current onboarding.
    // isSkilled() falls back to checking occupation string when nocTeer is undefined.
    nocTeer: undefined,

    // Source: profiles.data.is_employed — boolean, set by YesNoToggle
    currentlyEmployed: typeof data.is_employed === 'boolean' ? data.is_employed : undefined,

    // Source: profiles.data.education_level — one of "High school"|"Bachelor's"|"Master's"|"PhD"|"Other"
    educationLevel: mapEducationLevel(data.education_level),

    // Source: profiles.data.family_situation — one of 'Single'|'Married'|'Married with children'|'Single parent'
    familySituation: mapFamilySituation(data.family_situation),

    // Source: profiles.data.has_job_offer — boolean, set by YesNoToggle
    jobOfferInCanada: typeof data.has_job_offer === 'boolean' ? data.has_job_offer : undefined,

    // Source: profiles.data.current_visa_status — free-text from TextInput
    currentVisaStatus: (data.current_visa_status as string) || undefined,

    // Source: profiles.data.language_test — JSONB object written by ManualProfileForm
    // Shape: { taken, testName, overallScore, selfAssessment }
    // Fallback: flat fields language_test_taken/name/score/self written by voice/chat AI
    languageTest: mapLanguageTest(data.language_test) ?? mapLanguageTestFromFlat(data),

    // Source: profiles.data.years_of_experience — one of '0'|'1'|'2'|'3'|'4'|'5+'
    yearsOfExperience: (data.years_of_experience as UserProfile['yearsOfExperience']) ?? null,
  }
}
