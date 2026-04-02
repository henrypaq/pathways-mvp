import Link from "next/link";
import { EmailSignInForm } from "@/components/auth/EmailSignInForm";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";

type Props = {
  searchParams: Promise<{ next?: string }>;
};

export default async function LoginPage({ searchParams }: Props) {
  const params = await searchParams;
  const next = params.next?.startsWith("/") ? params.next : "/onboarding";

  return (
    <div className="min-h-screen flex flex-col bg-white relative overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 50% -10%, #EEEDFE 0%, transparent 55%)",
        }}
      />

      <nav className="relative z-10 flex items-center justify-between px-6 py-5 md:px-8 border-b border-[#F5F5F5]/80 bg-white/80 backdrop-blur-sm">
        <Link
          href="/"
          className="text-[15px] font-semibold tracking-tight text-[#171717]"
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

      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-12 md:py-16">
        <div className="mb-8 text-center max-w-md">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#E5E5E5] bg-white px-3 py-1 text-[11px] text-[#737373] mb-5 shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-[#1D9E75]" />
            Secure sign-in
          </div>
          <h1 className="text-[28px] md:text-[32px] font-semibold tracking-tight text-[#171717] leading-tight mb-2">
            Welcome back
          </h1>
          <p className="text-[15px] text-[#737373] leading-relaxed">
            Sign in to save your profile and pick up your immigration journey on
            any device.
          </p>
        </div>

        <div
          className="w-full max-w-[400px] rounded-[20px] border border-[#E5E5E5] bg-white p-8 md:p-9 shadow-[0_4px_40px_rgba(83,74,183,0.07)]"
        >
          <EmailSignInForm nextPath={next} />

          <div className="relative my-8">
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
            className="w-full inline-flex items-center justify-center gap-2 rounded-full border border-[#E5E5E5] bg-white px-6 py-3.5 text-sm font-medium text-[#171717] shadow-sm hover:border-[#D4D4D4] hover:bg-[#FAFAFA] transition-colors disabled:opacity-60"
          />

          <p className="mt-8 text-center text-[12px] text-[#A3A3A3] leading-relaxed">
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
    </div>
  );
}
