import type { PreferredLocaleCode } from '@/lib/loginLocales'

/** Locales that map to French TTS/STT; everything else uses English voice for now. */
export type VoiceLanguage = 'en' | 'fr'

export function voiceLanguageFromLocale(locale: PreferredLocaleCode): VoiceLanguage {
  return locale === 'fr' ? 'fr' : 'en'
}
