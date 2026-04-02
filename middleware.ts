import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  // Supabase sometimes redirects to Site URL root (?code=...) instead of /auth/callback
  // when Site URL / redirect allow list is misconfigured — normalize so the session exchanges.
  const url = request.nextUrl;
  if (url.pathname === "/" && url.searchParams.has("code")) {
    const fixed = url.clone();
    fixed.pathname = "/auth/callback";
    return NextResponse.redirect(fixed);
  }

  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static assets and images.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
