'use client'

import { useEffect } from 'react'
import { useLanguage } from '@/context/LanguageContext'

/** Keeps `<html lang>` aligned with the active UI locale (a11y + font shaping). */
export function DocumentLang() {
  const { language } = useLanguage()

  useEffect(() => {
    document.documentElement.lang = language
  }, [language])

  return null
}
