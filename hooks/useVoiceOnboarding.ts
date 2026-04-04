'use client'

import { useState, useRef, useEffect, useCallback, useLayoutEffect } from 'react'
import type { OrbState, PathwaysProfile, ConversationTurn } from '@/types/voice'
import { REQUIRED_PROFILE_FIELDS, normalizeVoiceProfile } from '@/types/voice'
import { getSpeechRecognitionCtor } from '@/lib/speechRecognition'
import { savePathwaysProfileToSupabase } from '@/lib/supabase/savePathwaysProfile'
import { useLanguage } from '@/context/LanguageContext'
import { voiceLanguageFromLocale } from '@/lib/voiceLocale'

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

// Fix 3: brace-counting extractor handles nested objects like
// PROFILE_DELTA:{"language_test":{"taken":"yes"}}
function extractProfileDeltas(text: string): Record<string, unknown>[] {
  const results: Record<string, unknown>[] = []
  const marker = 'PROFILE_DELTA:'
  let searchFrom = 0

  while (true) {
    const markerIdx = text.indexOf(marker, searchFrom)
    if (markerIdx === -1) break

    const start = markerIdx + marker.length
    if (text[start] !== '{') { searchFrom = start; continue }

    let depth = 0
    let end = start
    for (let i = start; i < text.length; i++) {
      if (text[i] === '{') depth++
      else if (text[i] === '}') {
        depth--
        if (depth === 0) { end = i + 1; break }
      }
    }

    try {
      const json = text.slice(start, end)
      const parsed = JSON.parse(json)
      if (typeof parsed === 'object' && parsed !== null) {
        results.push(parsed as Record<string, unknown>)
      }
    } catch {
      // Malformed delta — skip
    }

    searchFrom = end
  }

  return results
}

// Fix A: safe sentence boundary — only split on punctuation followed by whitespace
// AND an uppercase letter. Avoids splitting on "Mr." "Dr." "e.g." decimals, etc.
const sentenceBoundary = /([.!?])\s+(?=[A-ZÀ-Ü])/

function extractCompleteSentences(buffer: string): {
  sentences: string[]
  remainder: string
} {
  const sentences: string[] = []
  let remaining = buffer

  while (remaining.length > 15) {
    const match = sentenceBoundary.exec(remaining)
    if (!match) break

    const sentence = remaining.slice(0, match.index + 1).trim()
    if (sentence.length >= 15) {
      sentences.push(sentence)
    }
    remaining = remaining.slice(match.index + 2).trimStart()
  }

  return { sentences, remainder: remaining }
}

export interface UseVoiceOnboardingReturn {
  orbState: OrbState
  profile: Partial<PathwaysProfile>
  history: ConversationTurn[]
  isComplete: boolean
  errorMessage: string | null
  startListening: () => void
  stopListening: () => void
  stopPlaybackAndTts: () => void
  triggerWelcome: () => void
  restartConversation: () => void
  requiredFieldsRemaining: (keyof PathwaysProfile)[]
}

