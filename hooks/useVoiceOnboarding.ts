'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import type { OrbState, PathwaysProfile, ConversationTurn } from '@/types/voice'
import { REQUIRED_PROFILE_FIELDS } from '@/types/voice'
import { getSpeechRecognitionCtor } from '@/lib/speechRecognition'
import { createClient } from '@/lib/supabase/client'

const PROFILE_KEY = process.env.NEXT_PUBLIC_PROFILE_KEY ?? 'pathways_profile'
const ONBOARDING_DONE_KEY = process.env.NEXT_PUBLIC_ONBOARDING_DONE_KEY ?? 'pathways_onboarding_complete'

const playAudio = async (response: Response): Promise<void> => {
  return new Promise(async (resolve) => {
    try {
      const buffer = await response.arrayBuffer()
      if (buffer.byteLength === 0) {
        console.warn('[voice] empty audio, skipping')
        resolve()
        return
      }
      const blob = new Blob([buffer], { type: 'audio/mpeg' })
      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)
      audio.onended = () => { URL.revokeObjectURL(url); resolve() }
      audio.onerror = () => { URL.revokeObjectURL(url); resolve() }
      audio.play().catch(() => resolve())
    } catch {
      resolve()
    }
  })
}

export interface UseVoiceOnboardingReturn {
  orbState: OrbState
  profile: Partial<PathwaysProfile>
  history: ConversationTurn[]
  isComplete: boolean
  errorMessage: string | null
  startListening: () => void
  stopListening: () => void
  triggerWelcome: () => void
  requiredFieldsRemaining: (keyof PathwaysProfile)[]
}

