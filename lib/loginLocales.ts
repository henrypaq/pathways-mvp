/**
 * Preferred UI / profile locale. Voice and copy use English or French only for now;
 * other codes are stored for future localization (see voiceLanguageFromLocale).
 */
export const PREFERRED_LOCALE_CODES = [
  'en',
  'es',
  'pt',
  'fr',
  'ar',
  'hi',
  'zh',
  'vi',
  'ko',
  'ja',
  'tr',
  'pl',
  'uk',
  'de',
  'it',
  'nl',
] as const

export type PreferredLocaleCode = (typeof PREFERRED_LOCALE_CODES)[number]

export type LoginLocaleOption = {
  value: PreferredLocaleCode
  label: string
  flag: string
}

/** Immigrant-common languages first; Spanish, Portuguese, and French kept near the top. */
export const LOGIN_LANGUAGE_OPTIONS: LoginLocaleOption[] = [
  { value: 'en', label: 'English', flag: '🇬🇧' },
  { value: 'es', label: 'Español', flag: '🇪🇸' },
  { value: 'pt', label: 'Português', flag: '🇵🇹' },
  { value: 'fr', label: 'Français', flag: '🇫🇷' },
  { value: 'ar', label: 'العربية', flag: '🇸🇦' },
  { value: 'hi', label: 'हिन्दी', flag: '🇮🇳' },
  { value: 'zh', label: '中文', flag: '🇨🇳' },
  { value: 'vi', label: 'Tiếng Việt', flag: '🇻🇳' },
  { value: 'ko', label: '한국어', flag: '🇰🇷' },
  { value: 'ja', label: '日本語', flag: '🇯🇵' },
  { value: 'tr', label: 'Türkçe', flag: '🇹🇷' },
  { value: 'pl', label: 'Polski', flag: '🇵🇱' },
  { value: 'uk', label: 'Українська', flag: '🇺🇦' },
  { value: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { value: 'it', label: 'Italiano', flag: '🇮🇹' },
  { value: 'nl', label: 'Nederlands', flag: '🇳🇱' },
]

const LOCALE_SET = new Set<string>(PREFERRED_LOCALE_CODES)

export function isPreferredLocaleCode(v: string): v is PreferredLocaleCode {
  return LOCALE_SET.has(v)
}

/** Human-readable label for profile UI (flag + name). */
export function preferredLocaleDisplay(code: string | undefined): string {
  if (!code || !isPreferredLocaleCode(code)) return 'English (default)'
  const row = LOGIN_LANGUAGE_OPTIONS.find((o) => o.value === code)
  return row ? `${row.flag} ${row.label}` : code
}

/** Map browser language to a stored locale when the user has not chosen one yet. */
export function localeFromNavigatorLanguage(navLang: string): PreferredLocaleCode | null {
  const base = navLang.split(/[-_]/)[0]?.toLowerCase() ?? ''
  if (!base) return null
  const map: Record<string, PreferredLocaleCode> = {
    en: 'en',
    es: 'es',
    pt: 'pt',
    fr: 'fr',
    ar: 'ar',
    hi: 'hi',
    zh: 'zh',
    vi: 'vi',
    ko: 'ko',
    ja: 'ja',
    tr: 'tr',
    pl: 'pl',
    uk: 'uk',
    de: 'de',
    it: 'it',
    nl: 'nl',
  }
  return map[base] ?? null
}
