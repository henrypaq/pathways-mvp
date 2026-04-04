'use client'

import { createContext, useContext, useEffect, useState } from 'react'

export type Language = 'en' | 'fr'

interface LanguageContextValue {
  language: Language
  setLanguage: (lang: Language) => void
  isLanguageLocked: boolean
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en')
  const [isLanguageLocked, setIsLanguageLocked] = useState(false)

  // Detect browser language on mount — only applies if user hasn't chosen yet
  useEffect(() => {
    if (typeof navigator !== 'undefined' && !isLanguageLocked) {
      const detected = navigator.language ?? ''
      if (detected.startsWith('fr')) {
        setLanguageState('fr')
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const setLanguage = (lang: Language) => {
    setLanguageState(lang)
    setIsLanguageLocked(true)
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, isLanguageLocked }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLanguage must be used inside <LanguageProvider>')
  return ctx
}
