// lib/scoring/pathwayScorer.ts
// ============================================================
// Deterministic pathway scoring engine for Pathways MVP
// Takes a UserProfile and returns scored results for all 3
// Canadian pathways. Reads requirement weights from the DB
// (seeded) and applies profile fields against scoring tables.
// ============================================================

// ------------------------------------------------------------
// Types
// ------------------------------------------------------------

export type LanguageTest = {
  taken: 'yes' | 'no' | 'planning'
  testName?: 'IELTS' | 'TEF_Canada' | 'CELPIP' | 'TCF_Canada' | 'other'
  overallScore?: number          // single overall score, e.g. 7.5 for IELTS
  selfAssessment?: 'native' | 'fluent' | 'intermediate' | 'basic'
}

export type UserProfile = {
  // Core fields (always collected)
  currentResidence: string          // ISO country code e.g. 'MA'
  nationality: string               // ISO country code
  dateOfBirth: string               // ISO date string 'YYYY-MM-DD'
  destinationCountry?: string       // 'CA' for Canada
  purposeOfMove: 'work' | 'study' | 'family' | 'asylum' | 'other'
  languageAbility: 'native' | 'fluent' | 'intermediate' | 'basic'
  timeline: 'urgent' | 'within_year' | 'flexible'

  // Optional fields
  occupation?: string               // job title free text
  nocTeer?: 0 | 1 | 2 | 3 | 4 | 5 // derived from occupation if possible
  currentlyEmployed?: boolean
  educationLevel?: 'high_school' | 'diploma' | 'bachelor' | 'master' | 'phd'
  familySituation?: {
    hasCanadianSpouseOrPartner?: boolean
    hasCanadianCitizenOrPRRelative?: boolean
    relationshipType?: 'spouse' | 'common_law' | 'dependent_child' | 'parent' | 'other'
    hasDependents?: boolean
  }
  jobOfferInCanada?: boolean
  currentVisaStatus?: string

  // New fields (added in latest onboarding update)
  languageTest?: LanguageTest | null
  yearsOfExperience?: '0' | '1' | '2' | '3' | '4' | '5+' | null
}

export type RequirementScore = {
  requirementKey: string
  label: string
  category: string
  weight: number
  rawScore: number        // 0.0 → 1.0
  weightedScore: number   // rawScore * weight
  isHardGate: boolean
  hardGatePassed: boolean
  isMet: boolean
  gap?: string            // human-readable explanation of what's missing
}

export type PathwayResult = {
  pathwayCode: string
  pathwayName: string
  percentage: number              // 0–100, the headline number shown in UI
  tier: 'strong' | 'borderline' | 'unlikely' | 'ineligible'
  requirementScores: RequirementScore[]
  topGaps: string[]               // top 3 actionable gaps to show user
  bonusApplied: number            // extra % from optional bonuses
  hardGateFailed: boolean         // true = ineligible regardless of score
}

export type ScoringResult = {
  profileId: string
  scoredAt: string                // ISO timestamp
  pathways: PathwayResult[]
  recommendedPathwayCode: string  // highest scoring non-ineligible pathway
}


// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------

function getAgeFromDOB(dob: string): number {
  const birth = new Date(dob)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return age
}

function getAgeBracket(age: number): string {
  if (age < 18) return 'under_18'
  if (age <= 19) return '18_19'
  if (age <= 29) return '20_29'
  if (age <= 34) return '30_34'
  if (age <= 39) return '35_39'
  if (age <= 44) return '40_44'
  return '45_plus'
}

// Map IELTS overall band to approximate CLB level
// Source: IRCC equivalency tables
function ieltsToCLB(score: number): number {
  if (score >= 8.0) return 10
  if (score >= 7.0) return 9
  if (score >= 6.0) return 7  // CLB 7 starts at IELTS 6.0
  if (score >= 5.0) return 5
  return 3
}

