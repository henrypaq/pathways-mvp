'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import type { PathwaysProfile, ConversationTurn, ChatMessage } from '@/types/voice'
import { REQUIRED_PROFILE_FIELDS, normalizeVoiceProfile } from '@/types/voice'
import { savePathwaysProfileToSupabase } from '@/lib/supabase/savePathwaysProfile'

// Reuses /api/voice/chat — the endpoint is mode-agnostic (no TTS, no audio in chat path)
const CHAT_API = '/api/voice/chat'

const PROFILE_KEY = process.env.NEXT_PUBLIC_PROFILE_KEY ?? 'pathways_profile'
const ONBOARDING_DONE_KEY = process.env.NEXT_PUBLIC_ONBOARDING_DONE_KEY ?? 'pathways_onboarding_complete'

function makeId(): string {
  return Math.random().toString(36).slice(2)
}

export interface UseTextOnboardingReturn {
  messages: ChatMessage[]
  profile: Partial<PathwaysProfile>
  isComplete: boolean
  isLoading: boolean
  sendMessage: (text: string) => Promise<void>
  requiredFieldsRemaining: (keyof PathwaysProfile)[]
}

export function useTextOnboarding(): UseTextOnboardingReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [profile, setProfile] = useState<Partial<PathwaysProfile>>(() => {
    if (typeof window === 'undefined') return {}
    try {
      const stored = localStorage.getItem(PROFILE_KEY)
      return stored ? (JSON.parse(stored) as Partial<PathwaysProfile>) : {}
    } catch {
      return {}
    }
  })
  const [isComplete, setIsComplete] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem(ONBOARDING_DONE_KEY) === 'true'
  })
  const [isLoading, setIsLoading] = useState(false)

  const [history, setHistory] = useState<ConversationTurn[]>([])

  // Refs mirror state to avoid stale closures (same pattern as useVoiceOnboarding)
  const historyRef = useRef<ConversationTurn[]>([])
  const profileRef = useRef<Partial<PathwaysProfile>>({})
  useEffect(() => { historyRef.current = history }, [history])
  useEffect(() => { profileRef.current = profile }, [profile])

  const hasKickstarted = useRef(false)

  const runTurn = useCallback(async (transcript: string): Promise<void> => {
    setIsLoading(true)

    try {
      const res = await fetch(CHAT_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript,
          history: historyRef.current,
          profile: profileRef.current,
        }),
      })

      if (!res.ok) throw new Error(`chat_failed: ${res.status}`)
      if (!res.body) throw new Error('no_stream_body')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let fullText = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        fullText += decoder.decode(value, { stream: true })
      }

      const deltaMatches = [...fullText.matchAll(/PROFILE_DELTA:(\{[^}]*\})/g)]
      let mergedProfile: Partial<PathwaysProfile> = { ...profileRef.current }
      for (const match of deltaMatches) {
        try {
          const delta = JSON.parse(match[1]) as Partial<PathwaysProfile>
          mergedProfile = { ...mergedProfile, ...delta }
        } catch (e) {
          console.error('[text] delta parse error:', e)
        }
      }
      if (deltaMatches.length > 0) {
        const normalizedProfile = normalizeVoiceProfile(mergedProfile)
        profileRef.current = normalizedProfile
        localStorage.setItem(PROFILE_KEY, JSON.stringify(normalizedProfile))
        setProfile(normalizedProfile)
        void savePathwaysProfileToSupabase(normalizedProfile).catch((err) => {
          console.error('[text] Incremental profile sync to Supabase failed:', err)
        })
      }

      // Check completion
      if (fullText.includes('ONBOARDING_COMPLETE')) {
        setIsComplete(true)
        localStorage.setItem(ONBOARDING_DONE_KEY, 'true')

        // Save profile to Supabase then trigger scoring (fire-and-forget, same as ManualProfileForm)
        void (async () => {
          try {
            await savePathwaysProfileToSupabase(profileRef.current)
          } catch (err) {
            console.error('[text] Failed to save profile to Supabase:', err)
          }
          try {
            await fetch('/api/recommendations/generate', { method: 'POST' })
          } catch (err) {
            console.error('[text] Scoring failed silently:', err)
          }
        })()
      }

      // Strip tokens → clean assistant text
      const cleanText = fullText
        .replace(/PROFILE_DELTA:\{[^}]*\}/g, '')
        .replace(/ONBOARDING_COMPLETE/g, '')
        .replace(/\n+/g, ' ')
        .trim()

      // Update conversation history
      const assistantEntry: ConversationTurn = { role: 'assistant', content: cleanText }
      const updatedHistory =
        transcript === '__INIT__'
          ? [...historyRef.current, assistantEntry]
          : [...historyRef.current, { role: 'user' as const, content: transcript }, assistantEntry]

      historyRef.current = updatedHistory
      setHistory(updatedHistory)

      // Append assistant message to visible chat
      setMessages((prev) => [
        ...prev,
        { id: makeId(), role: 'assistant', content: cleanText, timestamp: Date.now() },
      ])
    } catch (err) {
      console.error('[text] runTurn error:', err)
      setMessages((prev) => [
        ...prev,
        {
          id: makeId(),
          role: 'assistant',
          content: 'Something went wrong. Please try again.',
          timestamp: Date.now(),
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Kickstart: fire __INIT__ once on mount to get opening greeting
  useEffect(() => {
    if (hasKickstarted.current) return
    hasKickstarted.current = true
    runTurn('__INIT__')
  }, [runTurn])

  const sendMessage = useCallback(
    async (text: string): Promise<void> => {
      // Append user message immediately
      setMessages((prev) => [
        ...prev,
        { id: makeId(), role: 'user', content: text, timestamp: Date.now() },
      ])
      await runTurn(text)
    },
    [runTurn],
  )

  const requiredFieldsRemaining = REQUIRED_PROFILE_FIELDS.filter((f) => !profile[f])

  return {
    messages,
    profile,
    isComplete,
    isLoading,
    sendMessage,
    requiredFieldsRemaining,
  }
}
