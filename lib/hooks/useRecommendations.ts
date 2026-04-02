'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { ScoringResult } from '@/lib/scoring/pathwayScorer'

interface UseRecommendationsReturn {
  data: ScoringResult | null
  isLoading: boolean
  error: string | null
  refetch: () => void
}

export function useRecommendations(): UseRecommendationsReturn {
  const [data, setData] = useState<ScoringResult | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      // Use the browser Supabase client — this hook runs in the browser only
      const supabase = createClient()

      // Get the current authenticated session
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        setData(null)
        return
      }

      // Fetch the user's most recent profile ID
      // profiles has no unique constraint on user_id — take the latest row
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (profileError) throw new Error(profileError.message)

      if (!profile) {
        setData(null)
        return
      }

      // Fetch the most recent recommendation for that profile
      const { data: rec, error: recError } = await supabase
        .from('recommendations')
        .select('result, created_at')
        .eq('profile_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (recError) throw new Error(recError.message)

      setData(rec ? (rec.result as ScoringResult) : null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load recommendations')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return { data, isLoading, error, refetch: load }
}
