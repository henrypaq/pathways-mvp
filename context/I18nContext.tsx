'use client'

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
} from 'react'
import { useLanguage } from '@/context/LanguageContext'
import { getMessageBundle, translate } from '@/lib/i18n/getBundle'
import type { MessageKey } from '@/lib/i18n/messages/en'

type I18nContextValue = {
  t: (key: MessageKey, vars?: Record<string, string>) => string
}

const I18nContext = createContext<I18nContextValue | null>(null)

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const { language } = useLanguage()
  const bundle = useMemo(() => getMessageBundle(language), [language])

  const t = useCallback(
    (key: MessageKey, vars?: Record<string, string>) =>
      translate(bundle, key, vars),
    [bundle],
  )

  const value = useMemo(() => ({ t }), [t])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used inside <I18nProvider>')
  return ctx
}