// Resolve the effective language score (0.0 → 1.0) from the profile
// Prefers test score over self-assessment when available
function resolveLanguageScore(profile: UserProfile): {
  score: number
  source: 'test' | 'self_assessment'
  meetsClb7: boolean
} {
  const lt = profile.languageTest

  if (lt?.taken === 'yes' && lt.overallScore != null) {
    const clb = ieltsToCLB(lt.overallScore)
    const meetsClb7 = clb >= 7
    // Score scales linearly: CLB 7 = 0.70, CLB 9 = 0.90, CLB 10+ = 1.0
    const score = Math.min(clb / 10, 1.0)
    return { score, source: 'test', meetsClb7 }
  }

  // Fall back to self-assessment (from languageTest or languageAbility field)
  const assessment = lt?.selfAssessment ?? profile.languageAbility
  const map: Record<string, { score: number; meetsClb7: boolean }> = {
    native:       { score: 1.00, meetsClb7: true  },
    fluent:       { score: 0.85, meetsClb7: true  },
    intermediate: { score: 0.50, meetsClb7: false },
    basic:        { score: 0.10, meetsClb7: false },
  }
  return { ...(map[assessment] ?? { score: 0.10, meetsClb7: false }), source: 'self_assessment' }
}

function resolveExperienceScore(
  years: UserProfile['yearsOfExperience'],
  currentlyEmployed?: boolean
): number {
  if (!years) {
    // Fallback: if employed but no years given, assume 1 year
    return currentlyEmployed ? 0.60 : 0.00
  }
  const map: Record<string, number> = {
    '0':  0.00,
    '1':  0.60,
    '2':  0.80,
    '3':  0.90,
    '4':  0.95,
    '5+': 1.00,
  }
  return map[years] ?? 0.00
}

function resolveEducationScore(level?: UserProfile['educationLevel']): number {
  const map: Record<string, number> = {
    high_school: 0.20,
    diploma:     0.50,
    bachelor:    0.80,
    master:      0.95,
    phd:         1.00,
  }
  return level ? (map[level] ?? 0.20) : 0.00
}

function resolveAgeScore(dob: string): number {
  const age = getAgeFromDOB(dob)
  const bracket = getAgeBracket(age)
  const map: Record<string, number> = {
    under_18: 0.00,
    '18_19':  0.70,
    '20_29':  1.00,
    '30_34':  0.85,
    '35_39':  0.65,
    '40_44':  0.35,
    '45_plus': 0.00,
  }
  return map[bracket] ?? 0.00
}

function isSkilled(profile: UserProfile): boolean {
  if (profile.nocTeer != null) return profile.nocTeer <= 3
  // If no NOC, use occupation as a proxy — if they filled it in, assume skilled
  return !!profile.occupation
}

function getTier(percentage: number, hardGateFailed: boolean): PathwayResult['tier'] {
  if (hardGateFailed) return 'ineligible'
  if (percentage >= 75) return 'strong'
  if (percentage >= 50) return 'borderline'
  return 'unlikely'
}


// ------------------------------------------------------------
// Pathway scorers
// ------------------------------------------------------------

