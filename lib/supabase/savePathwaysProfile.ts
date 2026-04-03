'use client'

import { createClient } from '@/lib/supabase/client'
import type { PathwaysProfile } from '@/types/voice'

let warnedMissingSession = false

/**
 * Persist onboarding profile for the signed-in user. Uses upsert because
 * public.profiles already has one row per user (trigger on auth.users).
 * Call after each turn with new PROFILE_DELTA data (incremental) and again at completion.
 */
export async function savePathwaysProfileToSupabase(
  profile: Partial<PathwaysProfile>,
): Promise<void> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    if (process.env.NODE_ENV === 'development' && !warnedMissingSession) {
      warnedMissingSession = true
      console.warn(
        '[savePathwaysProfileToSupabase] Skipped: no Supabase session. Sign in to persist profile to the database.',
      )
    }
    return
  }

  // UPDATE the existing row created by the signup trigger.
  // Avoids relying on onConflict (which needs a unique index that may not exist in all envs).
  const { error: updateError, data: updatedRows } = await supabase
    .from('profiles')
    .update({ data: profile })
    .eq('user_id', user.id)
    .select('id')

  if (updateError) {
    console.error('[savePathwaysProfileToSupabase] update error:', updateError.message)
    throw updateError
  }

  // Row didn't exist (e.g. trigger not applied) — insert as fallback
  if (!updatedRows || updatedRows.length === 0) {
    const { error: insertError } = await supabase
      .from('profiles')
      .insert({ user_id: user.id, data: profile })
    if (insertError) {
      console.error('[savePathwaysProfileToSupabase] insert error:', insertError.message)
      throw insertError
    }
  }
}
