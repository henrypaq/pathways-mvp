'use client'

import { useState, useTransition } from 'react'
import { updateProfile, type ProfileEditData } from './actions'

function Field({
  label,
  id,
  children,
}: {
  label: string
  id: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-[11px] text-[#A3A3A3] uppercase tracking-wider mb-1.5">
        {label}
      </label>
      {children}
    </div>
  )
}

const inputClass =
  'w-full border border-[#E5E5E5] rounded-[8px] text-[13px] text-[#171717] px-3 py-2 focus:outline-none focus:border-[#534AB7] transition-colors bg-white placeholder:text-[#D4D4D4]'

const selectClass =
  'w-full border border-[#E5E5E5] rounded-[8px] text-[13px] text-[#171717] px-3 py-2 focus:outline-none focus:border-[#534AB7] transition-colors bg-white appearance-none'

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-[#E5E5E5] rounded-[12px] p-5 mb-4">
      <h3 className="text-[11px] font-semibold text-[#A3A3A3] uppercase tracking-wider mb-4">
        {title}
      </h3>
      <div className="space-y-4">{children}</div>
    </div>
  )
}

function Toggle({
  id,
  label,
  checked,
  onChange,
}: {
  id: string
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${checked ? 'bg-[#534AB7]' : 'bg-[#E5E5E5]'}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-5' : ''}`}
      />
    </button>
  )
}

