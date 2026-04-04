'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { startOver } from './actions'

const ONBOARDING_DONE_KEY = process.env.NEXT_PUBLIC_ONBOARDING_DONE_KEY ?? 'pathways_onboarding_complete'
const PROFILE_KEY = process.env.NEXT_PUBLIC_PROFILE_KEY ?? 'pathways_profile'
const VOICE_HISTORY_KEY = 'pathways_voice_onboarding_history'

export function StartOverButton() {
  const [isPending, setIsPending] = useState(false)
  const router = useRouter()

  const handleClick = async () => {
    setIsPending(true)
    try {
      await startOver()
      // Clear all onboarding-related client state so hooks start fresh
      try {
        localStorage.removeItem(ONBOARDING_DONE_KEY)
        localStorage.removeItem(PROFILE_KEY)
        sessionStorage.removeItem(VOICE_HISTORY_KEY)
      } catch {
        /* ignore storage errors */
      }
      router.push('/onboarding')
    } finally {
      setIsPending(false)
    }
  }

  return (
    <button
      onClick={() => { void handleClick() }}
      disabled={isPending}
      className="text-[12px] text-[#A3A3A3] hover:text-[#525252] transition-colors px-3 py-1.5 rounded-full hover:bg-[#F5F5F5] disabled:opacity-50"
    >
      {isPending ? 'Resetting...' : 'Start over'}
    </button>
  )
}
