import { NextRequest } from 'next/server'
import { chatStream } from '@/lib/ollama'
import { readSession, appendChatMessage } from '@/lib/session'
import type { ChatMessage, ContentDirection, CreatorFingerprint, BrandBrief } from '@/types'

// ─── System prompt builder ────────────────────────────────────────────────────

function buildSystemPrompt(
  fingerprint: CreatorFingerprint,
  brief: BrandBrief,
  directions: ContentDirection[],
  focusIndex: number | null
): string {
  const directionsText = directions
    .map(
      (d, i) => `
Direction ${i + 1}: "${d.title}"
Angle: ${d.angle}
Hook: ${d.script.hook}
Body: ${d.script.body}
CTA: ${d.script.cta}`
    )
    .join('\n')

  const focusNote =
    focusIndex !== null
      ? `\nThe creator is currently focused on Direction ${focusIndex + 1}: "${directions[focusIndex]?.title}". Prioritize advice about this direction unless asked otherwise.`
      : ''

  return `You are an expert UGC content strategist having a conversation with a creator to help them refine their content.

CREATOR FINGERPRINT:
- Humor: ${fingerprint.humor}
- Pacing: ${fingerprint.pacing}
- Hook patterns: ${fingerprint.hookPatterns}
- Vocabulary: ${fingerprint.vocabulary}
- Emotional tone: ${fingerprint.emotionalTone}
- CTA style: ${fingerprint.ctaStyle}
- Storytelling: ${fingerprint.storytellingStructure}

BRAND BRIEF:
- Brand: ${brief.brandName}
- Product: ${brief.product}
- Target audience: ${brief.targetAudience}
- Tone: ${brief.tone}
- Key messages: ${brief.keyMessages}
- Deliverables: ${brief.deliverables}

GENERATED CONTENT DIRECTIONS:
${directionsText}
${focusNote}

YOUR ROLE:
- Help the creator understand what to say, how to say it, and why
- Generate alternative hooks, lines, or scripts when asked — always in the creator's voice
- Explain strategic decisions in plain language
- Be direct and practical — no generic advice
- Keep responses concise unless a full script is requested`
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { sessionId, message, focusDirectionIndex } = body as {
      sessionId?: string
      message?: string
      focusDirectionIndex?: number | null
    }

    if (!sessionId || !message?.trim()) {
      return new Response(JSON.stringify({ error: 'Missing sessionId or message.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const session = readSession(sessionId)

    if (!session.fingerprint || !session.brief) {
      return new Response(
        JSON.stringify({ error: 'Session is missing fingerprint or brief.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Append user message to history
    const userMsg: ChatMessage = {
      role: 'user',
      content: message.trim(),
      timestamp: new Date().toISOString(),
    }
    appendChatMessage(sessionId, userMsg)

    // Build system prompt with full context
    const systemPrompt = buildSystemPrompt(
      session.fingerprint,
      session.brief,
      session.directions,
      focusDirectionIndex ?? null
    )

    // Build history for LLM (user + assistant turns only)
    const history: ChatMessage[] = [
      ...session.chatHistory,
      userMsg, // include the new message
    ]

    // Stream the response
    const stream = chatStream(systemPrompt, history)

    // Collect the full response in the background to save to session
    // We use a TransformStream to tee the stream: one side goes to the client,
    // the other accumulates the full response for persistence.
    const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>()
    const writer = writable.getWriter()
    const decoder = new TextDecoder()
    let fullResponse = ''

    const reader = stream.getReader()

    // Process stream asynchronously
    ;(async () => {
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          fullResponse += decoder.decode(value, { stream: true })
          await writer.write(value)
        }
        await writer.close()

        // Persist assistant response to session
        const assistantMsg: ChatMessage = {
          role: 'assistant',
          content: fullResponse,
          timestamp: new Date().toISOString(),
        }
        appendChatMessage(sessionId, assistantMsg)
      } catch {
        await writer.abort()
      }
    })()

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch (e: unknown) {
    const err = e as { message?: string }
    const message = err?.message ?? 'Chat failed.'
    console.error('[/api/chat]', message)
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
