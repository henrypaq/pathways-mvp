'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface ProfileEditData {
  nationality?: string
  current_country?: string
  destination_country?: string
  purpose?: string
  timeline?: string
  occupation?: string
  education_level?: string
  years_of_experience?: string
  employer_country?: string
  language_scores?: {
    english_test?: string
    english_score?: string
    french_test?: string
    french_score?: string
    other_language?: string
  }
  marital_status?: string
  has_dependants?: boolean
  number_of_dependants?: number | null
  spouse_will_accompany?: boolean
}

function calculateCompleteness(data: ProfileEditData): number {
  const fields: unknown[] = [
    data.nationality,
    data.current_country,
    data.destination_country,
    data.purpose,
    data.timeline,
    data.occupation,
    data.education_level,
    data.years_of_experience,
    data.employer_country,
    data.marital_status,
  ]
  const filled = fields.filter((v) => v !== undefined && v !== null && v !== '').length
  return Math.round((filled / fields.length) * 100)
}

export async function updateProfile(updatedData: ProfileEditData): Promise<{ error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('data')
    .eq('user_id', user.id)
    .single()

  if (!profile) return { error: 'Profile not found' }

  const existingData = (profile.data ?? {}) as Record<string, unknown>
  const merged = { ...existingData, ...updatedData }

  const { error } = await supabase
    .from('profiles')
    .update({
      data: merged,
      completeness_score: calculateCompleteness(updatedData),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/profile')
  return {}
}
