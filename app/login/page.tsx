import Link from "next/link";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";

type Props = {
  searchParams: Promise<{ next?: string }>;
};

export default async function LoginPage({ searchParams }: Props) {
  const params = await searchParams;
  const next = params.next?.startsWith("/") ? params.next : "/onboarding";

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <nav className="flex items-center justify-between px-8 py-5 border-b border-[#F5F5F5]">
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

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-16">
        <div
          className="w-full max-w-[380px] rounded-[16px] border border-[#E5E5E5] bg-white p-8 shadow-sm"
          style={{
            boxShadow: "0 4px 24px rgba(83, 74, 183, 0.06)",
          }}
        >
          <h1 className="text-[22px] font-semibold text-[#171717] text-center mb-1">
            Sign in
          </h1>
          <p className="text-sm text-[#737373] text-center mb-8 leading-relaxed">
            Use your Google account to save your profile and continue your
            immigration journey.
          </p>

          <GoogleSignInButton nextPath={next} />

          <p className="mt-8 text-center text-xs text-[#A3A3A3] leading-relaxed">
            By continuing, you agree to our use of authentication services. You
            can also{" "}
            <Link href="/onboarding" className="text-[#534AB7] hover:underline">
              explore without signing in
            </Link>{" "}
            (profile stays on this device only).
          </p>
        </div>
      </div>
    </div>
  );
}