export function useVoiceOnboarding(): UseVoiceOnboardingReturn {
  const [orbState, setOrbState] = useState<OrbState>('idle')
  const [profile, setProfile] = useState<Partial<PathwaysProfile>>(() => {
    if (typeof window === 'undefined') return {}
    try {
      const stored = localStorage.getItem(PROFILE_KEY)
      return stored ? (JSON.parse(stored) as Partial<PathwaysProfile>) : {}
    } catch {
      return {}
    }
  })
  const [history, setHistory] = useState<ConversationTurn[]>([])
  const [isComplete, setIsComplete] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem(ONBOARDING_DONE_KEY) === 'true'
  })
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Refs that mirror state — always current, no stale closure
  const historyRef = useRef<ConversationTurn[]>([])
  const profileRef = useRef<Partial<PathwaysProfile>>({})
  useEffect(() => { historyRef.current = history }, [history])
  useEffect(() => { profileRef.current = profile }, [profile])

  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const hasWelcomed = useRef(false)

  // runTurn stored in ref to avoid stale closures
  const runTurnRef = useRef<(transcript: string) => Promise<void>>(undefined as unknown as (transcript: string) => Promise<void>)

  const runTurn = async (transcript: string): Promise<void> => {
    console.log('[voice] runTurn called with:', transcript)
    try {
      setOrbState('thinking')
      setErrorMessage(null)

      // ── 1. CHAT ───────────────────────────────────────────────────────
      console.log('[voice] sending chat request')
      const chatRes = await fetch('/api/voice/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript,
          history: historyRef.current,
          profile: profileRef.current,
        }),
      })

      if (!chatRes.ok) {
        throw new Error(`chat_failed: ${chatRes.status}`)
      }
      if (!chatRes.body) {
        throw new Error('no_stream_body')
      }

      // ── 2. READ STREAM ────────────────────────────────────────────────
      console.log('[voice] reading stream')
      const reader = chatRes.body.getReader()
      const decoder = new TextDecoder()
      let fullText = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        fullText += chunk
        console.log('[voice] chunk received:', chunk)
      }

      console.log('[voice] stream complete, fullText:', fullText)

      // ── 3. PARSE PROFILE DELTA ────────────────────────────────────────
      const deltaMatches = [...fullText.matchAll(/PROFILE_DELTA:(\{[^}]*\})/g)]
      for (const match of deltaMatches) {
        try {
          const delta = JSON.parse(match[1]) as Partial<PathwaysProfile>
          console.log('[voice] profile delta:', delta)
          setProfile((prev) => {
            const updated = { ...prev, ...delta }
            profileRef.current = updated
            localStorage.setItem(PROFILE_KEY, JSON.stringify(updated))
            return updated
          })
        } catch (e) {
          console.error('[voice] delta parse error:', e)
        }
      }

      // ── 4. CHECK COMPLETION ───────────────────────────────────────────
      if (fullText.includes('ONBOARDING_COMPLETE')) {
        console.log('[voice] onboarding complete')
        setIsComplete(true)
        localStorage.setItem(ONBOARDING_DONE_KEY, 'true')

        // Save profile to Supabase then trigger scoring (fire-and-forget, same as ManualProfileForm)
        void (async () => {
          try {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
              await supabase.from('profiles').insert({ user_id: user.id, data: profileRef.current })
            }
          } catch (err) {
            console.error('[voice] Failed to save profile to Supabase:', err)
          }
          try {
            await fetch('/api/recommendations/generate', { method: 'POST' })
          } catch (err) {
            console.error('[voice] Scoring failed silently:', err)
          }
        })()
      }

      // ── 5. CLEAN TEXT FOR TTS ─────────────────────────────────────────
      const cleanText = fullText
        .replace(/PROFILE_DELTA:\{[^}]*\}/g, '')
        .replace(/ONBOARDING_COMPLETE/g, '')
        .replace(/\n+/g, ' ')
        .trim()

      console.log('[voice] clean text for TTS:', cleanText)

      // ── 6. UPDATE HISTORY ─────────────────────────────────────────────
      const assistantEntry: ConversationTurn = { role: 'assistant', content: cleanText }
      const updatedHistory =
        transcript === '__INIT__'
          ? [...historyRef.current, assistantEntry]
          : [...historyRef.current, { role: 'user' as const, content: transcript }, assistantEntry]

      historyRef.current = updatedHistory
      setHistory(updatedHistory)

      // ── 7. SPEAK ──────────────────────────────────────────────────────
      if (cleanText.length === 0) {
        console.warn('[voice] empty clean text, skipping TTS')
        setOrbState('idle')
        return
      }

      const sentences = cleanText
        .split(/(?<=[.!?])\s+/)
        .map((s: string) => s.trim())
        .filter((s: string) => s.length > 2)

      console.log('[voice] sentences:', sentences)
      setOrbState('speaking')

      for (const sentence of sentences) {
        console.log('[voice] speaking:', sentence)
        try {
          const speakRes = await fetch('/api/voice/speak', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: sentence }),
          })
          if (!speakRes.ok) {
            console.error('[voice] speak error:', speakRes.status)
            continue
          }
          await playAudio(speakRes)
          console.log('[voice] sentence done')
        } catch (err) {
          console.error('[voice] speak threw:', err)
        }
      }

      console.log('[voice] turn complete')
      setOrbState('idle')
    } catch (err) {
      console.error('[voice] runTurn error:', err)
      setErrorMessage('Something went wrong, tap to retry')
      setOrbState('idle')
    }
  }

  // Keep ref current so triggerWelcome and startListening never hold a stale copy
  useEffect(() => { runTurnRef.current = runTurn })

  const triggerWelcome = useCallback(() => {
    if (hasWelcomed.current) return
    hasWelcomed.current = true
    console.log('[voice] triggering welcome')
    setTimeout(() => runTurnRef.current?.('__INIT__'), 300)
  }, [])

  const startListening = useCallback(() => {
    const Ctor = getSpeechRecognitionCtor()
    if (!Ctor) {
      console.error('[voice] SpeechRecognition not supported in this browser')
      return
    }

    if (orbState !== 'idle') return

    console.log('[voice] starting recognition')
    setOrbState('listening')
    setErrorMessage(null)

    const recognition = new Ctor()
    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = 'en-US'
    recognition.maxAlternatives = 1

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript.trim()
      console.log('[voice] transcript:', transcript)
      if (transcript.length > 0) {
        runTurnRef.current?.(transcript)
      } else {
        setOrbState('idle')
      }
    }

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('[voice] recognition error:', event.error)
      setErrorMessage("Couldn't hear that, please try again")
      setOrbState('idle')
    }

    recognition.onend = () => {
      console.log('[voice] recognition ended')
      setOrbState(prev => prev === 'listening' ? 'idle' : prev)
    }

    recognitionRef.current = recognition
    recognition.start()
  }, [orbState])

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop()
    recognitionRef.current = null
  }, [])

  const requiredFieldsRemaining = REQUIRED_PROFILE_FIELDS.filter((f) => !profile[f])

  return {
    orbState,
    profile,
    history,
    isComplete,
    errorMessage,
    startListening,
    stopListening,
    triggerWelcome,
    requiredFieldsRemaining,
  }
}
