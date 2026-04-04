import { createClient as createServerSupabaseClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { mergeProfileData } from '@/lib/profileDataMerge'

/**
 * POST /api/profile/preferences
 * Body: { preferredLanguage: 'en' | 'fr' }
 *
 * Merges preferred_language into profiles.data without wiping onboarding fields.
 */
export async function POST(request: Request): Promise<Response> {
  let preferredLanguage: unknown
  try {
    const body = await request.json()
    preferredLanguage = body.preferredLanguage
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (preferredLanguage !== 'en' && preferredLanguage !== 'fr') {
    return Response.json({ error: 'preferredLanguage must be en or fr' }, { status: 400 })
  }

  const serverClient = await createServerSupabaseClient()
  const { data: { user }, error: authError } = await serverClient.auth.getUser()

  if (authError || !user) {
    return Response.json({ error: 'Not authenticated' }, { status: 401 })
  }

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
    : serverClient

  const { data: row, error: selectError } = await adminClient
    .from('profiles')
    .select('data, completeness_score')
    .eq('user_id', user.id)
    .maybeSingle()

  if (selectError) {
    console.error('[profile/preferences] select error:', selectError.message)
    return Response.json({ error: selectError.message }, { status: 500 })
  }

  const merged = mergeProfileData(row?.data as Record<string, unknown>, {
    preferred_language: preferredLanguage,
  })

  const completeness_score = row?.completeness_score ?? 0

  if (!row) {
    const { error: insertError } = await adminClient
      .from('profiles')
      .insert({
        user_id: user.id,
        data: merged,
        completeness_score: 0,
      })
    if (insertError) {
      console.error('[profile/preferences] insert error:', insertError.message)
      return Response.json({ error: insertError.message }, { status: 500 })
    }
  } else {
    const { error: updateError } = await adminClient
      .from('profiles')
      .update({ data: merged, completeness_score })
      .eq('user_id', user.id)
    if (updateError) {
      console.error('[profile/preferences] update error:', updateError.message)
      return Response.json({ error: updateError.message }, { status: 500 })
    }
  }

  return Response.json({ ok: true })
}
