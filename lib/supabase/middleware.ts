import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAnonKey, getSupabaseUrl } from "./config";

/**
 * Refreshes the Supabase session in middleware.
 *
 * Netlify Edge (and the Fetch spec) treat `Request` cookies as read-only —
 * `request.cookies.set()` throws and crashes the edge function. We keep a
 * per-request cookie map, mirror writes into the outgoing `Cookie` header for
 * downstream handlers, and set `Set-Cookie` on the response (see Supabase SSR
 * docs). Cache-Control headers from `setAll` must be applied when auth
 * cookies change.
 */
export async function updateSession(request: NextRequest) {
  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();
  if (!url || !key) {
    return NextResponse.next({ request });
  }

  const cookieJar = new Map<string, string>();
  for (const c of request.cookies.getAll()) {
    cookieJar.set(c.name, c.value);
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return Array.from(cookieJar.entries()).map(([name, value]) => ({
          name,
          value,
        }));
      },
      setAll(cookiesToSet, cacheHeaders) {
        for (const { name, value } of cookiesToSet) {
          if (value === "") {
            cookieJar.delete(name);
          } else {
            cookieJar.set(name, value);
          }
        }

        const requestHeaders = new Headers(request.headers);
        if (cookieJar.size === 0) {
          requestHeaders.delete("Cookie");
        } else {
          requestHeaders.set(
            "Cookie",
            Array.from(cookieJar.entries())
              .map(([n, v]) => `${n}=${v}`)
              .join("; "),
          );
        }

        supabaseResponse = NextResponse.next({
          request: {
            headers: requestHeaders,
          },
        });

        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options);
        });

        Object.entries(cacheHeaders).forEach(([k, v]) => {
          supabaseResponse.headers.set(k, v);
        });
      },
    },
  });

  await supabase.auth.getUser();

  return supabaseResponse;
}
