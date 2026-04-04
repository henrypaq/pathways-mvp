'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

export type StepStatus = 'not_started' | 'in_progress' | 'done'

export async function updateRoadmapStep(stepId: string, status: StepStatus): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, data')
    .eq('user_id', user.id)
    .single()

  if (!profile) return

  const data = (profile.data ?? {}) as Record<string, unknown>
  const currentProgress = (data.roadmap_progress ?? {}) as Record<string, StepStatus>
  const newProgress = { ...currentProgress, [stepId]: status }

  await supabase
    .from('profiles')
    .update({ data: { ...data, roadmap_progress: newProgress } })
    .eq('user_id', user.id)

  revalidatePath('/dashboard')
}

export async function updateSubmissionStep(stepId: string, status: StepStatus): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, data')
    .eq('user_id', user.id)
    .single()

  if (!profile) return

  const data = (profile.data ?? {}) as Record<string, unknown>
  const current = (data.submission_progress ?? {}) as Record<string, StepStatus>
  const updated = { ...current, [stepId]: status }

  await supabase
    .from('profiles')
    .update({ data: { ...data, submission_progress: updated } })
    .eq('user_id', user.id)

  revalidatePath('/dashboard')
}

export async function startOver(): Promise<{ ok: boolean }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Look up the profile row so we can delete its recommendations
  const { data: profileRow } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (profileRow) {
    await supabase
      .from('recommendations')
      .delete()
      .eq('profile_id', profileRow.id)
  }

  await supabase
    .from('profiles')
    .update({ completeness_score: 0, data: {} })
    .eq('user_id', user.id)

  revalidatePath('/onboarding')
  return { ok: true }
}
