'use client'

import type { PathwaysProfile } from '@/types/voice'

/**
 * Persist onboarding profile for the signed-in user.
 *
 * Calls the server-side /api/profile/save route which:
 * - Reads the Supabase session from cookies (more reliable than browser client)
 * - Uses service role key to bypass RLS/grant issues
 *
 * Call after each turn with new PROFILE_DELTA data (incremental) and again at completion.
 * Silently no-ops (logs warning) if not authenticated.
 */
export async function savePathwaysProfileToSupabase(
  profile: Partial<PathwaysProfile>,
): Promise<void> {
  const res = await fetch('/api/profile/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ profile }),
  })

  if (res.status === 401) {
    console.warn('[savePathwaysProfileToSupabase] Skipped: not authenticated. Sign in to persist profile to the database.')
    return
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `Profile save failed: ${res.status}`)
  }
}
