'use client'

import { createClient } from '@/lib/supabase/client'
import type { PathwaysProfile } from '@/types/voice'

/**
 * Persist onboarding profile for the signed-in user. Uses upsert because
 * public.profiles already has one row per user (trigger on auth.users).
 */
export async function savePathwaysProfileToSupabase(
  profile: Partial<PathwaysProfile>,
): Promise<void> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  const { error } = await supabase.from('profiles').upsert(
    { user_id: user.id, data: profile },
    { onConflict: 'user_id' },
  )
  if (error) {
    console.error('[savePathwaysProfileToSupabase]', error.message)
    throw error
  }
}