export function useVoiceOnboarding(): UseVoiceOnboardingReturn {
  const mountedRef = useRef(true)
  const { language } = useLanguage()
  const languageRef = useRef(language)
  useEffect(() => { languageRef.current = language }, [language])
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
  const abortRunRef = useRef<AbortController>(new AbortController())
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
    abortRunRef.current.abort()
    abortRunRef.current = new AbortController()
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

  // Fix 2: MediaSource streaming path — audio starts playing as chunks arrive.
  // Falls back to arrayBuffer if MediaSource is unavailable (e.g. older Safari).
  const playAudioResponse = useCallback(
    async (response: Response, signal: AbortSignal): Promise<void> => {
      if (
        typeof MediaSource === 'undefined' ||
        !MediaSource.isTypeSupported('audio/mpeg')
      ) {
        // Fallback: buffer the whole response before playing
        return new Promise((resolve) => {
          let settled = false
          const finish = () => { if (settled) return; settled = true; resolve() }
          if (!mountedRef.current || signal.aborted) { finish(); return }
          void (async () => {
            try {
              const buffer = await response.arrayBuffer()
              if (!mountedRef.current || signal.aborted) { finish(); return }
              if (buffer.byteLength === 0) { console.warn('[voice] empty audio, skipping'); finish(); return }
              const blob = new Blob([buffer], { type: 'audio/mpeg' })
              const url = URL.createObjectURL(blob)
              if (playingAudioRef.current) {
                playingAudioRef.current.pause()
                playingAudioRef.current.src = ''
                playingAudioRef.current = null
              }
              const audio = new Audio(url)
              playingAudioRef.current = audio
              const cleanup = () => {
                URL.revokeObjectURL(url)
                if (playingAudioRef.current === audio) playingAudioRef.current = null
                finish()
              }
              audio.onended = cleanup
              audio.onerror = cleanup
              signal.addEventListener('abort', () => { audio.pause(); cleanup() }, { once: true })
              audio.play().catch(cleanup)
            } catch {
              finish()
            }
          })()
        })
      }

      // Fix C: hardened MediaSource streaming path
      return new Promise<void>((resolve, reject) => {
        if (!mountedRef.current || signal.aborted) { resolve(); return }

        const mediaSource = new MediaSource()
        const url = URL.createObjectURL(mediaSource)
        if (playingAudioRef.current) {
          playingAudioRef.current.pause()
          playingAudioRef.current.src = ''
          playingAudioRef.current = null
        }
        const audio = new Audio(url)
        playingAudioRef.current = audio

        // Track whether the full stream was written before audio.onerror fires,
        // so we can resolve (not reject) on a normal end-of-stream signal.
        let streamDone = false
        let sourceBuffer!: SourceBuffer

        // Wait for sourceBuffer to finish any in-progress operation before touching it.
        const waitForNotUpdating = () =>
          new Promise<void>(r => {
            if (!sourceBuffer.updating) { r(); return }
            sourceBuffer.addEventListener('updateend', () => r(), { once: true })
          })

        // Append a chunk, waiting for any previous update to finish first.
        // QuotaExceededError / InvalidStateError are caught per-chunk so one bad
        // chunk does not crash the entire sentence.
        const appendChunk = async (chunk: Uint8Array) => {
          await waitForNotUpdating()
          try {
            sourceBuffer.appendBuffer(chunk)
            await waitForNotUpdating()
          } catch (err) {
            console.warn('[audio] appendBuffer error:', err)
          }
        }

        // Close the MediaSource only after any pending update finishes.
        const endStream = async () => {
          await waitForNotUpdating()
          if (mediaSource.readyState === 'open') {
            mediaSource.endOfStream()
          }
        }

        audio.onended = () => {
          URL.revokeObjectURL(url)
          if (playingAudioRef.current === audio) playingAudioRef.current = null
          resolve()
        }
        audio.onerror = (e) => {
          URL.revokeObjectURL(url)
          if (playingAudioRef.current === audio) playingAudioRef.current = null
          // If the stream already finished writing, this is a normal end-of-stream
          // signal from the browser — resolve so the sentence chain continues.
          if (streamDone) resolve()
          else reject(e)
        }

        signal.addEventListener('abort', () => {
          try { audio.pause() } catch { /* ignore */ }
          URL.revokeObjectURL(url)
          if (playingAudioRef.current === audio) playingAudioRef.current = null
          resolve()
        }, { once: true })

        mediaSource.addEventListener('sourceopen', async () => {
          try {
            sourceBuffer = mediaSource.addSourceBuffer('audio/mpeg')
          } catch (err) {
            // MediaSource not supported for this codec — caller falls back
            URL.revokeObjectURL(url)
            reject(err)
            return
          }

          const reader = response.body!.getReader()

          try {
            // Buffer the first chunk BEFORE calling audio.play() so the audio
            // element never starts with an empty buffer (Fix C core).
            const firstChunk = await reader.read()
            if (firstChunk.done || signal.aborted) {
              await endStream()
              resolve()
              return
            }
            await appendChunk(firstChunk.value)

            // First chunk is now in the buffer — safe to begin playback.
            audio.play().catch((err) => {
              console.warn('[voice] audio.play() failed:', err)
              resolve()
            })

            // Stream remaining chunks sequentially, checking abort each iteration.
            while (true) {
              if (signal.aborted) {
                await endStream()
                resolve()
                return
              }
              const { done, value } = await reader.read()
              if (done) break
              await appendChunk(value)
            }

            await endStream()
            streamDone = true
          } catch (err) {
            if (!signal.aborted) reject(err)
            else resolve()
          }
        }, { once: true })

        // Guard: if signal was already aborted before sourceopen fires.
        if (signal.aborted) {
          URL.revokeObjectURL(url)
          resolve()
        }
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
    abortRunRef.current.abort()
    abortRunRef.current = new AbortController()
    const ac = abortRunRef.current

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

      // Fix 1: two-phase streaming — collect fullText for PROFILE_DELTA extraction
      // while firing TTS on each complete sentence as it arrives.
      let fullText = ''
      let streamBuffer = ''

      // Fix B: strictly sequential playback chain — sentence N+1 never starts
      // until sentence N fully completes. No promise is created until its
      // predecessor resolves, so TTS fetches never run concurrently.
      let playbackChain = Promise.resolve()
      let sentenceCount = 0

      const enqueueSentence = (text: string) => {
        sentenceCount++
        playbackChain = playbackChain.then(async () => {
          if (ac.signal.aborted) return
          await speakSentence(text, languageRef.current, ac.signal)
        })
      }

      // Fix 1: helper — cleans a sentence fragment and fires a speak request.
      // Returns a Promise that resolves when that sentence's audio has finished playing.
      const speakSentence = async (text: string, lang: string, signal: AbortSignal): Promise<void> => {
        const clean = text
          .replace(/PROFILE_DELTA:\{(?:[^{}]|\{[^{}]*\})*\}/g, '')
          .replace(/ONBOARDING_COMPLETE/g, '')
          .trim()
        if (!clean) return
        if (signal.aborted || !mountedRef.current) return
        try {
          const res = await fetch('/api/voice/speak', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: clean, lang: voiceLanguageFromLocale(lang as Parameters<typeof voiceLanguageFromLocale>[0]) }),
            signal,
          })
          if (!res.ok) {
            console.error('[voice] TTS failed:', res.status)
            return
          }
          await playAudioResponse(res, signal)
        } catch (err) {
          if (err instanceof DOMException && err.name === 'AbortError') return
          console.error('[voice] speakSentence threw:', err)
        }
      }

      while (true) {
        if (ac.signal.aborted || !mountedRef.current) {
          await reader.cancel().catch(() => {})
          return
        }
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        fullText += chunk
        streamBuffer += chunk
        console.log('[voice] chunk received:', chunk)

        // Fix A + B: extract complete sentences using safe boundary detection,
        // then enqueue each one into the strict sequential playback chain.
        const { sentences: completeSentences, remainder } = extractCompleteSentences(streamBuffer)
        streamBuffer = remainder

        for (const sentence of completeSentences) {
          if (ac.signal.aborted) break
          if (sentenceCount === 0) setOrbTracked('speaking')
          enqueueSentence(sentence)
        }
      }

      // Flush any remaining text that never ended with punctuation
      if (streamBuffer.trim() && !ac.signal.aborted) {
        if (sentenceCount === 0) setOrbTracked('speaking')
        enqueueSentence(streamBuffer.trim())
      }

      if (!mountedRef.current || ac.signal.aborted) return

      console.log('[voice] stream complete, fullText:', fullText)

      // PROFILE_DELTA extraction on the full response (Fix 3: brace-counting)
      const deltas = extractProfileDeltas(fullText)
      let mergedProfile: Partial<PathwaysProfile> = { ...profileRef.current }
      for (const delta of deltas) {
        console.log('[voice] profile delta:', delta)
        mergedProfile = { ...mergedProfile, ...delta }
      }
      if (deltas.length > 0) {
        const normalizedProfile = normalizeVoiceProfile(mergedProfile)
        profileRef.current = normalizedProfile
        localStorage.setItem(PROFILE_KEY, JSON.stringify(normalizedProfile))
        setProfile(normalizedProfile)
        void savePathwaysProfileToSupabase(normalizedProfile).catch((err) => {
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

      // Fix 3: updated clean regex handles nested braces
      const cleanText = fullText
        .replace(/PROFILE_DELTA:\{(?:[^{}]|\{[^{}]*\})*\}/g, '')
        .replace(/ONBOARDING_COMPLETE/g, '')
        .replace(/\n+/g, ' ')
        .trim()

      console.log('[voice] clean text for history:', cleanText)

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

      // Fix B: await the strict sequential chain — sentence N+1 never starts
      // until sentence N's audio has fully ended.
      await playbackChain

      // Edge case: Claude returned only tokens with no sentence-ending punctuation
      // and no flush was triggered (e.g. empty or pure-token response)
      if (sentenceCount === 0 && cleanText.length > 0 && !ac.signal.aborted) {
        setOrbTracked('speaking')
        await speakSentence(cleanText, languageRef.current, ac.signal)
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

  const restartConversation = useCallback(() => {
    // Stop current audio and cancel any in-flight Claude/TTS request
    stopPlaybackAndTts()
    // Reset the welcome guard so triggerWelcome (or direct __INIT__) can fire again
    hasWelcomed.current = false
    // Short delay to let the browser release the audio element before a new stream starts
    setTimeout(() => {
      if (!mountedRef.current) return
      void runTurnRef.current?.('__INIT__')
    }, 150)
  }, [stopPlaybackAndTts])

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
    recognition.lang =
      voiceLanguageFromLocale(language) === 'fr' ? 'fr-FR' : 'en-US'
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
  }, [language, setOrbTracked])

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
    stopPlaybackAndTts,
    triggerWelcome,
    restartConversation,
    requiredFieldsRemaining,
  }
}
