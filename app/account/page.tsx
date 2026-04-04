'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Calendar, Mail, User, ArrowRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { SignOutButton } from '@/components/auth/SignOutButton'
import { AccountBackButton } from '@/components/account/AccountBackButton'
import { StartOverButton } from '@/app/dashboard/StartOverButton'
import { PageSurface } from '@/components/ui/PageSurface'
import { ProfilePreferredLanguage } from '@/app/dashboard/profile/ProfilePreferredLanguage'
import { useI18n } from '@/context/I18nContext'
import type { PathwaysProfile } from '@/types/voice'

type UserMeta = {
  fullName: string | null
  avatar: string | null
  email: string
  created: string
}

export default function AccountPage() {
  const { t } = useI18n()
  const router = useRouter()
  const [meta, setMeta] = useState<UserMeta | null>(null)
  const [continueHref, setContinueHref] = useState('/onboarding')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login?next=/account')
        return
      }

      const userMeta = user.user_metadata as Record<string, unknown>
      const fullName =
        (typeof userMeta.full_name === 'string' && userMeta.full_name) ||
        (typeof userMeta.name === 'string' && userMeta.name) ||
        null
      const avatar = typeof userMeta.avatar_url === 'string' ? userMeta.avatar_url : null
      const created = user.created_at
        ? new Date(user.created_at).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })
        : '—'

      setMeta({ fullName, avatar, email: user.email ?? '', created })

      const { data: profileRow } = await supabase
        .from('profiles')
        .select('completeness_score, data')
        .eq('user_id', user.id)
        .single()

      const completenessScore: number = profileRow?.completeness_score ?? 0
      const profileData = profileRow?.data as Partial<PathwaysProfile> | null
      const hasOnboardingDone = !!(profileData as Record<string, unknown> | null)?.onboarding_complete
      const isComplete = completenessScore >= 0.5 || hasOnboardingDone
      setContinueHref(isComplete ? '/dashboard' : '/onboarding')
      setLoading(false)
    }

    void load()
  }, [router])

  if (loading || !meta) {
    return (
      <PageSurface surface="flow" fixed>
        <header className="flex-shrink-0 flex items-center gap-3 border-b border-[var(--ui-border)] bg-[var(--ui-panel)]/88 backdrop-blur-md px-4 py-3 sm:px-6">
          <AccountBackButton />
          <h1 className="text-[15px] font-semibold tracking-tight text-[#171717]">
            {t('account.title')}
          </h1>
        </header>
        <main className="flex-1 flex items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#534AB7] border-t-transparent" />
        </main>
      </PageSurface>
    )
  }

  return (
    <PageSurface surface="flow" fixed>
      <header className="flex-shrink-0 flex items-center gap-3 border-b border-[var(--ui-border)] bg-[var(--ui-panel)]/88 backdrop-blur-md px-4 py-3 sm:px-6">
        <AccountBackButton />
        <h1 className="text-[15px] font-semibold tracking-tight text-[#171717]">
          {t('account.title')}
        </h1>
      </header>

      <main className="flex-1 overflow-y-auto px-5 py-8 sm:px-8 sm:py-10">
        <div className="mx-auto max-w-md">
          <div className="mb-8 flex flex-col items-center text-center">
            {meta.avatar ? (
              <Image
                src={meta.avatar}
                alt=""
                width={72}
                height={72}
                unoptimized
                className="mb-4 h-[72px] w-[72px] rounded-full object-cover ring-2 ring-[#F5F5F5]"
              />
            ) : (
              <div className="mb-4 flex h-[72px] w-[72px] items-center justify-center rounded-full bg-[#EEEDFE] text-[#534AB7]">
                <User size={32} strokeWidth={1.5} />
              </div>
            )}
            <p className="text-lg font-semibold text-[#171717]">
              {meta.fullName || t('account.defaultName')}
            </p>
            <p className="mt-0.5 text-sm text-[#737373]">{meta.email}</p>
          </div>

          <div className="space-y-0 rounded-[14px] border border-[var(--ui-border-strong)] bg-[var(--ui-panel)] divide-y divide-[var(--ui-border)] mb-8 shadow-sm">
            <div className="flex items-start gap-3 px-4 py-4">
              <Mail size={18} className="text-[#A3A3A3] mt-0.5 shrink-0" strokeWidth={1.75} />
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-[#A3A3A3] mb-0.5">
                  {t('account.email')}
                </p>
                <p className="text-sm text-[#171717] break-all">{meta.email}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 px-4 py-4">
              <Calendar size={18} className="text-[#A3A3A3] mt-0.5 shrink-0" strokeWidth={1.75} />
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wide text-[#A3A3A3] mb-0.5">
                  {t('account.memberSince')}
                </p>
                <p className="text-sm text-[#171717]">{meta.created}</p>
              </div>
            </div>
          </div>

          <div className="mb-8">
            <ProfilePreferredLanguage />
          </div>

          <div className="space-y-3">
            <Link
              href={continueHref}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-[#534AB7] py-3.5 text-sm font-medium text-white shadow-lg shadow-[#534AB7]/15 hover:bg-[#3C3489] transition-colors"
            >
              {t('account.continueJourney')}
              <ArrowRight size={16} />
            </Link>
            <SignOutButton />
            <div className="rounded-[14px] border border-[var(--ui-border)] bg-[var(--ui-panel)] px-4 py-4">
              <p className="text-[11px] font-medium uppercase tracking-wide text-[#A3A3A3] mb-2">
                {t('account.resetTitle')}
              </p>
              <p className="text-[12px] text-[#737373] leading-snug mb-3">
                {t('account.resetDesc')}
              </p>
              <StartOverButton />
            </div>
          </div>

          <p className="mt-10 text-center text-[11px] leading-relaxed text-[#A3A3A3]">
            {t('account.savedNote')}
          </p>
        </div>
      </main>
    </PageSurface>
  )
}
