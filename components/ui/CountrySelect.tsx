'use client'

import Select from 'react-select'
import { COUNTRY_OPTIONS } from '@/lib/countries'

interface CountrySelectProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  id?: string
}

export function CountrySelect({
  value,
  onChange,
  placeholder = 'Search country...',
  id,
}: CountrySelectProps) {
  const selected = COUNTRY_OPTIONS.find((o) => o.value === value) ?? null

  return (
    <Select
      inputId={id}
      options={COUNTRY_OPTIONS}
      value={selected}
      onChange={(opt) => onChange(opt?.value ?? '')}
      placeholder={placeholder}
      isSearchable
      classNamePrefix="country-select"
      styles={{
        control: (base, state) => ({
          ...base,
          borderColor: state.isFocused ? '#534AB7' : '#E5E5E5',
          boxShadow: state.isFocused ? '0 0 0 2px rgba(83,74,183,0.12)' : 'none',
          borderRadius: '0.5rem',
          padding: '2px 4px',
          fontSize: '0.875rem',
          backgroundColor: state.isFocused ? '#ffffff' : '#F9F9F9',
          '&:hover': { borderColor: '#534AB7' },
          cursor: 'pointer',
          transition: 'border-color 150ms, box-shadow 150ms, background-color 150ms',
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
          cursor: 'pointer',
          padding: '8px 12px',
        }),
        menu: (base) => ({
          ...base,
          borderRadius: '0.5rem',
          boxShadow: '0 4px 24px rgba(0,0,0,0.10)',
          zIndex: 50,
          border: '1px solid #E5E5E5',
        }),
        placeholder: (base) => ({
          ...base,
          color: '#D1D5DB',
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
      }}
    />
  )
}
