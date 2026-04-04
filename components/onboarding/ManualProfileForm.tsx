'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Check, ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useOnboardingStore } from '@/lib/onboardingStore'
import type { PathwaysProfile } from '@/types/voice'
import { savePathwaysProfileToSupabase } from '@/lib/supabase/savePathwaysProfile'
import { CountrySelect } from '@/components/ui/CountrySelect'
import { DateOfBirthPicker } from '@/components/ui/DateOfBirthPicker'
import { useI18n } from '@/context/I18nContext'

const PROFILE_KEY = process.env.NEXT_PUBLIC_PROFILE_KEY ?? 'pathways_profile'
const ONBOARDING_DONE_KEY = process.env.NEXT_PUBLIC_ONBOARDING_DONE_KEY ?? 'pathways_onboarding_complete'

const PURPOSE_OPTIONS = ['Work', 'Study', 'Family Reunification', 'Asylum/Refugee', 'Retirement', 'Digital Nomad'] as const
const LANGUAGE_OPTIONS = ['None', 'Basic', 'Intermediate', 'Fluent', 'Native'] as const
const TIMELINE_OPTIONS = ['ASAP', 'Within 3 months', 'Within 6 months', 'Within a year', 'Just exploring'] as const
const EDUCATION_OPTIONS = ["High school", "Bachelor's", "Master's", "PhD", "Other"] as const
const FAMILY_OPTIONS = ['Single', 'Married', 'Married with children', 'Single parent'] as const

interface FormValues {
  // Required
  current_country: string   // ISO-2 code e.g. "IN"
  nationality: string       // ISO-2 code e.g. "IN"
  destination_country: string // ISO-2 code e.g. "CA"
  date_of_birth: string     // ISO date "YYYY-MM-DD" or ""
  purpose: string
  language_ability: string
  timeline: string
  // Language test (follows language_ability)
  language_test_taken: string  // '' | 'yes' | 'no' | 'planning'
  language_test_name: string   // '' | 'IELTS' | 'TEF_Canada' | 'CELPIP' | 'TCF_Canada' | 'other'
  language_test_other_name: string
  language_test_overall: string
  language_test_self: string   // '' | 'native' | 'fluent' | 'intermediate' | 'basic'
  // Optional
  occupation: string
  is_employed: string
  years_of_experience: string  // '' | '0' | '1' | '2' | '3' | '4' | '5+'
  occupation_skill_level: string  // '' | 'professional' | 'skilled_trade' | 'other'
  education_level: string
  family_situation: string
  has_canadian_sponsor: string  // '' | 'yes' | 'no'
  has_canadian_relative: string // '' | 'yes' | 'no'
  has_job_offer: string
  current_visa_status: string
}

const EMPTY: FormValues = {
  current_country: '',
  nationality: '',
  destination_country: '',
  date_of_birth: '',
  purpose: '',
  language_ability: '',
  timeline: '',
  language_test_taken: '',
  language_test_name: '',
  language_test_other_name: '',
  language_test_overall: '',
  language_test_self: '',
  occupation: '',
  is_employed: '',
  years_of_experience: '',
  occupation_skill_level: '',
  education_level: '',
  family_situation: '',
  has_canadian_sponsor: '',
  has_canadian_relative: '',
  has_job_offer: '',
  current_visa_status: '',
}

const TEST_NAME_OPTIONS = ['IELTS', 'TEF_Canada', 'CELPIP', 'TCF_Canada', 'other'] as const
const TEST_NAME_LABELS: Record<string, string> = {
  IELTS: 'IELTS',
  TEF_Canada: 'TEF Canada',
  CELPIP: 'CELPIP',
  TCF_Canada: 'TCF Canada',
  other: 'Other',
}
const YEARS_OPTIONS = ['0', '1', '2', '3', '4', '5+'] as const
const SELF_ASSESSMENT_OPTIONS = ['native', 'fluent', 'intermediate', 'basic'] as const

function readStoredProfile(): Partial<PathwaysProfile> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(PROFILE_KEY)
    return raw ? (JSON.parse(raw) as Partial<PathwaysProfile>) : {}
  } catch {
    return {}
  }
}

