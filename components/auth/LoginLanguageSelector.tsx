'use client'

import { useLanguage, type Language } from '@/context/LanguageContext'

const OPTIONS: { value: Language; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'fr', label: 'Français' },
]

/**
 * First step on the login screen: choose app / voice language (saved to profile after sign-in).
 */
export function LoginLanguageSelector() {
  const { language, setLanguage } = useLanguage()

  return (
    <div className="mb-8 pb-8 border-b border-[#F0F0F0]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#A3A3A3] mb-1">
        Language · Langue
      </p>
      <p className="text-[13px] text-[#525252] leading-snug mb-4">
        Pathways uses this for voice recognition and future features in your chosen language.
      </p>
      <div className="flex justify-center">
        <div className="inline-flex w-full max-w-[280px] bg-[#F5F5F5] rounded-full p-1 gap-1">
          {OPTIONS.map(({ value, label }) => {
            const active = language === value
            return (
              <button
                key={value}
                type="button"
                onClick={() => setLanguage(value)}
                className={
                  active
                    ? 'flex-1 bg-[#534AB7] text-white rounded-full py-2.5 text-sm font-medium transition-colors shadow-sm'
                    : 'flex-1 text-[#737373] rounded-full py-2.5 text-sm font-medium hover:text-[#171717] transition-colors'
                }
              >
                {label}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
