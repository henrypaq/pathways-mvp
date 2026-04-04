import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { scoreAllPathways } from '@/lib/scoring/pathwayScorer'
import { mapProfileToScorer } from '@/lib/scoring/mapProfileToScorer'

export async function POST(): Promise<NextResponse> {
  try {
    // Initialize the server-side Supabase client (rehydrates session from request cookies)
    const supabase = await createClient()

    // Authenticate via Supabase cookie-based session — same pattern as account/page.tsx
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch the user's most recent profile from Supabase
    // profiles has no unique constraint on user_id, so we take the latest row
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, data')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (profileError) {
      console.error('[generate] profile fetch error:', profileError)
      return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 })
    }

    if (!profile) {
      return NextResponse.json({ error: 'No profile found' }, { status: 404 })
    }

    // Map the JSONB blob (Partial<PathwaysProfile>) to UserProfile expected by the scorer
    const mappedProfile = mapProfileToScorer(
      profile.data as Record<string, unknown>
    )

    // Run the deterministic scoring engine
    const result = scoreAllPathways(mappedProfile, profile.id as string)

    // Persist the scoring result to the recommendations table.
    // recommendations has no unique constraint on profile_id (see migration), so INSERT only.
    const { error: insertError } = await supabase
      .from('recommendations')
      .insert({ profile_id: profile.id, result })

    if (insertError) {
      // Log but do not fail the HTTP request — the caller still receives the scored result
      console.error('[generate] recommendations insert error:', insertError)
    }

    return NextResponse.json(result)
  } catch (err) {
    console.error('[generate] unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