export function ProfileEditForm({ initialData }: { initialData: Record<string, unknown> }) {
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const raw = initialData as Record<string, unknown>
  const initLang =
    raw.language_scores && typeof raw.language_scores === 'object'
      ? (raw.language_scores as Record<string, string>)
      : {}

  const [form, setForm] = useState<ProfileEditData>({
    nationality: (raw.nationality as string) ?? '',
    current_country: (raw.current_country as string) ?? '',
    destination_country: (raw.destination_country as string) ?? '',
    purpose: (raw.purpose as string) ?? '',
    timeline: (raw.timeline as string) ?? '',
    occupation: (raw.occupation as string) ?? '',
    education_level: (raw.education_level as string) ?? '',
    years_of_experience: (raw.years_of_experience as string) ?? '',
    employer_country: (raw.employer_country as string) ?? '',
    language_scores: {
      english_test: initLang.english_test ?? '',
      english_score: initLang.english_score ?? '',
      french_test: initLang.french_test ?? '',
      french_score: initLang.french_score ?? '',
      other_language: initLang.other_language ?? '',
    },
    marital_status: (raw.marital_status as string) ?? '',
    has_dependants: (raw.has_dependants as boolean) ?? false,
    number_of_dependants: (raw.number_of_dependants as number) ?? null,
    spouse_will_accompany: (raw.spouse_will_accompany as boolean) ?? false,
  })

  const [scoreError, setScoreError] = useState<string | null>(null)

  function set<K extends keyof ProfileEditData>(key: K, value: ProfileEditData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
    if (saved) setSaved(false)
  }

  function setLang(key: string, value: string) {
    setForm((prev) => ({
      ...prev,
      language_scores: { ...prev.language_scores, [key]: value },
    }))
    if (saved) setSaved(false)
  }

  const showSpouse =
    form.marital_status === 'Married' || form.marital_status === 'Common-law'

  function validateScore(test: string, score: string): boolean {
    if (!score) return true
    const n = parseFloat(score)
    if (isNaN(n)) return false
    if (test === 'IELTS' || test === 'CELPIP') return n >= 0 && n <= 9
    if (test === 'TOEFL') return n >= 0 && n <= 120
    return true
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setScoreError(null)

    const englishTest = form.language_scores?.english_test ?? ''
    const englishScore = form.language_scores?.english_score ?? ''
    if (!validateScore(englishTest, englishScore)) {
      setScoreError(
        englishTest === 'IELTS' || englishTest === 'CELPIP'
          ? 'Score must be between 0 and 9 for IELTS/CELPIP.'
          : englishTest === 'TOEFL'
          ? 'Score must be between 0 and 120 for TOEFL.'
          : 'Enter a valid numeric score.'
      )
      return
    }

    startTransition(async () => {
      const result = await updateProfile(form)
      if (result.error) {
        setError(result.error)
      } else {
        setSaved(true)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl pb-6">
      <Card title="Personal Information">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Nationality" id="field-nationality">
            <input
              id="field-nationality"
              type="text"
              value={form.nationality ?? ''}
              onChange={(e) => set('nationality', e.target.value)}
              placeholder="e.g. Moroccan, French"
              className={inputClass}
            />
          </Field>
          <Field label="Current Country" id="field-current-country">
            <input
              id="field-current-country"
              type="text"
              value={form.current_country ?? ''}
              onChange={(e) => set('current_country', e.target.value)}
              placeholder="e.g. France"
              className={inputClass}
            />
          </Field>
        </div>

        <Field label="Destination Country" id="field-destination-country">
          <input
            id="field-destination-country"
            type="text"
            value={form.destination_country ?? ''}
            onChange={(e) => set('destination_country', e.target.value)}
            placeholder="e.g. Canada"
            className={inputClass}
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Purpose" id="field-purpose">
            <select
              id="field-purpose"
              value={form.purpose ?? ''}
              onChange={(e) => set('purpose', e.target.value)}
              className={selectClass}
            >
              <option value="">Select purpose</option>
              <option>Work</option>
              <option>Study</option>
              <option>Family Reunification</option>
              <option>Asylum/Refugee</option>
              <option>Retirement</option>
              <option>Digital Nomad</option>
            </select>
          </Field>
          <Field label="Timeline" id="field-timeline">
            <select
              id="field-timeline"
              value={form.timeline ?? ''}
              onChange={(e) => set('timeline', e.target.value)}
              className={selectClass}
            >
              <option value="">Select timeline</option>
              <option>As soon as possible</option>
              <option>Within 6 months</option>
              <option>Within 1 year</option>
              <option>1-2 years</option>
              <option>Just exploring</option>
            </select>
          </Field>
        </div>
      </Card>

      <Card title="Professional Information">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Occupation" id="field-occupation">
            <input
              id="field-occupation"
              type="text"
              value={form.occupation ?? ''}
              onChange={(e) => set('occupation', e.target.value)}
              placeholder="e.g. Software Engineer"
              className={inputClass}
            />
          </Field>
          <Field label="Education Level" id="field-education-level">
            <select
              id="field-education-level"
              value={form.education_level ?? ''}
              onChange={(e) => set('education_level', e.target.value)}
              className={selectClass}
            >
              <option value="">Select level</option>
              <option>High School</option>
              <option>{"Bachelor's"}</option>
              <option>{"Master's"}</option>
              <option>PhD</option>
              <option>Trade/Vocational</option>
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Years of Experience" id="field-years-of-experience">
            <input
              id="field-years-of-experience"
              type="number"
              min={0}
              value={form.years_of_experience ?? ''}
              onChange={(e) => set('years_of_experience', e.target.value)}
              placeholder="e.g. 5"
              className={inputClass}
            />
          </Field>
          <Field label="Employer Country" id="field-employer-country">
            <input
              id="field-employer-country"
              type="text"
              value={form.employer_country ?? ''}
              onChange={(e) => set('employer_country', e.target.value)}
              placeholder="e.g. France"
              className={inputClass}
            />
          </Field>
        </div>
      </Card>

      <Card title="Language Scores">
        <div className="grid grid-cols-2 gap-4">
          <Field label="English Test" id="field-english-test">
            <select
              id="field-english-test"
              value={form.language_scores?.english_test ?? ''}
              onChange={(e) => setLang('english_test', e.target.value)}
              className={selectClass}
            >
              <option value="">Select test</option>
              <option>IELTS</option>
              <option>TOEFL</option>
              <option>CELPIP</option>
              <option>None</option>
            </select>
          </Field>
          <Field label="English Score" id="field-english-score">
            <input
              id="field-english-score"
              type="text"
              value={form.language_scores?.english_score ?? ''}
              onChange={(e) => setLang('english_score', e.target.value)}
              placeholder={
                form.language_scores?.english_test === 'IELTS' || form.language_scores?.english_test === 'CELPIP'
                  ? '0–9'
                  : form.language_scores?.english_test === 'TOEFL'
                  ? '0–120'
                  : 'e.g. 7.5'
              }
              className={inputClass}
            />
          </Field>
        </div>

        {scoreError && (
          <p className="text-[12px] text-[#DC2626]">{scoreError}</p>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Field label="French Test" id="field-french-test">
            <select
              id="field-french-test"
              value={form.language_scores?.french_test ?? ''}
              onChange={(e) => setLang('french_test', e.target.value)}
              className={selectClass}
            >
              <option value="">Select test</option>
              <option>TEF</option>
              <option>TCF</option>
              <option>DELF</option>
              <option>None</option>
            </select>
          </Field>
          <Field label="French Score" id="field-french-score">
            <input
              id="field-french-score"
              type="text"
              value={form.language_scores?.french_score ?? ''}
              onChange={(e) => setLang('french_score', e.target.value)}
              placeholder="e.g. B2"
              className={inputClass}
            />
          </Field>
        </div>

        <Field label="Other Language" id="field-other-language">
          <input
            id="field-other-language"
            type="text"
            value={form.language_scores?.other_language ?? ''}
            onChange={(e) => setLang('other_language', e.target.value)}
            placeholder="e.g. Spanish B2"
            className={inputClass}
          />
        </Field>
      </Card>

      <Card title="Family Situation">
        <Field label="Marital Status" id="field-marital-status">
          <select
            id="field-marital-status"
            value={form.marital_status ?? ''}
            onChange={(e) => set('marital_status', e.target.value)}
            className={selectClass}
          >
            <option value="">Select status</option>
            <option>Single</option>
            <option>Married</option>
            <option>Common-law</option>
            <option>Divorced</option>
            <option>Widowed</option>
          </select>
        </Field>

        <div className="flex items-center justify-between py-1">
          <label htmlFor="toggle-dependants" className="text-[13px] text-[#171717] cursor-pointer">
            Has dependants
          </label>
          <Toggle
            id="toggle-dependants"
            label="Has dependants"
            checked={form.has_dependants ?? false}
            onChange={(v) => set('has_dependants', v)}
          />
        </div>

        {form.has_dependants && (
          <Field label="Number of Dependants" id="field-number-of-dependants">
            <input
              id="field-number-of-dependants"
              type="number"
              min={0}
              value={form.number_of_dependants ?? ''}
              onChange={(e) =>
                set('number_of_dependants', e.target.value ? Number(e.target.value) : null)
              }
              placeholder="e.g. 2"
              className={inputClass}
            />
          </Field>
        )}

        {showSpouse && (
          <div className="flex items-center justify-between py-1">
            <label htmlFor="toggle-spouse" className="text-[13px] text-[#171717] cursor-pointer">
              Spouse will accompany
            </label>
            <Toggle
              id="toggle-spouse"
              label="Spouse will accompany"
              checked={form.spouse_will_accompany ?? false}
              onChange={(v) => set('spouse_will_accompany', v)}
            />
          </div>
        )}
      </Card>

      <div className="mt-2">
        {error && <p className="text-[12px] text-[#DC2626] mb-3">{error}</p>}
        {saved && (
          <p className="text-[12px] text-[#16A34A] mb-3 flex items-center gap-1.5">
            <span>✓</span> Profile saved
          </p>
        )}
        <button
          type="submit"
          disabled={isPending}
          className="w-full bg-[#534AB7] text-white text-[13px] font-semibold py-3 rounded-[10px] hover:bg-[#3C3489] transition-colors disabled:opacity-60"
        >
          {isPending ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </form>
  )
}
