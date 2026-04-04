import type { PreferredLocaleCode } from '@/lib/loginLocales'
import { enMessages } from '@/lib/i18n/messages/en'
import type { MessageKey } from '@/lib/i18n/messages/en'
import { frMessages } from '@/lib/i18n/messages/fr'

/** Locales with a full UI bundle. Others fall back to English strings until translated. */
export function getMessageBundle(code: PreferredLocaleCode): Record<MessageKey, string> {
  if (code === 'fr') return frMessages
  return enMessages as unknown as Record<MessageKey, string>
}

export function translate(
  bundle: Record<MessageKey, string>,
  key: MessageKey,
  vars?: Record<string, string>,
): string {
  let s = bundle[key] ?? enMessages[key] ?? String(key)
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      s = s.replaceAll(`{{${k}}}`, v)
    }
  }
  return s
}