function formValuesFromStorage(): FormValues {
  const stored = readStoredProfile()
  return {
    ...EMPTY,
    current_country: String(stored.current_country ?? ''),
    nationality: String(stored.nationality ?? ''),
    destination_country: String(stored.destination_country ?? ''),
    date_of_birth: String(stored.date_of_birth ?? ''),
    purpose: String(stored.purpose ?? ''),
    language_ability: String(stored.language_ability ?? ''),
    timeline: String(stored.timeline ?? ''),
    occupation: String(stored.occupation ?? ''),
    is_employed: stored.is_employed === true ? 'yes' : stored.is_employed === false ? 'no' : '',
    language_test_taken: stored.language_test?.taken ?? '',
    language_test_name: stored.language_test?.testName ?? '',
    language_test_other_name: stored.language_test?.otherTestName ?? '',
    language_test_overall: stored.language_test?.overallScore?.toString() ?? '',
    language_test_self: stored.language_test?.selfAssessment ?? '',
    years_of_experience: stored.years_of_experience ?? '',
    occupation_skill_level: stored.occupation_skill_level ?? '',
    education_level: String(stored.education_level ?? ''),
    family_situation: String(stored.family_situation ?? ''),
    has_canadian_sponsor: stored.has_canadian_sponsor === true ? 'yes' : stored.has_canadian_sponsor === false ? 'no' : '',
    has_canadian_relative: stored.has_canadian_relative === true ? 'yes' : stored.has_canadian_relative === false ? 'no' : '',
    has_job_offer: stored.has_job_offer === true ? 'yes' : stored.has_job_offer === false ? 'no' : '',
    current_visa_status: String(stored.current_visa_status ?? ''),
  }
}

// ── Sub-components ──────────────────────────────────────────────────────────

interface FieldProps {
  label: string
  required?: boolean
  children: React.ReactNode
}

function Field({ label, required, children }: FieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
        {label}
        {required && <span className="text-[#534AB7] ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}

const inputClass =
  'w-full px-3 py-2 text-sm text-[#171717] bg-[#F9F9F9] border border-[#E5E5E5] rounded-lg outline-none transition-all duration-150 focus:border-[#534AB7] focus:bg-white focus:ring-2 focus:ring-[#534AB7]/10 placeholder-gray-300'

const selectClass = inputClass + ' cursor-pointer'

interface TextInputProps {
  value: string
  onChange: (v: string) => void
  placeholder?: string
}

function TextInput({ value, onChange, placeholder }: TextInputProps) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder ?? ''}
      className={inputClass}
    />
  )
}

interface SelectInputProps {
  value: string
  onChange: (v: string) => void
  options: readonly string[]
  labels?: Partial<Record<string, string>>
  placeholder?: string
}

function SelectInput({ value, onChange, options, labels, placeholder }: SelectInputProps) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={selectClass}>
      <option value="">{placeholder ?? 'Select…'}</option>
      {options.map((o) => (
        <option key={o} value={o}>{labels?.[o] ?? o}</option>
      ))}
    </select>
  )
}

interface ToggleProps {
  value: string // 'yes' | 'no' | ''
  onChange: (v: string) => void
  yesLabel?: string
  noLabel?: string
}

function YesNoToggle({ value, onChange, yesLabel = 'Yes', noLabel = 'No' }: ToggleProps) {
  return (
    <div className="flex gap-2">
      {(['yes', 'no'] as const).map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={`flex-1 py-2 text-sm rounded-lg border transition-all duration-150 ${
            value === opt
              ? 'bg-[#534AB7] text-white border-[#534AB7]'
              : 'bg-[#F9F9F9] text-gray-500 border-[#E5E5E5] hover:border-[#534AB7] hover:text-[#534AB7]'
          }`}
        >
          {opt === 'yes' ? yesLabel : noLabel}
        </button>
      ))}
    </div>
  )
}

