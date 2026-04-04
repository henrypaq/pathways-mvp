import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AuthNav } from '@/components/auth/AuthNav'
import { StartOverButton } from '../StartOverButton'
import { DocumentsManager } from './DocumentsManager'
import { DashboardSubnav } from '@/components/dashboard/DashboardSubnav'
import Link from 'next/link'

export default async function DocumentsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!profile) redirect('/onboarding')

  // Get or create case
  let { data: userCase } = await supabase
    .from('cases')
    .select('id')
    .eq('user_id', user.id)
    .limit(1)
    .single()

  if (!userCase) {
    const { data: newCase } = await supabase
      .from('cases')
      .insert({ user_id: user.id, profile_id: profile.id })
      .select('id')
      .single()
    userCase = newCase
  }

  const caseId = userCase?.id as string | undefined

  const { data: documents } = caseId
    ? await supabase
        .from('documents')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
    : { data: [] }

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
        <span className="text-[12px] text-[#A3A3A3] truncate">Documents</span>
        <div className="flex items-center gap-3 shrink-0">
          <StartOverButton />
          <AuthNav />
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row overflow-auto lg:overflow-hidden">
        <DashboardSubnav active="documents" />

        {/* Main */}
        <main className="flex-1 overflow-y-auto px-6 py-5">
          <div className="mb-5">
            <h1 className="text-[18px] font-bold text-[#171717]">Documents</h1>
            <p className="text-[12px] text-[#A3A3A3] mt-0.5">
              Upload and manage your immigration documents.
            </p>
          </div>

          {caseId ? (
            <DocumentsManager
              initialDocuments={(documents ?? []) as Parameters<typeof DocumentsManager>[0]['initialDocuments']}
              caseId={caseId}
              userId={user.id}
            />
          ) : (
            <p className="text-[13px] text-[#A3A3A3]">
              Unable to initialize your case. Please try refreshing the page.
            </p>
          )}
        </main>
      </div>
    </div>
  )
}
