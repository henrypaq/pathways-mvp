'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { startOver } from './actions'
import { useI18n } from '@/context/I18nContext'

const ONBOARDING_DONE_KEY = process.env.NEXT_PUBLIC_ONBOARDING_DONE_KEY ?? 'pathways_onboarding_complete'
const PROFILE_KEY = process.env.NEXT_PUBLIC_PROFILE_KEY ?? 'pathways_profile'
const VOICE_HISTORY_KEY = 'pathways_voice_onboarding_history'
const LANGUAGE_KEY = 'pathways_preferred_language'

export function StartOverButton() {
  const [isPending, setIsPending] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const { t } = useI18n()
  const router = useRouter()

  const handleConfirm = async () => {
    setIsPending(true)
    try {
      await startOver()
      try {
        localStorage.removeItem(ONBOARDING_DONE_KEY)
        localStorage.removeItem(PROFILE_KEY)
        localStorage.removeItem(LANGUAGE_KEY)
        sessionStorage.removeItem(VOICE_HISTORY_KEY)
      } catch {
        /* ignore storage errors */
      }
      router.push('/login?next=/onboarding')
    } finally {
      setIsPending(false)
      setConfirming(false)
    }
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-[12px] text-[#525252]">{t('startover.confirm.title')}</span>
        <button
          onClick={() => { void handleConfirm() }}
          disabled={isPending}
          className="text-[12px] font-medium text-white bg-[#DC2626] hover:bg-[#B91C1C] transition-colors px-3 py-1.5 rounded-full disabled:opacity-50"
        >
          {isPending ? t('startover.loading') : t('startover.confirm.yes')}
        </button>
        <button
          onClick={() => setConfirming(false)}
          disabled={isPending}
          className="text-[12px] text-[#A3A3A3] hover:text-[#525252] transition-colors px-3 py-1.5 rounded-full hover:bg-[#F5F5F5]"
        >
          {t('startover.cancel')}
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="text-[12px] text-[#A3A3A3] hover:text-[#525252] transition-colors px-3 py-1.5 rounded-full hover:bg-[#F5F5F5]"
    >
      {t('startover.button')}
    </button>
  )
}
