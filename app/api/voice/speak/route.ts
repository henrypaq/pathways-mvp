import { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { text, lang = 'en' } = await request.json()

    // Strip control tokens before sending to ElevenLabs
    const cleaned = text
      .replace(/PROFILE_DELTA:\{.*?\}/g, '')
      .replace(/ONBOARDING_COMPLETE/g, '')
      .trim()

    if (!cleaned) {
      return new Response(null, { status: 204 })
    }

    const voiceId = lang === 'fr'
      ? process.env.ELEVENLABS_VOICE_ID_FR!
      : process.env.ELEVENLABS_VOICE_ID_EN!

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
          model_id: process.env.ELEVENLABS_MODEL_ID ?? 'eleven_multilingual_v2',
          language_code: lang === 'fr' ? 'fr' : 'en',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        }),
      }
    )

    if (!response.ok) {
      const err = await response.text()
      console.error('[/api/voice/speak] ElevenLabs error:', err)
      return Response.json({ error: 'tts_failed' }, { status: 500 })
    }

    return new Response(response.body, {
      headers: { 'Content-Type': 'audio/mpeg' },
    })
  } catch (error) {
    console.error('[/api/voice/speak]', error)
    return Response.json({ error: 'tts_failed' }, { status: 500 })
  }
}
