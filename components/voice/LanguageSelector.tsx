'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import Select, { type SingleValue } from 'react-select'
import { useLanguage, type Language } from '@/context/LanguageContext'
import {
  LOGIN_LANGUAGE_OPTIONS,
  type LoginLocaleOption,
} from '@/lib/loginLocales'
import { loginLanguageSelectStyles } from '@/lib/loginLanguageSelectStyles'

export function LanguageSelector() {
  const { language, setLanguage, isLanguageLocked } = useLanguage()

  const value = useMemo(
    () => LOGIN_LANGUAGE_OPTIONS.find((o) => o.value === language) ?? null,
    [language],
  )

  function onChange(opt: SingleValue<LoginLocaleOption>) {
    if (opt) setLanguage(opt.value as Language)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.4 }}
      className="mt-6 pt-6 border-t border-neutral-100"
    >
      <p
        className="text-xs text-neutral-400 text-center mb-2"
        style={{ letterSpacing: '0.02em' }}
      >
        {isLanguageLocked ? 'Language selected' : 'Choose your language'}
      </p>

      <Select<LoginLocaleOption, false>
        inputId="voice-language"
        instanceId="voice-language"
        options={LOGIN_LANGUAGE_OPTIONS}
        value={value}
        onChange={onChange}
        isSearchable={false}
        classNamePrefix="voice-lang-select"
        styles={loginLanguageSelectStyles}
        maxMenuHeight={280}
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
        aria-label="Interface language"
      />
    </motion.div>
  )
}
