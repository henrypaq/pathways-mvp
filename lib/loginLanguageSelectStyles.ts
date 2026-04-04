import type { StylesConfig } from 'react-select'
import type { LoginLocaleOption } from '@/lib/loginLocales'

export const loginLanguageSelectStyles: StylesConfig<LoginLocaleOption, false> = {
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
    cursor: 'pointer',
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
