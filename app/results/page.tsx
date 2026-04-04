'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Sparkles, RefreshCw, ArrowLeft, ExternalLink, AlertTriangle } from 'lucide-react'
import type { PathwaysProfile } from '@/types/voice'
import type { RecommendationsResult } from '@/lib/types'
import { PathwayMatchCard } from '@/components/results/PathwayMatchCard'
import { PersonalizedRoadmap } from '@/components/results/PersonalizedRoadmap'
import { AuthNav } from '@/components/auth/AuthNav'
import { PageSurface } from '@/components/ui/PageSurface'
import { savePathwaysProfileToSupabase } from '@/lib/supabase/savePathwaysProfile'
import { createClient } from '@/lib/supabase/client'

const PROFILE_KEY = process.env.NEXT_PUBLIC_PROFILE_KEY ?? 'pathways_profile'

function isLessThan24HoursOld(createdAt: string): boolean {
  return Date.now() - new Date(createdAt).getTime() < 24 * 60 * 60 * 1000
}

function LoadingState() {
  const steps = [
    'Reading your profile...',
    'Searching IRCC database...',
    'Analyzing eligibility...',
    'Building your roadmap...',
  ]
  const [stepIndex, setStepIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setStepIndex((i) => Math.min(i + 1, steps.length - 1))
    }, 1800)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="flex flex-col items-center justify-center h-full gap-8 px-6">
      {/* Animated orb */}
      <div className="relative w-24 h-24">
        <motion.div
          className="absolute inset-0 rounded-full bg-[#534AB7]/10"
          animate={{ scale: [1, 1.3, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute inset-3 rounded-full bg-[#534AB7]/20"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
        />
        <div className="absolute inset-6 rounded-full bg-[#534AB7] flex items-center justify-center">
          <Sparkles size={18} className="text-white" />
        </div>
      </div>

      <div className="text-center">
        <h2 className="text-[18px] font-semibold text-[#171717] mb-2">Analyzing your profile</h2>
        <AnimatePresence mode="wait">
          <motion.p
            key={stepIndex}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.3 }}
            className="text-[14px] text-[#737373]"
          >
            {steps[stepIndex]}
          </motion.p>
        </AnimatePresence>
      </div>

      {/* Progress dots */}
      <div className="flex items-center gap-2">
        {steps.map((_, i) => (
          <motion.div
            key={i}
            className={`rounded-full transition-all duration-500 ${
              i <= stepIndex ? 'w-6 h-1.5 bg-[#534AB7]' : 'w-1.5 h-1.5 bg-[var(--ui-border-strong)]'
            }`}
          />
        ))}
      </div>
    </div>
  )
}

function ErrorState({ onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 px-6 text-center">
      <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
        <AlertTriangle size={20} className="text-red-500" />
      </div>
      <div>
        <h2 className="text-[16px] font-semibold text-[#171717] mb-1">Could not load recommendations</h2>
        <p className="text-[13px] text-[#737373]">We couldn&apos;t load your results. Please refresh the page or try again in a moment.</p>
      </div>
      <button
        onClick={onRetry}
        className="flex items-center gap-2 px-4 py-2 bg-[#534AB7] text-white text-sm font-medium rounded-full hover:bg-[#3C3489] transition-colors"
      >
        <RefreshCw size={13} /> Try again
      </button>
    </div>
  )
}

