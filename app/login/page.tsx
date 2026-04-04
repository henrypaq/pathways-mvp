import Link from "next/link";
import { EmailSignInForm } from "@/components/auth/EmailSignInForm";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { LoginLanguageSelector } from "@/components/auth/LoginLanguageSelector";
import { PageSurface } from "@/components/ui/PageSurface";

type Props = {
  searchParams: Promise<{ next?: string }>;
};

export default async function LoginPage({ searchParams }: Props) {
  const params = await searchParams;
  const next = params.next?.startsWith("/") ? params.next : "/onboarding";

  return (
    <PageSurface
      surface="marketing"
      fixed
      className="relative overflow-hidden h-svh min-h-0"
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 50% -10%, #EEEDFE 0%, transparent 55%)",
        }}
      />

      <nav className="relative z-10 shrink-0 flex items-center justify-between px-5 py-3 md:px-8 border-b border-[var(--ui-border)] bg-[var(--ui-panel)]/85 backdrop-blur-md">
        <Link
          href="/"
          className="text-[15px] font-semibold tracking-tight text-[#171717] hover:text-[#534AB7] transition-colors duration-200"
        >
          Pathways
        </Link>
        <Link
          href="/"
          className="text-sm text-[#737373] hover:text-[#171717] transition-colors"
        >
          Home
        </Link>
      </nav>

      <div className="relative z-10 flex-1 min-h-0 flex flex-col items-center justify-center px-5 py-4 md:py-6 overflow-hidden">
        <h1 className="text-center text-[22px] sm:text-[26px] font-semibold tracking-tight text-[#171717] leading-tight mb-4 shrink-0">
          Sign in to Pathways
        </h1>

        <div
          className="w-full max-w-[480px] rounded-[16px] border border-[#E5E5E5] bg-white p-5 sm:p-6 shadow-[0_4px_40px_rgba(83,74,183,0.07)] shrink-0"
        >
          <LoginLanguageSelector />
          <EmailSignInForm nextPath={next} />

          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-[#E5E5E5]" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white px-3 text-xs font-medium text-[#A3A3A3] uppercase tracking-wider">
                Or
              </span>
            </div>
          </div>

          <GoogleSignInButton
            nextPath={next}
            className="w-full inline-flex items-center justify-center gap-2 rounded-full border border-[#E5E5E5] bg-white px-5 py-3 text-sm font-medium text-[#171717] shadow-sm hover:border-[#D4D4D4] hover:bg-[#FAFAFA] transition-colors disabled:opacity-60"
          />
          <p className="mt-3 text-center text-[11px] text-[#A3A3A3] leading-snug">
            We&apos;ll send you a sign-in link — no password needed.
          </p>

          <p className="mt-4 text-center text-[11px] text-[#A3A3A3] leading-snug">
            By continuing, you agree to authentication and privacy practices
            described by Pathways and our providers.{" "}
            <Link
              href="/onboarding"
              className="text-[#534AB7] hover:underline underline-offset-2"
            >
              Continue without an account
            </Link>{" "}
            (data stays on this device only).
          </p>
        </div>
      </div>
    </PageSurface>
  );
}
