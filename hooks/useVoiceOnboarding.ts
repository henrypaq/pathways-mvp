'use client'

import { useState, useRef, useEffect, useCallback, useLayoutEffect } from 'react'
import type { OrbState, PathwaysProfile, ConversationTurn } from '@/types/voice'
import { REQUIRED_PROFILE_FIELDS } from '@/types/voice'
import { getSpeechRecognitionCtor } from '@/lib/speechRecognition'
import { savePathwaysProfileToSupabase } from '@/lib/supabase/savePathwaysProfile'

const PROFILE_KEY = process.env.NEXT_PUBLIC_PROFILE_KEY ?? 'pathways_profile'
const ONBOARDING_DONE_KEY = process.env.NEXT_PUBLIC_ONBOARDING_DONE_KEY ?? 'pathways_onboarding_complete'
const VOICE_HISTORY_KEY = 'pathways_voice_onboarding_history'

function readOnboardingDone(): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(ONBOARDING_DONE_KEY) === 'true'
}

function loadVoiceHistory(): ConversationTurn[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = sessionStorage.getItem(VOICE_HISTORY_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? (parsed as ConversationTurn[]) : []
  } catch {
    return []
  }
}

function persistVoiceHistory(turns: ConversationTurn[]) {
  try {
    sessionStorage.setItem(VOICE_HISTORY_KEY, JSON.stringify(turns))
  } catch {
    /* ignore quota */
  }
}

