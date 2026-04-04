/**
 * Login language picker: many locales with flags; only `supported` rows change app language.
 * Voice/UI localization is implemented for English and French; others are “coming soon”.
 */
export type LoginLocaleOption = {
  value: string
  label: string
  flag: string
  supported: boolean
}

export const LOGIN_LANGUAGE_OPTIONS: LoginLocaleOption[] = [
  { value: 'en', label: 'English', flag: '🇬🇧', supported: true },
  { value: 'fr', label: 'Français', flag: '🇫🇷', supported: true },
  { value: 'es', label: 'Español', flag: '🇪🇸', supported: false },
  { value: 'de', label: 'Deutsch', flag: '🇩🇪', supported: false },
  { value: 'it', label: 'Italiano', flag: '🇮🇹', supported: false },
  { value: 'pt', label: 'Português', flag: '🇵🇹', supported: false },
  { value: 'nl', label: 'Nederlands', flag: '🇳🇱', supported: false },
  { value: 'pl', label: 'Polski', flag: '🇵🇱', supported: false },
  { value: 'uk', label: 'Українська', flag: '🇺🇦', supported: false },
  { value: 'zh', label: '中文', flag: '🇨🇳', supported: false },
  { value: 'ja', label: '日本語', flag: '🇯🇵', supported: false },
  { value: 'ko', label: '한국어', flag: '🇰🇷', supported: false },
  { value: 'ar', label: 'العربية', flag: '🇸🇦', supported: false },
  { value: 'hi', label: 'हिन्दी', flag: '🇮🇳', supported: false },
  { value: 'tr', label: 'Türkçe', flag: '🇹🇷', supported: false },
  { value: 'vi', label: 'Tiếng Việt', flag: '🇻🇳', supported: false },
]
