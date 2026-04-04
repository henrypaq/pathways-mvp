import { createClient as createServerSupabaseClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { mergeProfileData } from '@/lib/profileDataMerge'
import type { PathwaysProfile } from '@/types/voice'

function calculateCompleteness(profile: Partial<PathwaysProfile>): number {
  const fields: (keyof PathwaysProfile)[] = [
    'nationality',
    'destination_country',
    'purpose',
    'occupation',
    'timeline',
    'family_situation',
  ]
  const hasLanguage = Boolean(profile.language_scores || profile.language_test)
  const presentCount = fields.filter(
    (f) => profile[f] != null && profile[f] !== '',
  ).length
  return (presentCount + (hasLanguage ? 1 : 0)) / 7
}

/**
 * POST /api/profile/save
 * Body: { profile: Partial<PathwaysProfile> }
 *
 * Saves the user's profile to public.profiles using the server-side Supabase
 * client (session from cookies) so the save works even when the browser-side
 * auth state is stale. Uses the service role key to bypass RLS.
 */
export async function POST(request: Request): Promise<Response> {
  let profile: Partial<PathwaysProfile>
  try {
    const body = await request.json()
    profile = body.profile ?? {}
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }

  // Identify the user via the server-side Supabase client (reads auth cookies reliably).
  const serverClient = await createServerSupabaseClient()
  const { data: { user }, error: authError } = await serverClient.auth.getUser()

  if (authError || !user) {
    return Response.json({ error: 'Not authenticated' }, { status: 401 })
  }

  // Use service role key (if configured) to write — bypasses RLS so the save
  // works regardless of anon grant configuration in the database.
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ??
    process.env.NEXT_PUBLIC_SUPABASE_PROJECT_URL ??
    ''
  const serviceKey =
    process.env.SUPABASE_SECRET_KEY ??
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    ''

  const adminClient = serviceKey
    ? createClient(supabaseUrl, serviceKey)
    : serverClient  // fall back to session-scoped client

  const { data: existingRow } = await adminClient
    .from('profiles')
    .select('data')
    .eq('user_id', user.id)
    .maybeSingle()

  const mergedData = mergeProfileData(
    existingRow?.data as Record<string, unknown>,
    profile as Record<string, unknown>,
  )
  const completeness_score = calculateCompleteness(mergedData as Partial<PathwaysProfile>)

  const { error: updateError, data: updatedRows } = await adminClient
    .from('profiles')
    .update({ data: mergedData, completeness_score })
    .eq('user_id', user.id)
    .select('id')

  if (updateError) {
    console.error('[profile/save] update error:', updateError.message)
    return Response.json({ error: updateError.message }, { status: 500 })
  }

  if (!updatedRows || updatedRows.length === 0) {
    // Row missing (trigger not applied) — insert as fallback
    const { error: insertError } = await adminClient
      .from('profiles')
      .insert({ user_id: user.id, data: mergedData, completeness_score })
    if (insertError) {
      console.error('[profile/save] insert error:', insertError.message)
      return Response.json({ error: insertError.message }, { status: 500 })
    }
  }

  return Response.json({ ok: true })
}
