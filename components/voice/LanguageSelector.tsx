'use client'

import { motion } from 'framer-motion'
import { useLanguage, type Language } from '@/context/LanguageContext'

const OPTIONS: { value: Language; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'fr', label: 'Français' },
]

export function LanguageSelector() {
  const { language, setLanguage, isLanguageLocked } = useLanguage()

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.4 }}
      className="mt-6 pt-6 border-t border-neutral-100"
    >
      {/* Label */}
      <p
        className="text-xs text-neutral-400 text-center mb-2"
        style={{ letterSpacing: '0.02em' }}
      >
        {isLanguageLocked
          ? language === 'fr'
            ? 'Langue sélectionnée'
            : 'Language selected'
          : 'Choose your language · Choisissez votre langue'}
      </p>

      {/* Segmented pill */}
      <div className="flex justify-center">
        <div className="inline-flex bg-neutral-100 rounded-full p-1 gap-1">
          {OPTIONS.map(({ value, label }) => {
            const active = language === value
            return (
              <button
                key={value}
                onClick={() => setLanguage(value)}
                className={
                  active
                    ? 'bg-neutral-900 text-white rounded-full px-4 py-1.5 text-sm font-medium transition-colors'
                    : 'text-neutral-400 px-4 py-1.5 text-sm hover:text-neutral-700 transition-colors'
                }
              >
                {label}
              </button>
            )
          })}
        </div>
      </div>
    </motion.div>
  )
}
