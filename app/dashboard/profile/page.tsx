import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AuthNav } from '@/components/auth/AuthNav'
import { StartOverButton } from '../StartOverButton'
import { ProfileEditForm } from './ProfileEditForm'
import { DashboardSubnav } from '@/components/dashboard/DashboardSubnav'
import Link from 'next/link'

export default async function ProfilePage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (!profile) redirect('/onboarding')

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
        <span className="text-[12px] text-[#A3A3A3] truncate">Edit Profile</span>
        <div className="flex items-center gap-3 shrink-0">
          <StartOverButton />
          <AuthNav />
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row overflow-auto lg:overflow-hidden">
        <DashboardSubnav active="profile" />

        {/* Main */}
        <main className="flex-1 overflow-y-auto px-6 py-5">
          <div className="mb-5">
            <h1 className="text-[18px] font-bold text-[#171717]">Edit Profile</h1>
            <p className="text-[12px] text-[#A3A3A3] mt-0.5">
              Keep your profile accurate to get the best pathway recommendations.
            </p>
          </div>
          <ProfileEditForm initialData={(profile.data ?? {}) as Record<string, unknown>} />
        </main>
      </div>
    </div>
  )
}
