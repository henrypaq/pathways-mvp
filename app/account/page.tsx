import Link from "next/link";
import { redirect } from "next/navigation";
import Image from "next/image";
import { Calendar, Mail, User, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { AccountBackButton } from "@/components/account/AccountBackButton";
import { StartOverButton } from "@/app/dashboard/StartOverButton";
import { PageSurface } from "@/components/ui/PageSurface";
import type { PathwaysProfile } from "@/types/voice";

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

  // Determine where "Continue your journey" should go
  const { data: profileRow } = await supabase
    .from("profiles")
    .select("completeness_score, data")
    .eq("user_id", user.id)
    .single();

  const completenessScore: number = profileRow?.completeness_score ?? 0;
  const profileData = profileRow?.data as Partial<PathwaysProfile> | null;
  const hasOnboardingDone = !!(profileData as Record<string, unknown> | null)?.onboarding_complete;
  const isComplete = completenessScore >= 0.5 || hasOnboardingDone;
  const continueHref = isComplete ? "/dashboard" : "/onboarding";

  return (
    <PageSurface surface="flow" fixed>
      <header className="flex-shrink-0 flex items-center gap-3 border-b border-[var(--ui-border)] bg-[var(--ui-panel)]/88 backdrop-blur-md px-4 py-3 sm:px-6">
        <AccountBackButton />
        <h1 className="text-[15px] font-semibold tracking-tight text-[#171717]">
          Account
        </h1>
      </header>

      <main className="flex-1 overflow-y-auto px-5 py-8 sm:px-8 sm:py-10">
        <div className="mx-auto max-w-md">
          <div className="mb-8 flex flex-col items-center text-center">
            {avatar ? (
              <Image
                src={avatar}
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
              {fullName || "Pathways member"}
            </p>
            <p className="mt-0.5 text-sm text-[#737373]">{user.email}</p>
          </div>

          <div className="space-y-0 rounded-[14px] border border-[var(--ui-border-strong)] bg-[var(--ui-panel)] divide-y divide-[var(--ui-border)] mb-8 shadow-sm">
            <div className="flex items-start gap-3 px-4 py-4">
              <Mail
                size={18}
                className="text-[#A3A3A3] mt-0.5 shrink-0"
                strokeWidth={1.75}
              />
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-[#A3A3A3] mb-0.5">
                  Email
                </p>
                <p className="text-sm text-[#171717] break-all">{user.email}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 px-4 py-4">
              <Calendar
                size={18}
                className="text-[#A3A3A3] mt-0.5 shrink-0"
                strokeWidth={1.75}
              />
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wide text-[#A3A3A3] mb-0.5">
                  Member since
                </p>
                <p className="text-sm text-[#171717]">{created}</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <Link
              href={continueHref}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-[#534AB7] py-3.5 text-sm font-medium text-white shadow-lg shadow-[#534AB7]/15 hover:bg-[#3C3489] transition-colors"
            >
              Continue your journey
              <ArrowRight size={16} />
            </Link>
            <SignOutButton />
            <div className="rounded-[14px] border border-[var(--ui-border)] bg-[var(--ui-panel)] px-4 py-4">
              <p className="text-[11px] font-medium uppercase tracking-wide text-[#A3A3A3] mb-2">
                Reset Pathways
              </p>
              <p className="text-[12px] text-[#737373] leading-snug mb-3">
                Clear your profile and recommendations and begin onboarding again from scratch.
              </p>
              <StartOverButton />
            </div>
          </div>

          <p className="mt-10 text-center text-[11px] leading-relaxed text-[#A3A3A3]">
            Your answers are saved to your Pathways profile.
          </p>
        </div>
      </main>
    </PageSurface>
  );
}
