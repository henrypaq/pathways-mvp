import Link from 'next/link'

type ActivePage = 'profile' | 'documents'

export function DashboardSubnav({ active }: { active: ActivePage }) {
  return (
    <aside className="lg:w-60 lg:flex-shrink-0 border-b lg:border-b-0 lg:border-r border-[var(--ui-border)] bg-[var(--ui-panel)] px-4 py-5">
      <h2 className="text-[11px] font-semibold text-[#A3A3A3] uppercase tracking-wider mb-4">
        Dashboard
      </h2>
      <nav className="space-y-0.5">
        <Link
          href="/dashboard"
          className="block text-[13px] text-[#525252] hover:text-[#534AB7] py-1.5 transition-colors"
        >
          ← Overview
        </Link>
        <Link
          href="/dashboard/profile"
          className={`block text-[13px] py-1.5 px-2.5 rounded-[6px] transition-colors ${
            active === 'profile'
              ? 'font-medium text-[#534AB7] bg-[#EEEDFE]'
              : 'text-[#525252] hover:text-[#534AB7]'
          }`}
        >
          Edit Profile
        </Link>
        <Link
          href="/dashboard/documents"
          className={`block text-[13px] py-1.5 px-2.5 rounded-[6px] transition-colors ${
            active === 'documents'
              ? 'font-medium text-[#534AB7] bg-[#EEEDFE]'
              : 'text-[#525252] hover:text-[#534AB7]'
          }`}
        >
          Documents
        </Link>
      </nav>
    </aside>
  )
}
