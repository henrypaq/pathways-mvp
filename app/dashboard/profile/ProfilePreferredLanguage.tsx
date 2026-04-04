'use client'

import { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Select, { type SingleValue } from 'react-select'
import { useLanguage, type Language } from '@/context/LanguageContext'
import {
  LOGIN_LANGUAGE_OPTIONS,
  type LoginLocaleOption,
} from '@/lib/loginLocales'
import { loginLanguageSelectStyles } from '@/lib/loginLanguageSelectStyles'

export function ProfilePreferredLanguage() {
  const router = useRouter()
  const { language, setLanguage } = useLanguage()

  const value = useMemo(
    () => LOGIN_LANGUAGE_OPTIONS.find((o) => o.value === language) ?? null,
    [language],
  )

  function onChange(opt: SingleValue<LoginLocaleOption>) {
    if (!opt) return
    setLanguage(opt.value as Language)
    window.setTimeout(() => router.refresh(), 450)
  }

  return (
    <div className="bg-white border border-[#E5E5E5] rounded-[12px] p-5 mb-4">
      <h3 className="text-[11px] font-semibold text-[#A3A3A3] uppercase tracking-wider mb-1">
        App language
      </h3>
      <p className="text-[12px] text-[#737373] mb-3 leading-snug">
        Saved to your profile for voice and upcoming features. English and French are fully
        supported today. Changes apply immediately.
      </p>
      <Select<LoginLocaleOption, false>
        inputId="profile-preferred-language"
        instanceId="profile-preferred-language"
        options={LOGIN_LANGUAGE_OPTIONS}
        value={value}
        onChange={onChange}
        isSearchable={false}
        classNamePrefix="profile-lang-select"
        styles={loginLanguageSelectStyles}
        maxMenuHeight={320}
        menuPortalTarget={
          typeof document !== 'undefined' ? document.body : null
        }
        menuPosition="fixed"
        formatOptionLabel={(option) => (
          <span className="flex items-center gap-2 min-w-0">
            <span className="shrink-0 text-base" aria-hidden>
              {option.flag}
            </span>
            <span className="truncate">{option.label}</span>
          </span>
        )}
        aria-label="Preferred app language"
      />
    </div>
  )
}
