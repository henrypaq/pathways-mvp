'use client'

import { useTransition } from 'react'
import { startOver } from './actions'

export function StartOverButton() {
  const [isPending, startTransition] = useTransition()

  return (
    <button
      onClick={() => { startTransition(() => { void startOver() }) }}
      disabled={isPending}
      className="text-[12px] text-[#A3A3A3] hover:text-[#525252] transition-colors px-3 py-1.5 rounded-full hover:bg-[#F5F5F5] disabled:opacity-50"
    >
      {isPending ? 'Resetting...' : 'Start over'}
    </button>
  )
}
