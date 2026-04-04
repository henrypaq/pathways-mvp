import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { AuthNav } from '@/components/auth/AuthNav'
import { PageSurface } from '@/components/ui/PageSurface'
import { ApplicationWorkspace } from './ApplicationWorkspace'
import type { PathwaysProfile } from '@/types/voice'
import type { RecommendationsResult, PathwayMatch } from '@/lib/types'
import type { StepStatus } from './actions'

type ProfileData = Partial<PathwaysProfile> & {
  roadmap_progress?: Record<string, StepStatus>
  submission_progress?: Record<string, StepStatus>
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ pathway?: string }>
}) {
  const supabase = await createClient()
  const params = await searchParams
  const requestedPathwayId = params.pathway ?? ''

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (profileError || !profile) redirect('/onboarding')

  const { data: recommendation } = await supabase
    .from('recommendations')
    .select('*')
    .eq('profile_id', profile.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!recommendation) redirect('/results')

  const profileData = (profile.data ?? {}) as ProfileData
  const result = recommendation.result as RecommendationsResult
  const pathways: PathwayMatch[] = result.pathways ?? []

  // Honour the pathway the user selected on the results page.
  // Fall back to topPathwayId, then the first pathway.
  const selectedPathway: PathwayMatch =
    (requestedPathwayId ? pathways.find((p) => p.id === requestedPathwayId) : null)
    ?? pathways.find((p) => p.id === result.topPathwayId)
    ?? pathways[0]

  // Get or create the user's case (needed for document uploads).
  // NOTE: selected_pathway_id is a UUID FK to public.pathways — AI-generated
  // pathway IDs are kebab strings, not UUIDs, so we omit it here.
  let { data: userCase } = await supabase
    .from('cases')
    .select('id')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle()

  if (!userCase) {
    const { data: newCase, error: caseError } = await supabase
      .from('cases')
      .insert({ user_id: user.id, profile_id: profile.id })
      .select('id')
      .single()
    if (caseError) console.error('[dashboard] case insert error:', caseError.message)
    userCase = newCase
  }

  // Fetch existing documents for this user
  const { data: documents } = userCase
    ? await supabase
        .from('documents')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
    : { data: [] }

  const roadmapProgress = profileData.roadmap_progress ?? {}
  const submissionProgress = profileData.submission_progress ?? {}

  if (!selectedPathway) redirect('/results')

  return (
    <PageSurface surface="flow" fixed>
      {/* Top nav */}
      <div className="flex-shrink-0 bg-white border-b border-[#EBEBEB] px-6 py-3 flex items-center justify-between gap-4 shadow-[0_1px_0_rgba(0,0,0,0.04)]">
        <div className="flex flex-col gap-1 min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#A3A3A3]">
            Application building
          </p>
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/results"
              className="flex items-center gap-1.5 text-[12px] text-[#A3A3A3] hover:text-[#171717] transition-colors flex-shrink-0"
            >
              <ArrowLeft size={13} /> Results
            </Link>
            <span className="text-[#E5E5E5] flex-shrink-0">/</span>
            <span className="text-[13px] font-semibold text-[#171717] truncate">
              {selectedPathway.flag} {selectedPathway.name}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <AuthNav />
        </div>
      </div>

      <ApplicationWorkspace
        pathway={selectedPathway}
        roadmapSteps={result.roadmap ?? []}
        roadmapProgress={roadmapProgress}
        submissionProgress={submissionProgress}
        caseId={userCase?.id ?? null}
        userId={user.id}
        initialDocuments={(documents ?? []) as Parameters<typeof ApplicationWorkspace>[0]['initialDocuments']}
        profileData={profileData}
      />
    </PageSurface>
  )
}
