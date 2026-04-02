import Anthropic from '@anthropic-ai/sdk'
import { NextRequest } from 'next/server'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request: NextRequest) {
  try {
    const { transcript, history, profile } = await request.json()

    const messages = [
      ...history.map((t: { role: string; content: string }) => ({
        role: t.role as 'user' | 'assistant',
        content: t.content,
      })),
      {
        role: 'user' as const,
        content: transcript === '__INIT__'
          ? 'Hello, I am ready to start.'
          : transcript,
      },
    ]

    const encoder = new TextEncoder()

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const anthropicStream = await client.messages.stream({
            model: 'claude-sonnet-4-5',
            max_tokens: 400,
            system: `You are the voice onboarding assistant for Pathways, an AI-powered immigration guidance platform. Your job is to have a warm, natural conversation to understand the user's immigration situation. You speak in a clear, authoritative, and trustworthy tone — like a knowledgeable advisor, not a form.

Your goal is to collect the following profile fields through natural conversation. Collect 2-3 fields per turn by asking compound but natural questions. Never make it feel like a form.

REQUIRED fields (collect these before wrapping up):
- current_country: country where user currently lives
- nationality: passport/citizenship country
- destination_country: where they want to move
- purpose: reason for moving (work, study, family, asylum, lifestyle)
- language_ability: self-assessed language level in destination country language
- timeline: how urgently they need to move

OPTIONAL fields (collect naturally if conversation allows):
- occupation, is_employed, education_level, family_situation, has_job_offer,
  current_visa_status, income_savings, prior_immigration_attempts, age,
  destination_region, field_of_study

Language test — ask as a natural follow-up right after language_ability:
- language_test_taken: has the user taken an official test? emit exactly 'yes', 'no', or 'planning'
- language_test_name: if 'yes' — which test? emit one of: IELTS, TEF_Canada, CELPIP, TCF_Canada, other
- language_test_score: if 'yes' — their overall score as a number (e.g. 7.5 for IELTS)
- language_test_self: if 'no' or 'planning' — self-assessed level: native, fluent, intermediate, or basic

Work experience — ask as a natural follow-up right after occupation or is_employed:
- years_of_experience: relevant years in their field — emit exactly one of: 0, 1, 2, 3, 4, 5+

CRITICAL RULES:
1. Keep responses SHORT — maximum 2-3 sentences. This is voice, not text.
2. Never list questions as bullets. Weave them naturally into sentences.
3. After each response, on a new line output exactly:
   PROFILE_DELTA:{"field": "value"}
   Only include fields learned THIS turn. If nothing new: PROFILE_DELTA:{}
4. When all REQUIRED fields are collected, end with: ONBOARDING_COMPLETE
5. Respond in whatever language the user speaks to you in.
6. Start with a warm welcome and first question.

Current profile: ${JSON.stringify(profile)}`,
            messages,
          })

          for await (const chunk of anthropicStream) {
            if (
              chunk.type === 'content_block_delta' &&
              chunk.delta.type === 'text_delta'
            ) {
              controller.enqueue(encoder.encode(chunk.delta.text))
            }
          }
        } catch (err) {
          console.error('[/api/voice/chat] stream error:', err)
        } finally {
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
        'X-Accel-Buffering': 'no',
        'Cache-Control': 'no-cache',
      },
    })
  } catch (error) {
    console.error('[/api/voice/chat]', error)
    return Response.json({ error: 'chat_failed' }, { status: 500 })
  }
}
