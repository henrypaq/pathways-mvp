/**
 * Merge JSON patches into public.profiles.data without dropping keys
 * (e.g. preferred_language when saving PathwaysProfile fields).
 */
export function mergeProfileData(
  prev: Record<string, unknown> | null | undefined,
  patch: Record<string, unknown>,
): Record<string, unknown> {
  return { ...(prev ?? {}), ...patch }
}