function loadProfileFromStorage(): Partial<PathwaysProfile> {
  if (typeof window === 'undefined') return {}
  try {
    const stored = localStorage.getItem(PROFILE_KEY)
    return stored ? (JSON.parse(stored) as Partial<PathwaysProfile>) : {}
  } catch {
    return {}
  }
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
  const mountedRef = useRef(true)
  const initialHistory = loadVoiceHistory()

  const [orbState, setOrbState] = useState<OrbState>('idle')
  const orbStateRef = useRef<OrbState>('idle')
  const setOrbTracked = useCallback((next: OrbState) => {
    orbStateRef.current = next
    setOrbState(next)
  }, [])

  const [profile, setProfile] = useState<Partial<PathwaysProfile>>(() => loadProfileFromStorage())
  const [history, setHistory] = useState<ConversationTurn[]>(initialHistory)
  const [isComplete, setIsComplete] = useState<boolean>(readOnboardingDone)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const historyRef = useRef<ConversationTurn[]>(initialHistory)
  const profileRef = useRef<Partial<PathwaysProfile>>(loadProfileFromStorage())
  const isCompleteRef = useRef(readOnboardingDone())
  const hasWelcomed = useRef(false)

  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const abortRunRef = useRef<AbortController | null>(null)
  const playingAudioRef = useRef<HTMLAudioElement | null>(null)

  const runTurnRef = useRef<(transcript: string) => Promise<void>>(
    undefined as unknown as (transcript: string) => Promise<void>,
  )

  useLayoutEffect(() => {
    orbStateRef.current = orbState
  }, [orbState])

  useEffect(() => {
    historyRef.current = history
  }, [history])
  useEffect(() => {
    profileRef.current = profile
  }, [profile])
  useLayoutEffect(() => {
    isCompleteRef.current = isComplete
  }, [isComplete])

  const stopPlaybackAndTts = useCallback(() => {
    abortRunRef.current?.abort()
    abortRunRef.current = null
    if (playingAudioRef.current) {
      try {
        playingAudioRef.current.pause()
        playingAudioRef.current.src = ''
      } catch {
        /* ignore */
      }
      playingAudioRef.current = null
    }
  }, [])

  const playAudioResponse = useCallback(
    async (response: Response, signal: AbortSignal): Promise<void> => {
      return new Promise((resolve) => {
        let settled = false
        const finish = () => {
          if (settled) return
          settled = true
          resolve()
        }
        if (!mountedRef.current || signal.aborted) {
          finish()
          return
        }
        void (async () => {
          try {
            const buffer = await response.arrayBuffer()
            if (!mountedRef.current || signal.aborted) {
              finish()
              return
            }
            if (buffer.byteLength === 0) {
              console.warn('[voice] empty audio, skipping')
              finish()
              return
            }
            const blob = new Blob([buffer], { type: 'audio/mpeg' })
            const url = URL.createObjectURL(blob)
            const audio = new Audio(url)
            playingAudioRef.current = audio
            const cleanup = () => {
              URL.revokeObjectURL(url)
              if (playingAudioRef.current === audio) playingAudioRef.current = null
              finish()
            }
            audio.onended = cleanup
            audio.onerror = cleanup
            const onAbort = () => {
              audio.pause()
              cleanup()
            }
            signal.addEventListener('abort', onAbort, { once: true })
            audio.play().catch(cleanup)
          } catch {
            finish()
          }
        })()
      })
    },
    [],
  )

  const commitHistory = useCallback((turns: ConversationTurn[], persistToSession = true) => {
    historyRef.current = turns
    setHistory(turns)
    if (persistToSession) persistVoiceHistory(turns)
  }, [])

  const runTurn = async (transcript: string): Promise<void> => {
    console.log('[voice] runTurn called with:', transcript)
    abortRunRef.current?.abort()
    const ac = new AbortController()
    abortRunRef.current = ac

    try {
      setOrbTracked('thinking')
      setErrorMessage(null)

      console.log('[voice] sending chat request')
      const chatRes = await fetch('/api/voice/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: ac.signal,
        body: JSON.stringify({
          transcript,
          history: historyRef.current,
          profile: profileRef.current,
        }),
      })

      if (!mountedRef.current) return

      if (!chatRes.ok) {
        throw new Error(`chat_failed: ${chatRes.status}`)
      }
      if (!chatRes.body) {
        throw new Error('no_stream_body')
      }

      console.log('[voice] reading stream')
      const reader = chatRes.body.getReader()
      const decoder = new TextDecoder()
      let fullText = ''

      while (true) {
        if (ac.signal.aborted || !mountedRef.current) {
          await reader.cancel().catch(() => {})
          return
        }
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        fullText += chunk
        console.log('[voice] chunk received:', chunk)
      }

      if (!mountedRef.current || ac.signal.aborted) return

      console.log('[voice] stream complete, fullText:', fullText)

      const deltaMatches = [...fullText.matchAll(/PROFILE_DELTA:(\{[^}]*\})/g)]
      let mergedProfile: Partial<PathwaysProfile> = { ...profileRef.current }
      for (const match of deltaMatches) {
        try {
          const delta = JSON.parse(match[1]) as Partial<PathwaysProfile>
          console.log('[voice] profile delta:', delta)
          mergedProfile = { ...mergedProfile, ...delta }
        } catch (e) {
          console.error('[voice] delta parse error:', e)
        }
      }
      if (deltaMatches.length > 0) {
        profileRef.current = mergedProfile
        localStorage.setItem(PROFILE_KEY, JSON.stringify(mergedProfile))
        setProfile(mergedProfile)
        void savePathwaysProfileToSupabase(mergedProfile).catch((err) => {
          console.error('[voice] Incremental profile sync to Supabase failed:', err)
        })
      }

      let completedNow = false
      if (fullText.includes('ONBOARDING_COMPLETE')) {
        console.log('[voice] onboarding complete')
        completedNow = true
        isCompleteRef.current = true
        setIsComplete(true)
        localStorage.setItem(ONBOARDING_DONE_KEY, 'true')

        void (async () => {
          try {
            const raw = localStorage.getItem(PROFILE_KEY)
            const fromStorage = raw
              ? (JSON.parse(raw) as Partial<PathwaysProfile>)
              : profileRef.current
            await savePathwaysProfileToSupabase(fromStorage)
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

      const cleanText = fullText
        .replace(/PROFILE_DELTA:\{[^}]*\}/g, '')
        .replace(/ONBOARDING_COMPLETE/g, '')
        .replace(/\n+/g, ' ')
        .trim()

      console.log('[voice] clean text for TTS:', cleanText)

      const assistantEntry: ConversationTurn = { role: 'assistant', content: cleanText }
      const updatedHistory =
        transcript === '__INIT__'
          ? [...historyRef.current, assistantEntry]
          : [...historyRef.current, { role: 'user' as const, content: transcript }, assistantEntry]

      // Do not persist voice transcript after completion — it breaks the next visit (no welcome + mic blocked).
      commitHistory(updatedHistory, !completedNow)
      if (completedNow) {
        try {
          sessionStorage.removeItem(VOICE_HISTORY_KEY)
        } catch {
          /* ignore */
        }
      }

      if (!mountedRef.current || ac.signal.aborted) return

      if (cleanText.length === 0) {
        console.warn('[voice] empty clean text, skipping TTS')
        setOrbTracked('idle')
        return
      }

      let sentences = cleanText
        .split(/(?<=[.!?])\s+/)
        .map((s: string) => s.trim())
        .filter((s: string) => s.length > 2)
      if (sentences.length === 0) sentences = [cleanText]

      console.log('[voice] sentences:', sentences)
      setOrbTracked('speaking')

      for (const sentence of sentences) {
        if (!mountedRef.current || ac.signal.aborted) break
        console.log('[voice] speaking:', sentence)
        try {
          const speakRes = await fetch('/api/voice/speak', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: ac.signal,
            body: JSON.stringify({ text: sentence }),
          })
          if (!speakRes.ok) {
            console.error('[voice] speak error:', speakRes.status)
            continue
          }
          await playAudioResponse(speakRes, ac.signal)
          console.log('[voice] sentence done')
        } catch (err) {
          if (err instanceof DOMException && err.name === 'AbortError') break
          console.error('[voice] speak threw:', err)
        }
      }

      if (!mountedRef.current || ac.signal.aborted) return

      console.log('[voice] turn complete')
      setOrbTracked('idle')
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      if (!mountedRef.current) return
      console.error('[voice] runTurn error:', err)
      setErrorMessage('Something went wrong, tap to retry')
      setOrbTracked('idle')
    }
  }

  runTurnRef.current = runTurn

  const triggerWelcome = useCallback(() => {
    if (hasWelcomed.current) return
    hasWelcomed.current = true
    if (typeof window !== 'undefined' && localStorage.getItem(ONBOARDING_DONE_KEY) === 'true') {
      console.log('[voice] onboarding already complete, skipping welcome')
      return
    }
    if (historyRef.current.length > 0) {
      console.log('[voice] restored voice session from storage — tap the orb to continue')
      return
    }
    console.log('[voice] triggering welcome')
    setTimeout(() => {
      if (!mountedRef.current) return
      void runTurnRef.current?.('__INIT__')
    }, 300)
  }, [])

  const startListening = useCallback(() => {
    if (!mountedRef.current) return
    const Ctor = getSpeechRecognitionCtor()
    if (!Ctor) {
      console.error('[voice] SpeechRecognition not supported in this browser')
      return
    }

    if (orbStateRef.current !== 'idle') return

    console.log('[voice] starting recognition')
    try {
      recognitionRef.current?.stop()
    } catch {
      /* ignore */
    }
    recognitionRef.current = null

    setOrbTracked('listening')
    setErrorMessage(null)

    const recognition = new Ctor()
    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = 'en-US'
    recognition.maxAlternatives = 1

    let gotResult = false

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      gotResult = true
      const transcript = event.results[0][0].transcript.trim()
      console.log('[voice] transcript:', transcript)
      if (transcript.length > 0) {
        void runTurnRef.current?.(transcript)
      } else {
        setOrbTracked('idle')
      }
    }

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('[voice] recognition error:', event.error)
      if (event.error === 'aborted') return
      if (event.error === 'not-allowed') {
        setErrorMessage('Microphone access is required for voice mode')
        setOrbTracked('idle')
        return
      }
      setErrorMessage("Couldn't hear that, please try again")
      setOrbTracked('idle')
    }

    recognition.onend = () => {
      console.log('[voice] recognition ended')
      if (gotResult) return
      if (orbStateRef.current === 'listening') setOrbTracked('idle')
    }

    recognitionRef.current = recognition
    try {
      recognition.start()
    } catch (e) {
      console.error('[voice] recognition.start failed:', e)
      setOrbTracked('idle')
    }
  }, [setOrbTracked])

  const stopListening = useCallback(() => {
    try {
      recognitionRef.current?.stop()
    } catch {
      /* ignore */
    }
    recognitionRef.current = null
    setOrbTracked('idle')
  }, [setOrbTracked])

  // One-time cleanup: completed onboarding used to re-persist voice history and broke the next visit.
  useEffect(() => {
    if (!isComplete) return
    try {
      sessionStorage.removeItem(VOICE_HISTORY_KEY)
    } catch {
      /* ignore */
    }
  }, [isComplete])

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      stopPlaybackAndTts()
      try {
        recognitionRef.current?.stop()
      } catch {
        /* ignore */
      }
      recognitionRef.current = null
    }
  }, [stopPlaybackAndTts])

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
