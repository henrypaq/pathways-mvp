'use client'

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  isPreferredLocaleCode,
  localeFromNavigatorLanguage,
  type PreferredLocaleCode,
} from '@/lib/loginLocales'

export type Language = PreferredLocaleCode

const STORAGE_KEY = 'pathways_preferred_language'

interface LanguageContextValue {
  language: Language
  setLanguage: (lang: Language) => void
  isLanguageLocked: boolean
  resetLanguage: () => void
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

async function savePreferredLanguageToProfile(lang: Language): Promise<void> {
  try {
    const res = await fetch('/api/profile/preferences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ preferredLanguage: lang }),
    })
    if (!res.ok) {
      console.warn('[LanguageContext] profile preferences save failed:', res.status)
    }
  } catch (e) {
    console.warn('[LanguageContext] profile preferences save error:', e)
  }
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en')
  const [isLanguageLocked, setIsLanguageLocked] = useState(false)

  useEffect(() => {
    let cancelled = false
    const supabase = createClient()

    async function hydrate() {
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        const { data: row } = await supabase
          .from('profiles')
          .select('data')
          .eq('user_id', user.id)
          .maybeSingle()

        const raw = (row?.data as Record<string, unknown> | undefined)?.preferred_language
        const dbLang = typeof raw === 'string' && isPreferredLocaleCode(raw) ? raw : null

        let storedLang: PreferredLocaleCode | null = null
        try {
          const stored = localStorage.getItem(STORAGE_KEY)
          if (stored && isPreferredLocaleCode(stored)) storedLang = stored
        } catch {
          /* ignore */
        }

        // Prefer explicit browser choice (e.g. login page) over DB so sign-in saves the picker value.
        if (storedLang) {
          if (!cancelled) {
            setLanguageState(storedLang)
            setIsLanguageLocked(true)
          }
          if (storedLang !== dbLang) {
            await savePreferredLanguageToProfile(storedLang)
          }
          return
        }

        if (dbLang) {
          if (!cancelled) {
            setLanguageState(dbLang)
            setIsLanguageLocked(true)
            try {
              localStorage.setItem(STORAGE_KEY, dbLang)
            } catch {
              /* ignore */
            }
          }
          return
        }

        // No saved preference yet: keep default English until the user picks in the language select.
        if (!cancelled) setIsLanguageLocked(true)
        return
      }

      try {
        const stored = localStorage.getItem(STORAGE_KEY)
        if (stored && isPreferredLocaleCode(stored)) {
          if (!cancelled) {
            setLanguageState(stored)
            setIsLanguageLocked(true)
          }
        }
        // No localStorage choice yet: default UI + select to English (do not infer from browser).
        if (!cancelled) setIsLanguageLocked(true)
      } catch {
        /* ignore */
      }
    }

    void hydrate()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event !== 'SIGNED_IN' || !session?.user) return
        void (async () => {
          try {
            const stored = localStorage.getItem(STORAGE_KEY)
            if (!stored || !isPreferredLocaleCode(stored)) return
            await savePreferredLanguageToProfile(stored)
          } catch {
            /* ignore */
          }
        })()
      },
    )

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [])

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang)
    setIsLanguageLocked(true)
    try {
      localStorage.setItem(STORAGE_KEY, lang)
    } catch {
      /* ignore */
    }
    void createClient().auth.getUser().then(({ data: { user } }) => {
      if (user) void savePreferredLanguageToProfile(lang)
    })
  }, [])

  const resetLanguage = useCallback(() => {
    let detected: Language = 'en'
    try {
      if (typeof navigator !== 'undefined') {
        const nav = localeFromNavigatorLanguage(navigator.language ?? '')
        if (nav) detected = nav
      }
    } catch {
      /* ignore */
    }
    setLanguageState(detected)
    setIsLanguageLocked(false)
  }, [])

  return (
    <LanguageContext.Provider value={{ language, setLanguage, isLanguageLocked, resetLanguage }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLanguage must be used inside <LanguageProvider>')
  return ctx
}