export default function ResultsPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Partial<PathwaysProfile> | null>(null)
  const [result, setResult] = useState<RecommendationsResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedPathwayId, setSelectedPathwayId] = useState<string | null>(null)

  const loadProfile = useCallback((): Partial<PathwaysProfile> | null => {
    try {
      const raw = localStorage.getItem(PROFILE_KEY)
      if (!raw) return null
      return JSON.parse(raw) as Partial<PathwaysProfile>
    } catch {
      return null
    }
  }, [])

  const fetchRecommendations = useCallback(async (p: Partial<PathwaysProfile>, force = false) => {
    setLoading(true)
    setError(null)

    let supabaseProfileId: string | null = null

    // Check Supabase cache (or fetch profileId for saving after pipeline)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        const { data: dbProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('user_id', user.id)
          .single()

        if (dbProfile) {
          supabaseProfileId = dbProfile.id

          if (!force) {
            const { data: existing } = await supabase
              .from('recommendations')
              .select('result, created_at')
              .eq('profile_id', dbProfile.id)
              .order('created_at', { ascending: false })
              .limit(1)
              .single()

            // Only use the cached row if it is a RAG result (has profileSummary).
            // The deterministic scorer (/api/recommendations/generate) inserts rows with
            // a different shape (ScoringResult) — those must not be used here.
            const isRagResult = !!(existing?.result as Record<string, unknown> | null)?.profileSummary
            if (existing && isRagResult && isLessThan24HoursOld(existing.created_at as string)) {
              const cached = existing.result as RecommendationsResult
              setResult(cached)
              setSelectedPathwayId(cached.topPathwayId ?? cached.pathways?.[0]?.id ?? null)
              setLoading(false)
              return
            }
          }
        }
      }
    } catch {
      // Auth/DB lookup failed — fall through to pipeline
    }

    const requestBody = JSON.stringify({ profile: p })

    try {
      const res = await fetch('/api/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: requestBody,
      })

      const responseText = await res.text()

      if (!res.ok) {
        const errBody = JSON.parse(responseText.trim() || '{}') as { error?: string }
        throw new Error(errBody.error ?? `Request failed: ${res.status}`)
      }

      const data = JSON.parse(responseText) as RecommendationsResult & { error?: string }
      if (data.error) throw new Error(data.error)

      // Persist to Supabase
      if (supabaseProfileId) {
        try {
          const supabase = createClient()
          await supabase
            .from('recommendations')
            .insert({ profile_id: supabaseProfileId, result: data })
        } catch {
          // Best-effort; don't fail if save fails
        }
      }

      setResult(data)
      setSelectedPathwayId(data.topPathwayId ?? data.pathways?.[0]?.id ?? null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const p = loadProfile()
    if (!p) {
      setError('No profile found. Please complete onboarding first.')
      setLoading(false)
      return
    }
    setProfile(p)
    // Sync localStorage profile to Supabase in the background (backfills if onboarding
    // completed before the profile save was working, and keeps data current).
    void savePathwaysProfileToSupabase(p).catch(() => { /* best-effort */ })
    fetchRecommendations(p)
  }, [loadProfile, fetchRecommendations])

  const selectedPathway = result?.pathways?.find((p) => p.id === selectedPathwayId) ?? result?.pathways?.[0] ?? null
  const roadmapSteps = result?.roadmap ?? []

  return (
    <PageSurface surface="flow" fixed>
      <div className="flex-shrink-0 border-b border-[var(--ui-border)] bg-[var(--ui-panel)]/88 backdrop-blur-md px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/onboarding')}
            className="flex items-center gap-1.5 text-[12px] text-[#A3A3A3] hover:text-[#171717] transition-colors"
          >
            <ArrowLeft size={14} /> Back
          </button>
          <Link
            href="/"
            className="text-[14px] font-semibold text-[#171717] hover:text-[#534AB7] transition-colors"
          >
            Pathways
          </Link>
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          {result && (
            <span className="text-[11px] text-[#A3A3A3]">
              Based on {(result.sources ?? []).length} official IRCC sources
            </span>
          )}
          {profile && !loading && (
            <button
              onClick={() => fetchRecommendations(profile, true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] text-[#534AB7] hover:bg-[#EEEDFE] rounded-full transition-colors"
            >
              <RefreshCw size={11} /> Refresh
            </button>
          )}
          <AuthNav />
        </div>
      </div>

      {/* Main body */}
      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div key="loading" className="h-full" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <LoadingState />
            </motion.div>
          ) : error ? (
            <motion.div key="error" className="h-full" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <ErrorState
                message={error}
                onRetry={() => {
                  if (profile) fetchRecommendations(profile, true)
                  else router.push('/onboarding')
                }}
              />
            </motion.div>
          ) : result ? (
            <motion.div
              key="results"
              className="h-full flex flex-col lg:flex-row gap-0 overflow-y-auto lg:overflow-hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
            >
              {/* Left panel — pathway cards */}
              <div className="flex-1 overflow-y-auto px-6 py-6 min-w-0">
                {/* Profile summary */}
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className="mb-6"
                >
                  <h1 className="text-[22px] font-bold text-[#171717] leading-tight mb-1.5">
                    Your Immigration Pathways
                  </h1>
                  <p className="text-[13px] text-[#737373] leading-relaxed max-w-xl">
                    {result.profileSummary}
                  </p>
                </motion.div>

                {/* Pathway match cards */}
                <div className="mb-2">
                  <h2 className="text-[11px] font-semibold text-[#A3A3A3] uppercase tracking-wider mb-3">
                    Top Matches — {(result.pathways ?? []).length} pathways
                  </h2>
                  <div className="space-y-4">
                    {(result.pathways ?? []).map((pathway, i) => (
                      <PathwayMatchCard
                        key={pathway.id}
                        pathway={pathway}
                        rank={i}
                        isSelected={selectedPathwayId === pathway.id}
                        onSelect={() => setSelectedPathwayId(pathway.id)}
                      />
                    ))}
                  </div>
                </div>

                {/* Sources section */}
                {(result.sources ?? []).length > 0 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="mt-8 pt-6 border-t border-[#E5E5E5]"
                  >
                    <h2 className="text-[11px] font-semibold text-[#A3A3A3] uppercase tracking-wider mb-3">
                      Official Sources
                    </h2>
                    <div className="flex flex-wrap gap-2">
                      {(result.sources ?? []).map((s, i) => (
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
                  </motion.div>
                )}
              </div>

              {/* Right panel — roadmap */}
              <div className="w-full lg:w-80 lg:flex-shrink-0 border-t lg:border-t-0 lg:border-l border-[var(--ui-border)] overflow-y-auto bg-[var(--ui-panel)]/95 backdrop-blur-sm px-4 py-6">
                {selectedPathway && roadmapSteps.length > 0 ? (
                  <motion.div
                    key={selectedPathwayId}
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <PersonalizedRoadmap
                      steps={roadmapSteps}
                      pathwayName={selectedPathway.name}
                    />

                    {/* CTA */}
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                      className="mt-4"
                    >
                      <button
                        onClick={() => router.push(`/dashboard?pathway=${encodeURIComponent(selectedPathwayId ?? '')}`)}
                        className="w-full flex items-center justify-center gap-2 py-3 bg-[#534AB7] text-white text-[13px] font-semibold rounded-[12px] hover:bg-[#3C3489] transition-colors"
                      >
                        <Sparkles size={14} />
                        Start my application
                      </button>
                      <p className="text-center text-[10px] text-[#A3A3A3] mt-2">
                        AI-assisted document checklist & timeline
                      </p>
                    </motion.div>
                  </motion.div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center gap-3 py-12">
                    <div className="w-10 h-10 rounded-full bg-[#F5F5F5] flex items-center justify-center">
                      <Sparkles size={16} className="text-[#A3A3A3]" />
                    </div>
                    <p className="text-[12px] text-[#A3A3A3]">Select a pathway to see your personalized roadmap</p>
                  </div>
                )}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </PageSurface>
  )
}
