'use client'

import { useMemo } from 'react'
import Select, { type SingleValue, type StylesConfig } from 'react-select'
import { useLanguage, type Language } from '@/context/LanguageContext'
import {
  LOGIN_LANGUAGE_OPTIONS,
  type LoginLocaleOption,
} from '@/lib/loginLocales'

const selectStyles: StylesConfig<LoginLocaleOption, false> = {
  control: (base, state) => ({
    ...base,
    borderColor: state.isFocused ? '#534AB7' : '#E5E5E5',
    boxShadow: state.isFocused ? '0 0 0 2px rgba(83,74,183,0.12)' : 'none',
    borderRadius: '0.625rem',
    padding: '2px 6px',
    minHeight: '44px',
    fontSize: '0.875rem',
    backgroundColor: '#ffffff',
    '&:hover': { borderColor: '#534AB7' },
    cursor: 'pointer',
    transition: 'border-color 150ms, box-shadow 150ms',
  }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isSelected
      ? '#534AB7'
      : state.isFocused
        ? 'rgba(83,74,183,0.08)'
        : 'white',
    color: state.isSelected ? 'white' : '#171717',
    fontSize: '0.875rem',
    cursor: state.isDisabled ? 'not-allowed' : 'pointer',
    opacity: state.isDisabled ? 0.55 : 1,
    padding: '8px 12px',
  }),
  menu: (base) => ({
    ...base,
    borderRadius: '0.625rem',
    boxShadow: '0 4px 24px rgba(0,0,0,0.10)',
    zIndex: 50,
    border: '1px solid #E5E5E5',
  }),
  menuPortal: (base) => ({ ...base, zIndex: 9999 }),
  menuList: (base) => ({ ...base, padding: '4px' }),
  placeholder: (base) => ({
    ...base,
    color: '#A3A3A3',
    fontSize: '0.875rem',
  }),
  singleValue: (base) => ({
    ...base,
    fontSize: '0.875rem',
    color: '#171717',
  }),
  input: (base) => ({
    ...base,
    fontSize: '0.875rem',
    color: '#171717',
  }),
  indicatorSeparator: () => ({ display: 'none' }),
  dropdownIndicator: (base) => ({
    ...base,
    color: '#9CA3AF',
    padding: '0 4px',
  }),
}

export function LoginLanguageSelector() {
  const { language, setLanguage } = useLanguage()

  const value = useMemo(
    () => LOGIN_LANGUAGE_OPTIONS.find((o) => o.supported && o.value === language) ?? null,
    [language],
  )

  function onChange(opt: SingleValue<LoginLocaleOption>) {
    if (!opt?.supported) return
    const v = opt.value
    if (v === 'en' || v === 'fr') setLanguage(v as Language)
  }

  return (
    <div className="mb-5 pb-5 border-b border-[#F0F0F0]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#A3A3A3] mb-2">
        Language · Langue
      </p>
      <Select<LoginLocaleOption, false>
        inputId="login-language"
        instanceId="login-language"
        options={LOGIN_LANGUAGE_OPTIONS}
        value={value}
        onChange={onChange}
        isOptionDisabled={(o) => !o.supported}
        isSearchable={false}
        classNamePrefix="login-lang-select"
        styles={selectStyles}
        menuPortalTarget={
          typeof document !== 'undefined' ? document.body : null
        }
        menuPosition="fixed"
        formatOptionLabel={(option, { context }) => (
          <span className="flex items-center justify-between gap-2 w-full min-w-0">
            <span className="flex items-center gap-2 min-w-0">
              <span className="shrink-0 text-base" aria-hidden>
                {option.flag}
              </span>
              <span className="truncate">{option.label}</span>
            </span>
            {!option.supported && context === 'menu' && (
              <span className="text-[11px] opacity-80 shrink-0">Soon</span>
            )}
          </span>
        )}
        aria-label="Interface language"
      />
    </div>
  )
}
