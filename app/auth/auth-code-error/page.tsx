import Link from "next/link";
import { PageSurface } from "@/components/ui/PageSurface";

export default function AuthCodeErrorPage() {
  return (
    <PageSurface
      surface="marketing"
      className="items-center justify-center px-6 py-16"
    >
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold text-[#171717] mb-2">
          Sign-in could not be completed
        </h1>
        <p className="text-sm text-[#737373] leading-relaxed mb-8">
          Something went wrong while signing you in. Please try again, or
          contact us if the problem persists.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-full bg-[#534AB7] text-white text-sm font-medium px-6 py-3 hover:bg-[#3C3489] transition-colors"
          >
            Back to sign in
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-full border border-[#E5E5E5] text-[#737373] text-sm font-medium px-6 py-3 hover:border-[#D4D4D4] hover:text-[#171717] transition-colors"
          >
            Go to home
          </Link>
        </div>
      </div>
    </PageSurface>
  );
}
