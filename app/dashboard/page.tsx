import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ExternalLink, MapPin, Briefcase, Globe, Clock, Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { AuthNav } from '@/components/auth/AuthNav'
import { StartOverButton } from './StartOverButton'
import { RoadmapChecklist } from './RoadmapChecklist'
import type { PathwaysProfile } from '@/types/voice'
import type { RecommendationsResult, PathwayMatch } from '@/lib/types'
import type { StepStatus } from './actions'

type ProfileData = Partial<PathwaysProfile> & {
  roadmap_progress?: Record<string, StepStatus>
}

const difficultyColors: Record<PathwayMatch['difficulty'], string> = {
  Easy: 'bg-[#DCFCE7] text-[#16A34A]',
  Medium: 'bg-[#FEF9C3] text-[#CA8A04]',
  Complex: 'bg-[#FEE2E2] text-[#DC2626]',
}

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

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
  const topPathway =
    result.pathways.find((p) => p.id === result.topPathwayId) ?? result.pathways[0]
  const roadmapProgress = profileData.roadmap_progress ?? {}

  return (
    <div className="fixed inset-0 bg-[#FAFAFA] flex flex-col">
      {/* Nav */}
      <div className="flex-shrink-0 bg-white border-b border-[#F5F5F5] px-6 py-3 flex items-center justify-between gap-4">
        <Link
          href="/"
          className="text-[14px] font-semibold text-[#171717] hover:text-[#534AB7] transition-colors shrink-0"
        >
          Pathways
        </Link>
        <span className="text-[12px] text-[#A3A3A3] truncate">Application Dashboard</span>
        <div className="flex items-center gap-3 shrink-0">
          <StartOverButton />
          <AuthNav />
        </div>
      </div>

      {/* 3-column body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left sidebar — profile summary */}
        <aside className="w-60 flex-shrink-0 border-r border-[#E5E5E5] overflow-y-auto bg-white px-4 py-5">
          <h2 className="text-[11px] font-semibold text-[#A3A3A3] uppercase tracking-wider mb-4">
            Your Profile
          </h2>

          <div className="space-y-4">
            {profileData.nationality && (
              <ProfileField
                icon={<Globe size={13} className="text-[#534AB7]" />}
                label="Nationality"
                value={profileData.nationality}
              />
            )}
            {profileData.destination_country && (
              <ProfileField
                icon={<MapPin size={13} className="text-[#534AB7]" />}
                label="Destination"
                value={profileData.destination_country}
              />
            )}
            {profileData.purpose && (
              <ProfileField
                icon={<Globe size={13} className="text-[#534AB7]" />}
                label="Purpose"
                value={profileData.purpose}
              />
            )}
            {profileData.occupation && (
              <ProfileField
                icon={<Briefcase size={13} className="text-[#534AB7]" />}
                label="Occupation"
                value={profileData.occupation}
              />
            )}
            {profileData.timeline && (
              <ProfileField
                icon={<Clock size={13} className="text-[#534AB7]" />}
                label="Timeline"
                value={profileData.timeline}
              />
            )}
            {profileData.family_situation && (
              <ProfileField
                icon={<Users size={13} className="text-[#534AB7]" />}
                label="Family"
                value={profileData.family_situation}
              />
            )}
          </div>

          <div className="mt-6 pt-5 border-t border-[#F5F5F5]">
            <Link
              href="/results"
              className="text-[12px] text-[#534AB7] hover:text-[#3C3489] transition-colors"
            >
              View all pathways →
            </Link>
          </div>
        </aside>

        {/* Main — top pathway */}
        <main className="flex-1 overflow-y-auto px-6 py-5 min-w-0">
          {topPathway ? (
            <div>
              {/* Header */}
              <div className="flex items-start gap-3 mb-5">
                <span className="text-3xl leading-none">{topPathway.flag}</span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h1 className="text-[20px] font-bold text-[#171717] leading-tight">
                      {topPathway.name}
                    </h1>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${difficultyColors[topPathway.difficulty]}`}
                    >
                      {topPathway.difficulty}
                    </span>
                  </div>
                  <p className="text-[12px] text-[#A3A3A3]">{topPathway.category}</p>
                </div>
                <div className="ml-auto flex-shrink-0 text-right">
                  <div className="text-[22px] font-bold text-[#534AB7]">
                    {topPathway.matchScore}%
                  </div>
                  <div className="text-[10px] text-[#A3A3A3]">match</div>
                </div>
              </div>

              {/* Meta row */}
              <div className="flex gap-4 mb-5 flex-wrap">
                <MetaBadge label="Timeline" value={topPathway.estimatedTimeline} />
                <MetaBadge label="Fees" value={topPathway.processingFeeRange} />
              </div>

              {/* Why it matches */}
              {topPathway.matchReasons.length > 0 && (
                <Section title="Why you qualify">
                  <ul className="space-y-1.5">
                    {topPathway.matchReasons.map((r, i) => (
                      <li key={i} className="flex items-start gap-2 text-[13px] text-[#525252]">
                        <span className="mt-1 w-1.5 h-1.5 rounded-full bg-[#1D9E75] flex-shrink-0" />
                        {r}
                      </li>
                    ))}
                  </ul>
                </Section>
              )}

              {/* Requirements */}
              {topPathway.requirements.length > 0 && (
                <Section title="Key requirements">
                  <ul className="space-y-1.5">
                    {topPathway.requirements.map((r, i) => (
                      <li key={i} className="flex items-start gap-2 text-[13px] text-[#525252]">
                        <span className="mt-1 w-1.5 h-1.5 rounded-full bg-[#534AB7] flex-shrink-0" />
                        {r}
                      </li>
                    ))}
                  </ul>
                </Section>
              )}

              {/* Next step */}
              <div className="mt-5 p-4 bg-[#EEEDFE] rounded-[12px]">
                <p className="text-[11px] font-semibold text-[#534AB7] uppercase tracking-wider mb-1">
                  Your next step
                </p>
                <p className="text-[13px] text-[#171717]">{topPathway.nextStep}</p>
                {topPathway.officialUrl && (
                  <a
                    href={topPathway.officialUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 mt-2 text-[12px] text-[#534AB7] hover:text-[#3C3489] transition-colors"
                  >
                    Official page <ExternalLink size={10} />
                  </a>
                )}
              </div>

              {/* Sources */}
              {topPathway.sources.length > 0 && (
                <Section title="Sources">
                  <div className="flex flex-wrap gap-2">
                    {topPathway.sources.map((s, i) => (
                      <a
                        key={i}
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#E5E5E5] rounded-full text-[11px] text-[#525252] hover:border-[#534AB7]/40 hover:text-[#534AB7] transition-colors"
                      >
                        <ExternalLink size={9} />
                        {s.title}
                      </a>
                    ))}
                  </div>
                </Section>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-[13px] text-[#A3A3A3]">
              No pathway data available.{' '}
              <Link href="/results" className="text-[#534AB7] ml-1">
                Re-run analysis
              </Link>
            </div>
          )}
        </main>

        {/* Right aside — roadmap checklist */}
        <aside className="w-72 flex-shrink-0 border-l border-[#E5E5E5] overflow-y-auto bg-white px-4 py-5">
          <h2 className="text-[11px] font-semibold text-[#A3A3A3] uppercase tracking-wider mb-1">
            Your Roadmap
          </h2>
          <p className="text-[11px] text-[#A3A3A3] mb-4">Click a step to update its status</p>
          <RoadmapChecklist steps={result.roadmap} initialProgress={roadmapProgress} />
        </aside>
      </div>
    </div>
  )
}

function ProfileField({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="flex items-start gap-2">
      <div className="mt-0.5 flex-shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="text-[10px] text-[#A3A3A3] uppercase tracking-wider">{label}</p>
        <p className="text-[13px] text-[#171717] font-medium truncate">{value}</p>
      </div>
    </div>
  )
}

function MetaBadge({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white border border-[#E5E5E5] rounded-[8px] px-3 py-2">
      <p className="text-[10px] text-[#A3A3A3] uppercase tracking-wider">{label}</p>
      <p className="text-[12px] font-semibold text-[#171717]">{value}</p>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-5">
      <h2 className="text-[11px] font-semibold text-[#A3A3A3] uppercase tracking-wider mb-2.5">
        {title}
      </h2>
      {children}
    </div>
  )
}
