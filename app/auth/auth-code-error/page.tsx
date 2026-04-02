import Link from "next/link";

export default function AuthCodeErrorPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-[#FAFAFA]">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold text-[#171717] mb-2">
          Sign-in could not be completed
        </h1>
        <p className="text-sm text-[#737373] leading-relaxed mb-8">
          The OAuth callback failed or the link expired. Try signing in again.
          If it keeps happening, confirm Google is enabled in Supabase and your
          redirect URLs match this app.
        </p>
        <Link
          href="/login"
          className="inline-flex items-center justify-center rounded-full bg-[#534AB7] text-white text-sm font-medium px-6 py-3 hover:bg-[#3C3489] transition-colors"
        >
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
