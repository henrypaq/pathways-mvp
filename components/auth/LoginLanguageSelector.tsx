'use client'

import { useMemo } from 'react'
import Select, { type SingleValue } from 'react-select'
import { useLanguage, type Language } from '@/context/LanguageContext'
import {
  LOGIN_LANGUAGE_OPTIONS,
  type LoginLocaleOption,
} from '@/lib/loginLocales'
import { loginLanguageSelectStyles } from '@/lib/loginLanguageSelectStyles'
import { useI18n } from '@/context/I18nContext'

export function LoginLanguageSelector() {
  const { t } = useI18n()
  const { language, setLanguage } = useLanguage()

  const value = useMemo(
    () =>
      LOGIN_LANGUAGE_OPTIONS.find((o) => o.value === language) ??
      LOGIN_LANGUAGE_OPTIONS[0],
    [language],
  )

  function onChange(opt: SingleValue<LoginLocaleOption>) {
    if (opt) setLanguage(opt.value as Language)
  }

  return (
    <div className="mb-5 pb-5 border-b border-[#F0F0F0]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#A3A3A3] mb-2">
        {t('login.languageLabel')}
      </p>
      <Select<LoginLocaleOption, false>
        inputId="login-language"
        instanceId="login-language"
        options={LOGIN_LANGUAGE_OPTIONS}
        value={value}
        onChange={onChange}
        isSearchable={false}
        classNamePrefix="login-lang-select"
        styles={loginLanguageSelectStyles}
        maxMenuHeight={360}
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
        aria-label={t('a11y.interfaceLanguage')}
      />
    </div>
  )
}
