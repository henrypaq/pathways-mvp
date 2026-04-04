import { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { text, lang = 'en' } = await request.json()
    console.log('[speak] incoming request:', { text: text?.slice(0, 60), lang })

    const VOICE_IDS = {
      en: 'EXAVITQu4vr4xnSDxMaL', // Sarah/Rachel — English
      fr: 'cgSgspJ2msm6clMCkdW9',  // Jessica — French (multilingual model handles pronunciation)
    }

    const voiceId = VOICE_IDS[(lang as string) === 'fr' ? 'fr' : 'en']

    // Strip control tokens before sending to ElevenLabs
    const cleaned = text
      .replace(/PROFILE_DELTA:\{.*?\}/g, '')
      .replace(/ONBOARDING_COMPLETE/g, '')
      .trim()

    if (!cleaned) {
      return new Response(null, { status: 204 })
    }

    console.log('[speak] calling ElevenLabs:', {
      voiceId,
      modelId: 'eleven_multilingual_v2',
      languageCode: lang === 'fr' ? 'fr' : 'en',
      textLength: cleaned?.length,
      textPreview: cleaned?.slice(0, 60),
    })
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': process.env.ELEVENLABS_API_KEY!,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: cleaned,
          model_id: 'eleven_multilingual_v2',
          language_code: lang === 'fr' ? 'fr' : 'en',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        }),
      }
    )

    console.log('[speak] ElevenLabs response status:', response.status, response.statusText)

    if (!response.ok) {
      const err = await response.text()
      console.error('[speak] ElevenLabs error body:', err)
      return Response.json({ error: 'tts_failed' }, { status: 500 })
    }

    return new Response(response.body, {
      headers: { 'Content-Type': 'audio/mpeg' },
    })
  } catch (error) {
    console.error('[speak] unexpected error:', error)
    return Response.json({ error: 'tts_failed' }, { status: 500 })
  }
}