function scoreExpressEntry(profile: UserProfile): PathwayResult {
  const requirements: RequirementScore[] = []
  let hardGateFailed = false

  // --- Occupation (weight 0.20) ---
  const occupationScore = isSkilled(profile) ? 1.0 : 0.0
  const occupationMet = occupationScore === 1.0
  if (!occupationMet) hardGateFailed = true
  requirements.push({
    requirementKey: 'EE_SKILLED_OCCUPATION',
    label: 'Skilled occupation (NOC TEER 0–3)',
    category: 'occupation',
    weight: 0.20,
    rawScore: occupationScore,
    weightedScore: occupationScore * 0.20,
    isHardGate: true,
    hardGatePassed: occupationMet,
    isMet: occupationMet,
    gap: occupationMet ? undefined : 'Your occupation must be classified as TEER 0, 1, 2, or 3 to qualify for Express Entry.',
  })

  // --- Work experience (weight 0.20) ---
  const expScore = resolveExperienceScore(profile.yearsOfExperience, profile.currentlyEmployed)
  const expMet = expScore >= 0.60 // at least 1 year
  requirements.push({
    requirementKey: 'EE_WORK_EXPERIENCE',
    label: 'Minimum 1 year skilled work experience',
    category: 'experience',
    weight: 0.20,
    rawScore: expScore,
    weightedScore: expScore * 0.20,
    isHardGate: false,
    hardGatePassed: true,
    isMet: expMet,
    gap: expMet ? undefined : 'Express Entry requires at least 1 year of skilled work experience. More years significantly boost your CRS score.',
  })

  // --- Language (weight 0.25) ---
  const lang = resolveLanguageScore(profile)
  const langMet = lang.meetsClb7
  if (!langMet) hardGateFailed = true
  requirements.push({
    requirementKey: 'EE_LANGUAGE',
    label: 'Language proficiency — CLB 7 minimum',
    category: 'language',
    weight: 0.25,
    rawScore: lang.score,
    weightedScore: lang.score * 0.25,
    isHardGate: true,
    hardGatePassed: langMet,
    isMet: langMet,
    gap: langMet
      ? lang.source === 'self_assessment'
        ? 'Take an official test (IELTS/TEF) to confirm your CLB level and unlock more CRS points.'
        : undefined
      : 'Express Entry requires CLB 7 minimum. Consider taking IELTS or TEF Canada to confirm your level.',
  })

  // --- Education (weight 0.20) ---
  const eduScore = resolveEducationScore(profile.educationLevel)
  const eduMet = eduScore >= 0.50
  requirements.push({
    requirementKey: 'EE_EDUCATION',
    label: 'Post-secondary education credential',
    category: 'education',
    weight: 0.20,
    rawScore: eduScore,
    weightedScore: eduScore * 0.20,
    isHardGate: false,
    hardGatePassed: true,
    isMet: eduMet,
    gap: eduMet ? undefined : 'A post-secondary diploma or degree strengthens your CRS score significantly.',
  })

  // --- Age (weight 0.15) ---
  const ageScore = resolveAgeScore(profile.dateOfBirth)
  requirements.push({
    requirementKey: 'EE_AGE',
    label: 'Age (20–29 optimal)',
    category: 'personal',
    weight: 0.15,
    rawScore: ageScore,
    weightedScore: ageScore * 0.15,
    isHardGate: false,
    hardGatePassed: true,
    isMet: ageScore >= 0.65,
    gap: ageScore < 0.65 ? 'CRS age points decline significantly after 35. Consider applying as soon as possible.' : undefined,
  })

  // --- Job offer bonus (optional, +10% if present) ---
  const hasJobOffer = profile.jobOfferInCanada === true
  const bonus = hasJobOffer ? 10 : 0

  // Weighted sum (all required criteria)
  const baseScore = requirements.reduce((sum, r) => sum + r.weightedScore, 0)
  // baseScore is already 0.0–1.0 weighted sum across weights summing to 1.0
  const percentage = Math.min(Math.round(baseScore * 100) + bonus, 100)

  const topGaps = requirements
    .filter(r => r.gap)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 3)
    .map(r => r.gap!)

  return {
    pathwayCode: 'CA_EXPRESS_ENTRY',
    pathwayName: 'Express Entry — Federal Skilled Worker',
    percentage: hardGateFailed ? Math.min(percentage, 30) : percentage,
    tier: getTier(percentage, hardGateFailed),
    requirementScores: requirements,
    topGaps,
    bonusApplied: bonus,
    hardGateFailed,
  }
}


