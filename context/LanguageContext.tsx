'use client'

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react'
import { createClient } from '@/lib/supabase/client'

export type Language = 'en' | 'fr'

const STORAGE_KEY = 'pathways_preferred_language'

interface LanguageContextValue {
  language: Language
  setLanguage: (lang: Language) => void
  isLanguageLocked: boolean
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

        const dbLang = (row?.data as Record<string, unknown> | undefined)?.preferred_language
        if (dbLang === 'en' || dbLang === 'fr') {
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

        try {
          const stored = localStorage.getItem(STORAGE_KEY)
          if (stored === 'en' || stored === 'fr') {
            if (!cancelled) {
              setLanguageState(stored)
              setIsLanguageLocked(true)
            }
            await savePreferredLanguageToProfile(stored)
          } else if (typeof navigator !== 'undefined') {
            const detected = navigator.language ?? ''
            if (detected.startsWith('fr') && !cancelled) {
              setLanguageState('fr')
            }
          }
        } catch {
          /* ignore */
        }
        return
      }

      try {
        const stored = localStorage.getItem(STORAGE_KEY)
        if (stored === 'en' || stored === 'fr') {
          if (!cancelled) {
            setLanguageState(stored)
            setIsLanguageLocked(true)
          }
        } else if (typeof navigator !== 'undefined') {
          const detected = navigator.language ?? ''
          if (detected.startsWith('fr') && !cancelled) {
            setLanguageState('fr')
          }
        }
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
            if (stored !== 'en' && stored !== 'fr') return
            const { data: row } = await supabase
              .from('profiles')
              .select('data')
              .eq('user_id', session.user.id)
              .maybeSingle()
            const dbLang = (row?.data as Record<string, unknown> | undefined)?.preferred_language
            if (dbLang === 'en' || dbLang === 'fr') return
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