function ThreeWayToggle({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { t } = useI18n()
  const options = [
    { id: 'yes', label: t('form.testTaken.yes') },
    { id: 'no', label: t('form.testTaken.no') },
    { id: 'planning', label: t('form.testTaken.planning') },
  ]
  return (
    <div className="flex gap-2">
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => onChange(opt.id)}
          className={`flex-1 py-2 text-sm rounded-lg border transition-all duration-150 ${
            value === opt.id
              ? 'bg-[#534AB7] text-white border-[#534AB7]'
              : 'bg-[#F9F9F9] text-gray-500 border-[#E5E5E5] hover:border-[#534AB7] hover:text-[#534AB7]'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

function YearsSelector({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { t } = useI18n()
  const yearsLabels: Record<string, string> = {
    '0': t('form.years.lt1'),
    '1': t('form.years.1'),
    '2': t('form.years.2'),
    '3': t('form.years.3'),
    '4': t('form.years.4'),
    '5+': t('form.years.5plus'),
  }
  return (
    <div className="flex flex-wrap gap-2">
      {YEARS_OPTIONS.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={`px-3 py-1.5 text-sm rounded-lg border transition-all duration-150 ${
            value === opt
              ? 'bg-[#534AB7] text-white border-[#534AB7]'
              : 'bg-[#F9F9F9] text-gray-500 border-[#E5E5E5] hover:border-[#534AB7] hover:text-[#534AB7]'
          }`}
        >
          {yearsLabels[opt] ?? opt}
        </button>
      ))}
    </div>
  )
}

// ── Main component ───────────────────────────────────────────────────────────

export function ManualProfileForm() {
  const { prevStep } = useOnboardingStore()
  const { t } = useI18n()
  const router = useRouter()
  const [values, setValues] = useState<FormValues>(() => formValuesFromStorage())
  const [showOptional, setShowOptional] = useState(false)
  const [saved, setSaved] = useState(false)

  const set = (field: keyof FormValues) => (v: string) =>
    setValues((prev) => ({ ...prev, [field]: v }))

  const isValid =
    values.current_country &&
    values.nationality &&
    values.destination_country &&
    values.purpose &&
    values.language_ability &&
    values.timeline

  const purposeLabels: Record<string, string> = {
    Work: t('form.purpose.work'),
    Study: t('form.purpose.study'),
    'Family Reunification': t('form.purpose.family'),
    'Asylum/Refugee': t('form.purpose.asylum'),
    Retirement: t('form.purpose.retirement'),
    'Digital Nomad': t('form.purpose.digitalNomad'),
  }
  const languageLabels: Record<string, string> = {
    None: t('form.language.none'),
    Basic: t('form.language.basic'),
    Intermediate: t('form.language.intermediate'),
    Fluent: t('form.language.fluent'),
    Native: t('form.language.native'),
  }
  const timelineLabels: Record<string, string> = {
    ASAP: t('form.timeline.asap'),
    'Within 3 months': t('form.timeline.3months'),
    'Within 6 months': t('form.timeline.6months'),
    'Within a year': t('form.timeline.1year'),
    'Just exploring': t('form.timeline.exploring'),
  }
  const educationLabels: Record<string, string> = {
    'High school': t('form.edu.highschool'),
    "Bachelor's": t('form.edu.bachelor'),
    "Master's": t('form.edu.master'),
    PhD: t('form.edu.phd'),
    Other: t('form.edu.other'),
  }
  const familyLabels: Record<string, string> = {
    Single: t('form.family.single'),
    Married: t('form.family.married'),
    'Married with children': t('form.family.marriedChildren'),
    'Single parent': t('form.family.singleParent'),
  }
  const skillLevelOptions = [
    { id: 'professional', label: t('form.skillLevel.professional'), hint: t('form.skillLevel.professional.hint') },
    { id: 'skilled_trade', label: t('form.skillLevel.skilled_trade'), hint: t('form.skillLevel.skilled_trade.hint') },
    { id: 'other', label: t('form.skillLevel.other'), hint: t('form.skillLevel.other.hint') },
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValid) return

    const profile: Partial<PathwaysProfile> = {
      current_country: values.current_country,
      nationality: values.nationality,
      destination_country: values.destination_country,
      purpose: values.purpose,
      language_ability: values.language_ability,
      timeline: values.timeline,
    }

    if (values.date_of_birth) profile.date_of_birth = values.date_of_birth

    if (values.language_test_taken === 'yes') {
      profile.language_test = {
        taken: 'yes',
        ...(values.language_test_name ? { testName: values.language_test_name as 'IELTS' | 'TEF_Canada' | 'CELPIP' | 'TCF_Canada' | 'other' } : {}),
        ...(values.language_test_name === 'other' && values.language_test_other_name.trim() ? { otherTestName: values.language_test_other_name.trim() } : {}),
        ...(values.language_test_overall ? { overallScore: Number(values.language_test_overall) } : {}),
      }
    } else if (values.language_test_taken === 'no' || values.language_test_taken === 'planning') {
      profile.language_test = {
        taken: values.language_test_taken,
        ...(values.language_test_self ? { selfAssessment: values.language_test_self as 'native' | 'fluent' | 'intermediate' | 'basic' } : {}),
      }
    }

    if (values.occupation.trim()) profile.occupation = values.occupation.trim()
    if (values.is_employed === 'yes') profile.is_employed = true
    if (values.is_employed === 'no') profile.is_employed = false
    if (values.years_of_experience) profile.years_of_experience = values.years_of_experience as '0' | '1' | '2' | '3' | '4' | '5+'
    if (values.occupation_skill_level) profile.occupation_skill_level = values.occupation_skill_level as 'professional' | 'skilled_trade' | 'other'
    if (values.education_level) profile.education_level = values.education_level
    if (values.family_situation) profile.family_situation = values.family_situation
    if (values.has_canadian_sponsor === 'yes') profile.has_canadian_sponsor = true
    if (values.has_canadian_sponsor === 'no') profile.has_canadian_sponsor = false
    if (values.has_canadian_relative === 'yes') profile.has_canadian_relative = true
    if (values.has_canadian_relative === 'no') profile.has_canadian_relative = false
    if (values.has_job_offer === 'yes') profile.has_job_offer = true
    if (values.has_job_offer === 'no') profile.has_job_offer = false
    if (values.current_visa_status.trim()) profile.current_visa_status = values.current_visa_status.trim()

    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile))
    localStorage.setItem(ONBOARDING_DONE_KEY, 'true')

    // Save profile to Supabase so the scoring engine can retrieve it.
    // Wrapped in try/catch — if the user is not authenticated or the insert fails,
    // the localStorage save above still preserves the profile for the /results page.
    try {
      await savePathwaysProfileToSupabase(profile)
    } catch (err) {
      console.error('Failed to save profile to Supabase:', err)
    }

    // Trigger pathway scoring (fire-and-forget).
    // Runs AFTER the profile insert. Does not block navigation if it fails.
    try {
      await fetch('/api/recommendations/generate', { method: 'POST' })
    } catch (err) {
      console.error('Scoring failed silently:', err)
    }

    setSaved(true)
    router.push('/results')
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Back button */}
      <div className="flex-shrink-0 px-6 pt-5 pb-2">
        <button
          onClick={prevStep}
          className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition-colors"
        >
          <ArrowLeft size={14} />
          {t('form.back')}
        </button>
      </div>

      {/* Scrollable form */}
      <div className="flex-1 overflow-y-auto px-6 pb-8">
        <div className="max-w-lg mx-auto">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-[#171717]">{t('form.title')}</h2>
            <p className="text-sm text-gray-400 mt-1">{t('form.subtitle')}</p>
            <p className="text-sm text-[#737373] mt-2">{t('form.required')}</p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Required fields */}
            <Field label={t('form.field.currentCountry')} required>
              <CountrySelect value={values.current_country} onChange={set('current_country')} placeholder="Search country..." />
            </Field>

            <Field label={t('form.field.nationality')} required>
              <CountrySelect value={values.nationality} onChange={set('nationality')} placeholder="Search country..." />
            </Field>

            <Field label={t('form.field.dob')}>
              <DateOfBirthPicker value={values.date_of_birth} onChange={set('date_of_birth')} />
            </Field>

            <Field label={t('form.field.destination')} required>
              <CountrySelect value={values.destination_country} onChange={set('destination_country')} placeholder="Search country..." />
            </Field>

            <Field label={t('form.field.purpose')} required>
              <SelectInput value={values.purpose} onChange={set('purpose')} options={PURPOSE_OPTIONS} labels={purposeLabels} placeholder={t('form.select')} />
            </Field>

            <Field label={t('form.field.languageAbility')} required>
              <SelectInput value={values.language_ability} onChange={set('language_ability')} options={LANGUAGE_OPTIONS} labels={languageLabels} placeholder={t('form.select')} />
            </Field>

            <Field label={t('form.languageTestTaken')}>
              <ThreeWayToggle value={values.language_test_taken} onChange={set('language_test_taken')} />
            </Field>

            <AnimatePresence initial={false}>
              {values.language_test_taken === 'yes' && (
                <motion.div
                  key="test-yes"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25, ease: 'easeInOut' }}
                  className="overflow-hidden"
                >
                  <div className="flex flex-col gap-4 pt-1 pl-3 border-l-2 border-[#534AB7]/20">
                    <Field label={t('form.field.whichTest')}>
                      <div className="flex flex-wrap gap-2">
                        {TEST_NAME_OPTIONS.map((opt) => (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => set('language_test_name')(opt)}
                            className={`px-3 py-1.5 text-sm rounded-lg border transition-all duration-150 ${
                              values.language_test_name === opt
                                ? 'bg-[#534AB7] text-white border-[#534AB7]'
                                : 'bg-[#F9F9F9] text-gray-500 border-[#E5E5E5] hover:border-[#534AB7] hover:text-[#534AB7]'
                            }`}
                          >
                            {TEST_NAME_LABELS[opt]}
                          </button>
                        ))}
                      </div>
                    </Field>

                    <AnimatePresence initial={false}>
                      {values.language_test_name && (
                        <motion.div
                          key="scores"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2, ease: 'easeInOut' }}
                          className="overflow-hidden"
                        >
                          <div className="flex flex-col gap-3">
                            <AnimatePresence initial={false}>
                              {values.language_test_name === 'other' && (
                                <motion.div
                                  key="other-name"
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  exit={{ opacity: 0, height: 0 }}
                                  transition={{ duration: 0.2, ease: 'easeInOut' }}
                                  className="overflow-hidden"
                                >
                                  <Field label={t('form.field.testName')}>
                                    <input
                                      type="text"
                                      value={values.language_test_other_name}
                                      onChange={(e) => set('language_test_other_name')(e.target.value)}
                                      placeholder="e.g. TOEFL, PTE Academic…"
                                      className={inputClass}
                                    />
                                  </Field>
                                </motion.div>
                              )}
                            </AnimatePresence>
                            <Field label={t('form.field.overallScore')}>
                              <input
                                type="number"
                                step="any"
                                value={values.language_test_overall}
                                onChange={(e) => set('language_test_overall')(e.target.value)}
                                placeholder={
                                  values.language_test_name === 'IELTS' || values.language_test_name === 'CELPIP'
                                    ? 'e.g. 7.5'
                                    : values.language_test_name === 'TEF_Canada' || values.language_test_name === 'TCF_Canada'
                                    ? 'e.g. 450'
                                    : 'Enter your overall score'
                                }
                                className={inputClass}
                              />
                            </Field>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              )}

              {(values.language_test_taken === 'no' || values.language_test_taken === 'planning') && (
                <motion.div
                  key="test-no-planning"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25, ease: 'easeInOut' }}
                  className="overflow-hidden"
                >
                  <div className="pt-1 pl-3 border-l-2 border-[#534AB7]/20">
                    <Field label={t('form.field.languageLevel')}>
                      <div className="flex flex-wrap gap-2">
                        {SELF_ASSESSMENT_OPTIONS.map((opt) => (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => set('language_test_self')(opt)}
                            className={`px-3 py-1.5 text-sm rounded-lg border capitalize transition-all duration-150 ${
                              values.language_test_self === opt
                                ? 'bg-[#534AB7] text-white border-[#534AB7]'
                                : 'bg-[#F9F9F9] text-gray-500 border-[#E5E5E5] hover:border-[#534AB7] hover:text-[#534AB7]'
                            }`}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    </Field>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <Field label={t('form.field.timeline')} required>
              <SelectInput value={values.timeline} onChange={set('timeline')} options={TIMELINE_OPTIONS} labels={timelineLabels} placeholder={t('form.select')} />
            </Field>

            {/* Optional fields toggle */}
            <button
              type="button"
              onClick={() => setShowOptional((s) => !s)}
              className="flex items-center gap-1.5 text-sm text-[#534AB7] hover:opacity-75 transition-opacity self-start mt-1"
            >
              <motion.span
                animate={{ rotate: showOptional ? 180 : 0 }}
                transition={{ duration: 0.2 }}
                style={{ display: 'flex' }}
              >
                <ChevronDown size={15} />
              </motion.span>
              {showOptional ? t('form.hideDetails') : t('form.addDetails')}
            </button>

            <AnimatePresence initial={false}>
              {showOptional && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25, ease: 'easeInOut' }}
                  className="overflow-hidden"
                >
                  <div className="flex flex-col gap-4 pt-1 border-t border-[#F0F0F0]">
                    <Field label={t('form.field.occupation')}>
                      <TextInput value={values.occupation} onChange={set('occupation')} placeholder="e.g. Software Engineer" />
                    </Field>

                    <Field label={t('form.field.employed')}>
                      <YesNoToggle value={values.is_employed} onChange={set('is_employed')} yesLabel={t('form.yes')} noLabel={t('form.no')} />
                    </Field>

                    <AnimatePresence initial={false}>
                      {(values.occupation.trim() || values.is_employed === 'yes') && (
                        <motion.div
                          key="years-exp"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.25, ease: 'easeInOut' }}
                          className="overflow-hidden"
                        >
                          <div className="flex flex-col gap-4">
                            <Field label={t('form.field.experience')}>
                              <YearsSelector value={values.years_of_experience} onChange={set('years_of_experience')} />
                            </Field>
                            <Field label={t('form.field.skillLevel')}>
                              <div className="flex flex-col gap-2">
                                {skillLevelOptions.map((opt) => (
                                  <button
                                    key={opt.id}
                                    type="button"
                                    onClick={() => set('occupation_skill_level')(opt.id)}
                                    className={`flex flex-col items-start px-3 py-2.5 text-sm rounded-lg border transition-all duration-150 text-left ${
                                      values.occupation_skill_level === opt.id
                                        ? 'bg-[#534AB7] text-white border-[#534AB7]'
                                        : 'bg-[#F9F9F9] text-gray-600 border-[#E5E5E5] hover:border-[#534AB7] hover:text-[#534AB7]'
                                    }`}
                                  >
                                    <span className="font-medium">{opt.label}</span>
                                    <span className={`text-xs mt-0.5 ${values.occupation_skill_level === opt.id ? 'text-white/70' : 'text-gray-400'}`}>{opt.hint}</span>
                                  </button>
                                ))}
                              </div>
                            </Field>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <Field label={t('form.field.education')}>
                      <SelectInput value={values.education_level} onChange={set('education_level')} options={EDUCATION_OPTIONS} labels={educationLabels} placeholder={t('form.select')} />
                    </Field>

                    <Field label={t('form.field.family')}>
                      <SelectInput value={values.family_situation} onChange={set('family_situation')} options={FAMILY_OPTIONS} labels={familyLabels} placeholder={t('form.select')} />
                    </Field>

                    <Field label={t('form.field.hasSponsor')}>
                      <YesNoToggle value={values.has_canadian_sponsor} onChange={set('has_canadian_sponsor')} yesLabel={t('form.yes')} noLabel={t('form.no')} />
                    </Field>

                    <Field label={t('form.field.hasRelative')}>
                      <YesNoToggle value={values.has_canadian_relative} onChange={set('has_canadian_relative')} yesLabel={t('form.yes')} noLabel={t('form.no')} />
                    </Field>

                    <Field label={t('form.field.hasJobOffer')}>
                      <YesNoToggle value={values.has_job_offer} onChange={set('has_job_offer')} yesLabel={t('form.yes')} noLabel={t('form.no')} />
                    </Field>

                    <Field label={t('form.field.visaStatus')}>
                      <TextInput value={values.current_visa_status} onChange={set('current_visa_status')} placeholder="e.g. Student visa, tourist visa…" />
                    </Field>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit */}
            <div className="pt-2">
              <AnimatePresence mode="wait">
                {saved ? (
                  <motion.div
                    key="saved"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-green-50 border border-green-200 text-green-700 text-sm font-medium"
                  >
                    <Check size={16} />
                    {t('profile.saved')}
                  </motion.div>
                ) : (
                  <motion.button
                    key="submit"
                    type="submit"
                    disabled={!isValid}
                    whileTap={isValid ? { scale: 0.98 } : undefined}
                    className={`w-full py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                      isValid
                        ? 'bg-[#534AB7] text-white hover:bg-[#3C3489] cursor-pointer'
                        : 'bg-[#E5E5E5] text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    {t('form.submit')}
                  </motion.button>
                )}
              </AnimatePresence>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
