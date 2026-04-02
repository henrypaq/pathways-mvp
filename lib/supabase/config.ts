/**
 * Browser-safe Supabase config (NEXT_PUBLIC_* is inlined by Next.js).
 *
 * Dashboard naming: “Publishable” ≈ legacy anon (safe in the client).
 * “Secret” / service role must never use NEXT_PUBLIC_* or ship to the browser.
 */
export function getSupabaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_URL ??
    process.env.NEXT_PUBLIC_SUPABASE_PROJECT_URL ??
    process.env.SUPABASE_PROJECT_URL ??
    ""
  );
}

/** Publishable / anon key — only this belongs in the client bundle. */
export function getSupabaseAnonKey(): string {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.SUPABASE_ANON_KEY ??
    process.env.SUPABASE_PUBLISHABLE_KEY ??
    ""
  );
}

/** True when browser bundle can create a Supabase client (both URL + publishable key). */
export function isSupabaseBrowserConfigured(): boolean {
  return Boolean(getSupabaseUrl() && getSupabaseAnonKey());
}