function scorePNP(profile: UserProfile): PathwayResult {
  const requirements: RequirementScore[] = []
  let hardGateFailed = false

  // --- Occupation (weight 0.30) ---
  const occupationScore = isSkilled(profile) ? 1.0 : 0.0
  const occupationMet = occupationScore === 1.0
  requirements.push({
    requirementKey: 'PNP_SKILLED_OCCUPATION',
    label: 'In-demand occupation for Ontario',
    category: 'occupation',
    weight: 0.30,
    rawScore: occupationScore,
    weightedScore: occupationScore * 0.30,
    isHardGate: false,
    hardGatePassed: true,
    isMet: occupationMet,
    gap: occupationMet ? undefined : 'Ontario PNP prioritizes TEER 0–3 occupations. Check if your role appears on Ontario\'s in-demand list.',
  })

  // --- Language (weight 0.25) ---
  const lang = resolveLanguageScore(profile)
  requirements.push({
    requirementKey: 'PNP_LANGUAGE',
    label: 'Language proficiency — CLB 7 minimum',
    category: 'language',
    weight: 0.25,
    rawScore: lang.score,
    weightedScore: lang.score * 0.25,
    isHardGate: false,
    hardGatePassed: true,
    isMet: lang.meetsClb7,
    gap: lang.meetsClb7
      ? lang.source === 'self_assessment'
        ? 'Taking an official language test would strengthen your PNP application.'
        : undefined
      : 'Most Ontario PNP streams require CLB 7. Improving your language score is the highest-impact action you can take.',
  })

  // --- Work experience (weight 0.15) ---
  const expScore = resolveExperienceScore(profile.yearsOfExperience, profile.currentlyEmployed)
  const expMet = expScore >= 0.60
  requirements.push({
    requirementKey: 'PNP_WORK_EXPERIENCE',
    label: 'Minimum 1 year work experience',
    category: 'experience',
    weight: 0.15,
    rawScore: expScore,
    weightedScore: expScore * 0.15,
    isHardGate: false,
    hardGatePassed: true,
    isMet: expMet,
    gap: expMet ? undefined : 'At least 1 year of relevant experience is expected for most Ontario PNP streams.',
  })

  // --- Job offer (weight 0.20, optional but high impact) ---
  const hasJobOffer = profile.jobOfferInCanada === true
  const jobOfferScore = hasJobOffer ? 1.0 : 0.0
  requirements.push({
    requirementKey: 'PNP_JOB_OFFER',
    label: 'Job offer in Ontario',
    category: 'employment',
    weight: 0.20,
    rawScore: jobOfferScore,
    weightedScore: jobOfferScore * 0.20,
    isHardGate: false,
    hardGatePassed: true,
    isMet: hasJobOffer,
    gap: hasJobOffer ? undefined : 'A job offer from an Ontario employer is not required but significantly boosts your PNP chances.',
  })

  // --- Canadian connection bonus (weight 0.10) ---
  const hasCanadianHistory = profile.currentVisaStatus?.toLowerCase().includes('canada') ?? false
  const connectionScore = hasCanadianHistory ? 1.0 : 0.0
  requirements.push({
    requirementKey: 'PNP_CANADIAN_CONNECTION',
    label: 'Prior Canadian work or study experience',
    category: 'history',
    weight: 0.10,
    rawScore: connectionScore,
    weightedScore: connectionScore * 0.10,
    isHardGate: false,
    hardGatePassed: true,
    isMet: hasCanadianHistory,
    gap: hasCanadianHistory ? undefined : 'Prior experience in Canada (work or study) strengthens provincial ties and PNP applications.',
  })

  const baseScore = requirements.reduce((sum, r) => sum + r.weightedScore, 0)
  const percentage = Math.min(Math.round(baseScore * 100), 100)

  const topGaps = requirements
    .filter(r => r.gap)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 3)
    .map(r => r.gap!)

  return {
    pathwayCode: 'CA_PNP_ONTARIO',
    pathwayName: 'Provincial Nominee Program — Ontario',
    percentage: hardGateFailed ? Math.min(percentage, 30) : percentage,
    tier: getTier(percentage, hardGateFailed),
    requirementScores: requirements,
    topGaps,
    bonusApplied: 0,
    hardGateFailed,
  }
}


