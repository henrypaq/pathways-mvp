'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLanguage } from '@/context/LanguageContext'
import { voiceLanguageFromLocale } from '@/lib/voiceLocale'

const WORDS = ['Welcome', 'Bienvenue']
const CYCLE_MS = 1800
const LOCK_FREEZE_MS = 1500

const WORD_FOR_VOICE = { en: 'Welcome', fr: 'Bienvenue' } as const

export function WelcomeAnimation() {
  const { language, isLanguageLocked } = useLanguage()

  // 'cycling' | 'frozen' | 'gone'
  const [phase, setPhase] = useState<'cycling' | 'frozen' | 'gone'>('cycling')
  const [displayWord, setDisplayWord] = useState(WORDS[0])

  const cycleRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const freezeRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Cycling phase — rotate words every CYCLE_MS
  useEffect(() => {
    if (phase !== 'cycling') return
    cycleRef.current = setInterval(() => {
      setDisplayWord((w) => {
        const i = WORDS.indexOf(w)
        const next = (i < 0 ? 0 : i + 1) % WORDS.length
        return WORDS[next]
      })
    }, CYCLE_MS)
    return () => {
      if (cycleRef.current) clearInterval(cycleRef.current)
    }
  }, [phase])

  // When language is locked: stop cycling, freeze on the chosen word, then collapse
  useEffect(() => {
    if (!isLanguageLocked) return

    if (cycleRef.current) clearInterval(cycleRef.current)
    const word = WORD_FOR_VOICE[voiceLanguageFromLocale(language)]
    queueMicrotask(() => {
      setPhase('frozen')
      setDisplayWord(word)
    })

    freezeRef.current = setTimeout(() => {
      setPhase('gone')
    }, LOCK_FREEZE_MS)

    return () => {
      if (freezeRef.current) clearTimeout(freezeRef.current)
    }
  }, [isLanguageLocked, language])

  if (phase === 'gone') return null

  return (
    <motion.div
      animate={phase === 'frozen' ? { opacity: 0, height: 0 } : { opacity: 1 }}
      transition={
        phase === 'frozen'
          ? { duration: 0.6, ease: 'easeInOut', delay: LOCK_FREEZE_MS / 1000 }
          : { duration: 0.3 }
      }
      style={{ overflow: 'hidden', textAlign: 'center' }}
      className="mb-4"
    >
      <AnimatePresence mode="wait">
        <motion.p
          key={displayWord}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="text-2xl md:text-3xl font-light tracking-widest text-center select-none"
          style={{ color: phase === 'frozen' ? '#404040' : '#a3a3a3' }}
        >
          {displayWord}
        </motion.p>
      </AnimatePresence>
    </motion.div>
  )
}
