'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Check, ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useOnboardingStore } from '@/lib/onboardingStore'
import type { PathwaysProfile } from '@/types/voice'
import { CountrySelect } from '@/components/ui/CountrySelect'
import { DateOfBirthPicker } from '@/components/ui/DateOfBirthPicker'

const PROFILE_KEY = process.env.NEXT_PUBLIC_PROFILE_KEY ?? 'pathways_profile'
const ONBOARDING_DONE_KEY = process.env.NEXT_PUBLIC_ONBOARDING_DONE_KEY ?? 'pathways_onboarding_complete'

const PURPOSE_OPTIONS = ['Work', 'Study', 'Family', 'Asylum', 'Lifestyle'] as const
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
  // Optional
  occupation: string
  is_employed: string
  education_level: string
  family_situation: string
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
  occupation: '',
  is_employed: '',
  education_level: '',
  family_situation: '',
  has_job_offer: '',
  current_visa_status: '',
}

function readStoredProfile(): Partial<PathwaysProfile> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(PROFILE_KEY)
    return raw ? (JSON.parse(raw) as Partial<PathwaysProfile>) : {}
  } catch {
    return {}
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
  placeholder?: string
}

function SelectInput({ value, onChange, options, placeholder }: SelectInputProps) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={selectClass}>
      <option value="">{placeholder ?? 'Select…'}</option>
      {options.map((o) => (
        <option key={o} value={o}>{o}</option>
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

// ── Main component ───────────────────────────────────────────────────────────

export function ManualProfileForm() {
  const { prevStep } = useOnboardingStore()
  const router = useRouter()
  const [values, setValues] = useState<FormValues>(EMPTY)
  const [showOptional, setShowOptional] = useState(false)
  const [saved, setSaved] = useState(false)

  // Pre-fill from any existing localStorage data
  useEffect(() => {
    const stored = readStoredProfile()
    setValues((prev) => ({
      ...prev,
      current_country: String(stored.current_country ?? ''),
      nationality: String(stored.nationality ?? ''),
      destination_country: String(stored.destination_country ?? ''),
      date_of_birth: String(stored.date_of_birth ?? ''),
      purpose: String(stored.purpose ?? ''),
      language_ability: String(stored.language_ability ?? ''),
      timeline: String(stored.timeline ?? ''),
      occupation: String(stored.occupation ?? ''),
      is_employed: stored.is_employed === true ? 'yes' : stored.is_employed === false ? 'no' : '',
      education_level: String(stored.education_level ?? ''),
      family_situation: String(stored.family_situation ?? ''),
      has_job_offer: stored.has_job_offer === true ? 'yes' : stored.has_job_offer === false ? 'no' : '',
      current_visa_status: String(stored.current_visa_status ?? ''),
    }))
  }, [])

  const set = (field: keyof FormValues) => (v: string) =>
    setValues((prev) => ({ ...prev, [field]: v }))

  const isValid =
    values.current_country &&
    values.nationality &&
    values.destination_country &&
    values.purpose &&
    values.language_ability &&
    values.timeline

  const handleSubmit = (e: React.FormEvent) => {
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
    if (values.occupation.trim()) profile.occupation = values.occupation.trim()
    if (values.is_employed === 'yes') profile.is_employed = true
    if (values.is_employed === 'no') profile.is_employed = false
    if (values.education_level) profile.education_level = values.education_level
    if (values.family_situation) profile.family_situation = values.family_situation
    if (values.has_job_offer === 'yes') profile.has_job_offer = true
    if (values.has_job_offer === 'no') profile.has_job_offer = false
    if (values.current_visa_status.trim()) profile.current_visa_status = values.current_visa_status.trim()

    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile))
    localStorage.setItem(ONBOARDING_DONE_KEY, 'true')

    setSaved(true)
    setTimeout(() => router.push('/results'), 800)
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
          Back
        </button>
      </div>

      {/* Scrollable form */}
      <div className="flex-1 overflow-y-auto px-6 pb-8">
        <div className="max-w-lg mx-auto">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-[#171717]">Your immigration profile</h2>
            <p className="text-sm text-gray-400 mt-1">Fill in the details below and we&apos;ll find your best pathways.</p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Required fields */}
            <Field label="Current country of residence" required>
              <CountrySelect value={values.current_country} onChange={set('current_country')} placeholder="Search country..." />
            </Field>

            <Field label="Nationality / passport country" required>
              <CountrySelect value={values.nationality} onChange={set('nationality')} placeholder="Search country..." />
            </Field>

            <Field label="Date of birth">
              <DateOfBirthPicker value={values.date_of_birth} onChange={set('date_of_birth')} />
            </Field>

            <Field label="Destination country" required>
              <CountrySelect value={values.destination_country} onChange={set('destination_country')} placeholder="Search country..." />
            </Field>

            <Field label="Purpose of move" required>
              <SelectInput value={values.purpose} onChange={set('purpose')} options={PURPOSE_OPTIONS} />
            </Field>

            <Field label="Language ability in destination country" required>
              <SelectInput value={values.language_ability} onChange={set('language_ability')} options={LANGUAGE_OPTIONS} />
            </Field>

            <Field label="Timeline / urgency" required>
              <SelectInput value={values.timeline} onChange={set('timeline')} options={TIMELINE_OPTIONS} />
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
              {showOptional ? 'Hide extra details' : 'Add more details +'}
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
                    <Field label="Occupation / job title">
                      <TextInput value={values.occupation} onChange={set('occupation')} placeholder="e.g. Software Engineer" />
                    </Field>

                    <Field label="Currently employed">
                      <YesNoToggle value={values.is_employed} onChange={set('is_employed')} />
                    </Field>

                    <Field label="Education level">
                      <SelectInput value={values.education_level} onChange={set('education_level')} options={EDUCATION_OPTIONS} />
                    </Field>

                    <Field label="Family situation">
                      <SelectInput value={values.family_situation} onChange={set('family_situation')} options={FAMILY_OPTIONS} />
                    </Field>

                    <Field label="Job offer in destination country">
                      <YesNoToggle value={values.has_job_offer} onChange={set('has_job_offer')} />
                    </Field>

                    <Field label="Current visa / immigration status">
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
                    Profile saved
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
                    Save my profile
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