function scoreFamilySponsorship(profile: UserProfile): PathwayResult {
  const requirements: RequirementScore[] = []
  let hardGateFailed = false

  // --- Purpose (weight 0.35, hard gate) ---
  const purposeMet = profile.purposeOfMove === 'family'
  if (!purposeMet) hardGateFailed = true
  requirements.push({
    requirementKey: 'FAM_PURPOSE',
    label: 'Purpose of move is family reunification',
    category: 'intent',
    weight: 0.35,
    rawScore: purposeMet ? 1.0 : 0.0,
    weightedScore: purposeMet ? 0.35 : 0.0,
    isHardGate: true,
    hardGatePassed: purposeMet,
    isMet: purposeMet,
    gap: purposeMet ? undefined : 'Family Sponsorship is only available if you are immigrating to join a Canadian citizen or PR family member.',
  })

  // --- Sponsor status (weight 0.40, hard gate) ---
  const hasSponsor = profile.familySituation?.hasCanadianCitizenOrPRRelative === true
    || profile.familySituation?.hasCanadianSpouseOrPartner === true
  if (!hasSponsor) hardGateFailed = true
  requirements.push({
    requirementKey: 'FAM_SPONSOR_STATUS',
    label: 'Sponsor is a Canadian citizen or permanent resident',
    category: 'family',
    weight: 0.40,
    rawScore: hasSponsor ? 1.0 : 0.0,
    weightedScore: hasSponsor ? 0.40 : 0.0,
    isHardGate: true,
    hardGatePassed: hasSponsor,
    isMet: hasSponsor,
    gap: hasSponsor ? undefined : 'You need a Canadian citizen or PR who qualifies as a sponsor (spouse, parent, or close relative).',
  })

  // --- Relationship type (weight 0.25) ---
  const qualifyingRelationships = ['spouse', 'common_law', 'dependent_child']
  const relationshipType = profile.familySituation?.relationshipType
  const relationshipMet = relationshipType != null
    && qualifyingRelationships.includes(relationshipType)
  requirements.push({
    requirementKey: 'FAM_RELATIONSHIP',
    label: 'Qualifying relationship type',
    category: 'family',
    weight: 0.25,
    rawScore: relationshipMet ? 1.0 : 0.0,
    weightedScore: relationshipMet ? 0.25 : 0.0,
    isHardGate: false,
    hardGatePassed: true,
    isMet: relationshipMet,
    gap: relationshipMet ? undefined : 'Eligible relationships are: spouse, common-law partner, or dependent child.',
  })

  const baseScore = requirements.reduce((sum, r) => sum + r.weightedScore, 0)
  const percentage = Math.min(Math.round(baseScore * 100), 100)

  const topGaps = requirements
    .filter(r => r.gap)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 3)
    .map(r => r.gap!)

  return {
    pathwayCode: 'CA_FAMILY_SPONSORSHIP',
    pathwayName: 'Family Sponsorship — Spouse & Dependants',
    percentage: hardGateFailed ? 0 : percentage,
    tier: getTier(percentage, hardGateFailed),
    requirementScores: requirements,
    topGaps,
    bonusApplied: 0,
    hardGateFailed,
  }
}


// ------------------------------------------------------------
// Main export — score all three pathways for a profile
// ------------------------------------------------------------

export function scoreAllPathways(
  profile: UserProfile,
  profileId: string
): ScoringResult {
  const pathways = [
    scoreExpressEntry(profile),
    scorePNP(profile),
    scoreFamilySponsorship(profile),
  ]

  // Recommended = highest percentage among non-ineligible pathways
  const eligible = pathways.filter(p => p.tier !== 'ineligible')
  const recommended = eligible.length > 0
    ? eligible.reduce((a, b) => a.percentage >= b.percentage ? a : b)
    : pathways[0] // fallback

  return {
    profileId,
    scoredAt: new Date().toISOString(),
    pathways,
    recommendedPathwayCode: recommended.pathwayCode,
  }
}
