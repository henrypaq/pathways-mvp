import { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json()

    // Strip control tokens before sending to ElevenLabs
    const cleaned = text
      .replace(/PROFILE_DELTA:\{.*?\}/g, '')
      .replace(/ONBOARDING_COMPLETE/g, '')
      .trim()

    if (!cleaned) {
      return new Response(null, { status: 204 })
    }

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${process.env.ELEVENLABS_VOICE_ID}/stream`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': process.env.ELEVENLABS_API_KEY!,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: cleaned,
          model_id: 'eleven_flash_v2_5',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.3,
            use_speaker_boost: true,
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
