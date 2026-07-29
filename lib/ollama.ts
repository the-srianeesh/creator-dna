import type { ChatMessage } from '@/types'

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434'
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? 'llama3'

// ─── Types ────────────────────────────────────────────────────────────────────

interface OllamaMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface OllamaChatRequest {
  model: string
  messages: OllamaMessage[]
  stream: boolean
  options?: {
    temperature?: number
    num_predict?: number
  }
}

// ─── One-shot Chat (returns full response) ───────────────────────────────────

/**
 * Sends a single prompt to Ollama and waits for the full response.
 * Use this for structured JSON generation (fingerprint, directions).
 */
export async function chat(
  systemPrompt: string,
  userMessage: string,
  options?: { temperature?: number; maxTokens?: number }
): Promise<string> {
  const body: OllamaChatRequest = {
    model: OLLAMA_MODEL,
    stream: false,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
    options: {
      temperature: options?.temperature ?? 0.7,
      num_predict: options?.maxTokens ?? 4096,
    },
  }

  const res = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Ollama error ${res.status}: ${text}`)
  }

  const data = await res.json()
  return data.message?.content ?? ''
}

// ─── Streaming Chat (for interactive follow-up) ───────────────────────────────

/**
 * Sends a conversation history to Ollama and returns a ReadableStream of tokens.
 * Use this for the interactive chat interface.
 */
export function chatStream(
  systemPrompt: string,
  history: ChatMessage[]
): ReadableStream<Uint8Array> {
  const messages: OllamaMessage[] = [
    { role: 'system', content: systemPrompt },
    ...history.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
  ]

  const body: OllamaChatRequest = {
    model: OLLAMA_MODEL,
    stream: true,
    messages,
    options: { temperature: 0.8, num_predict: 2048 },
  }

  const encoder = new TextEncoder()

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const res = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })

        if (!res.ok || !res.body) {
          const text = await res.text()
          controller.error(new Error(`Ollama stream error ${res.status}: ${text}`))
          return
        }

        const reader = res.body.getReader()
        const decoder = new TextDecoder()

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value, { stream: true })
          // Ollama streams newline-delimited JSON objects
          for (const line of chunk.split('\n')) {
            if (!line.trim()) continue
            try {
              const parsed = JSON.parse(line)
              const token: string = parsed?.message?.content ?? ''
              if (token) {
                controller.enqueue(encoder.encode(token))
              }
              if (parsed?.done) {
                controller.close()
                return
              }
            } catch {
              // incomplete JSON line — skip
            }
          }
        }

        controller.close()
      } catch (err) {
        controller.error(err)
      }
    },
  })
}

// ─── JSON Extraction Helper ───────────────────────────────────────────────────

/**
 * Extracts the first valid JSON object or array from a raw LLM response string.
 * Handles cases where the model wraps output in markdown code fences.
 */
export function extractJson<T>(raw: string): T {
  // Strip markdown code fences if present
  const stripped = raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim()

  // Find the outermost JSON object or array
  const start = stripped.search(/[{[]/)
  if (start === -1) {
    throw new Error(`No JSON found in LLM response:\n${raw.slice(0, 300)}`)
  }

  const isArray = stripped[start] === '['
  const lastCurly = stripped.lastIndexOf('}')
  const lastSquare = stripped.lastIndexOf(']')
  const end = Math.max(lastCurly, lastSquare)

  // If we have a clean end, parse normally
  if (end > start) {
    try {
      return JSON.parse(stripped.slice(start, end + 1)) as T
    } catch {
      // Fall through to repair attempt
    }
  }

  // Repair truncated JSON — close any open braces/brackets
  let fragment = stripped.slice(start)

  // Remove trailing incomplete key-value pair (e.g. `"key": "val` without closing quote)
  fragment = fragment.replace(/,\s*"[^"]*":\s*"[^"]*$/, '')  // trailing incomplete string value
  fragment = fragment.replace(/,\s*"[^"]*":\s*$/, '')          // trailing incomplete key
  fragment = fragment.replace(/,\s*"[^"]*$/, '')               // trailing incomplete key with no colon

  // Count unclosed braces and brackets
  let openCurlies = 0
  let openSquares = 0
  for (const ch of fragment) {
    if (ch === '{') openCurlies++
    else if (ch === '}') openCurlies--
    else if (ch === '[') openSquares++
    else if (ch === ']') openSquares--
  }

  // Close them in reverse order
  fragment += ']'.repeat(Math.max(0, openSquares))
  fragment += '}'.repeat(Math.max(0, openCurlies))

  // Fallback: try wrapping as array if needed
  const candidates = [fragment]
  if (isArray && !fragment.startsWith('[')) candidates.push(`[${fragment}]`)

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate) as T
    } catch {
      // try next
    }
  }

  throw new Error(
    `Failed to parse JSON from LLM response (tried repair):\n${raw.slice(0, 300)}`
  )
}
