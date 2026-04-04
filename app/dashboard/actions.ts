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

  // Delete all documents from Storage + DB
  const { data: docs } = await supabase
    .from('documents')
    .select('file_url')
    .eq('user_id', user.id)

  if (docs && docs.length > 0) {
    const paths = docs.map((d) => d.file_url as string).filter(Boolean)
    if (paths.length > 0) {
      // Storage deletion is best-effort (files may have already been removed)
      await supabase.storage.from('documents').remove(paths)
    }
    await supabase.from('documents').delete().eq('user_id', user.id)
  }

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

  // Fetch cases and documents before deletion (needed for FK-ordered cleanup)
  const { data: userCases } = await supabase
    .from('cases')
    .select('id')
    .eq('user_id', user.id)

  const { data: userDocuments } = await supabase
    .from('documents')
    .select('id, file_url')
    .eq('user_id', user.id)

  if (userDocuments && userDocuments.length > 0) {
    const documentIds = userDocuments.map((d) => d.id)

    await supabase
      .from('document_assessments')
      .delete()
      .in('document_id', documentIds)

    // Best-effort storage cleanup — failure must not block the rest of the wipe
    try {
      for (const doc of userDocuments) {
        if (doc.file_url) {
          await supabase.storage.from('documents').remove([doc.file_url])
        }
      }
    } catch (err) {
      console.error('[startOver] storage cleanup error:', err)
    }
  }

  await supabase
    .from('documents')
    .delete()
    .eq('user_id', user.id)

  await supabase
    .from('cases')
    .delete()
    .eq('user_id', user.id)

  console.log('[startOver] wiped for user:', user.id, {
    recommendationsDeleted: true,
    profileZeroed: true,
    casesDeleted: userCases?.length ?? 0,
    documentsDeleted: userDocuments?.length ?? 0,
    storageFilesAttempted: userDocuments?.length ?? 0,
  })

  revalidatePath('/onboarding')
  return { ok: true }
}
