import Link from "next/link";
import { redirect } from "next/navigation";
import Image from "next/image";
import { Calendar, Mail, User, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/auth/SignOutButton";

export const metadata = {
  title: "Account — Pathways",
  description: "Your Pathways profile and account settings.",
};

export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/account");
  }

  const meta = user.user_metadata as Record<string, unknown>;
  const fullName =
    (typeof meta.full_name === "string" && meta.full_name) ||
    (typeof meta.name === "string" && meta.name) ||
    null;
  const avatar =
    typeof meta.avatar_url === "string" ? meta.avatar_url : null;
  const created = user.created_at
    ? new Date(user.created_at).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "—";

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAFA]">
      <nav className="flex-shrink-0 border-b border-[#E5E5E5] bg-white px-6 py-4 md:px-8">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
          <Link
            href="/"
            className="text-[15px] font-semibold tracking-tight text-[#171717] hover:text-[#534AB7] transition-colors duration-200"
          >
            Pathways
          </Link>
          <div className="flex items-center gap-5">
            <Link
              href="/onboarding"
              className="text-sm text-[#737373] hover:text-[#171717] transition-colors"
            >
              Onboarding
            </Link>
            <Link
              href="/"
              className="text-sm text-[#737373] hover:text-[#171717] transition-colors"
            >
              Home
            </Link>
          </div>
        </div>
      </nav>

      <main className="flex-1 px-6 py-10 md:py-14">
        <div className="mx-auto max-w-xl">
          <h1 className="text-2xl font-semibold tracking-tight text-[#171717] mb-1">
            Your account
          </h1>
          <p className="text-sm text-[#737373] mb-8">
            Signed in with Pathways. Manage how you access the platform.
          </p>

          <div className="rounded-[16px] border border-[#E5E5E5] bg-white overflow-hidden shadow-sm mb-6">
            <div className="border-b border-[#F5F5F5] px-6 py-5 flex items-start gap-4">
              {avatar ? (
                <Image
                  src={avatar}
                  alt=""
                  width={56}
                  height={56}
                  unoptimized
                  className="h-14 w-14 rounded-full object-cover ring-2 ring-[#F5F5F5]"
                />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#EEEDFE] text-[#534AB7]">
                  <User size={26} strokeWidth={1.75} />
                </div>
              )}
              <div className="min-w-0 flex-1 pt-0.5">
                <p className="text-lg font-semibold text-[#171717] truncate">
                  {fullName || "Pathways member"}
                </p>
                <p className="text-sm text-[#737373] truncate">{user.email}</p>
              </div>
            </div>

            <div className="divide-y divide-[#F5F5F5]">
              <div className="px-6 py-4 flex items-start gap-3">
                <Mail
                  size={18}
                  className="text-[#A3A3A3] mt-0.5 flex-shrink-0"
                  strokeWidth={1.75}
                />
                <div>
                  <p className="text-xs font-medium text-[#A3A3A3] uppercase tracking-wide mb-0.5">
                    Email
                  </p>
                  <p className="text-sm text-[#171717]">{user.email}</p>
                </div>
              </div>

              <div className="px-6 py-4 flex items-start gap-3">
                <Calendar
                  size={18}
                  className="text-[#A3A3A3] mt-0.5 flex-shrink-0"
                  strokeWidth={1.75}
                />
                <div>
                  <p className="text-xs font-medium text-[#A3A3A3] uppercase tracking-wide mb-0.5">
                    Member since
                  </p>
                  <p className="text-sm text-[#171717]">{created}</p>
                </div>
              </div>

              <div className="px-6 py-4 flex items-start gap-3">
                <User
                  size={18}
                  className="text-[#A3A3A3] mt-0.5 flex-shrink-0"
                  strokeWidth={1.75}
                />
                <div className="min-w-0">
                  <p className="text-xs font-medium text-[#A3A3A3] uppercase tracking-wide mb-0.5">
                    User ID
                  </p>
                  <p className="text-xs font-mono text-[#525252] break-all">
                    {user.id}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <Link
              href="/onboarding"
              className="flex w-full items-center justify-center gap-2 rounded-full bg-[#534AB7] py-3 text-sm font-medium text-white hover:bg-[#3C3489] transition-colors"
            >
              Continue your journey
              <ArrowRight size={16} />
            </Link>
            <SignOutButton />
          </div>

          <p className="mt-8 text-center text-xs text-[#A3A3A3] leading-relaxed">
            Immigration profile data you enter in onboarding is stored on this
            device until you connect cloud features. Account settings may expand
            as Pathways grows.
          </p>
        </div>
      </main>
    </div>
  );
}
