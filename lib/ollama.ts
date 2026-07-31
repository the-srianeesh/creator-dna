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
 * Handles truncated responses by:
 * 1. Trying clean parse first
 * 2. For arrays: salvaging any complete objects before the truncation point
 * 3. Structural repair by closing unclosed braces/brackets
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
  const fragment = stripped.slice(start)

  // ── Step 1: Try clean parse ───────────────────────────────────────────────
  const lastCurly = fragment.lastIndexOf('}')
  const lastSquare = fragment.lastIndexOf(']')
  const end = Math.max(lastCurly, lastSquare)

  if (end > 0) {
    try {
      return JSON.parse(fragment.slice(0, end + 1)) as T
    } catch {
      // fall through
    }
  }

  // ── Step 2: For arrays — salvage complete objects ────────────────────────
  // Find all complete top-level objects by scanning for balanced { }
  if (isArray) {
    const salvaged = extractCompleteObjects(fragment)
    if (salvaged.length > 0) {
      try {
        return JSON.parse(`[${salvaged.join(',')}]`) as T
      } catch {
        // fall through
      }
    }
  }

  // ── Step 3: Structural repair ─────────────────────────────────────────────
  let repaired = fragment

  // Remove trailing incomplete string values and keys
  repaired = repaired.replace(/,\s*"[^"]*":\s*\{[^}]*$/, '')   // incomplete nested object
  repaired = repaired.replace(/,\s*"[^"]*":\s*"[^"]*$/, '')     // incomplete string value
  repaired = repaired.replace(/,\s*"[^"]*":\s*$/, '')            // incomplete key
  repaired = repaired.replace(/,\s*"[^"]*$/, '')                 // key with no colon

  // Count unclosed braces and brackets
  let openCurlies = 0
  let openSquares = 0
  for (const ch of repaired) {
    if (ch === '{') openCurlies++
    else if (ch === '}') openCurlies--
    else if (ch === '[') openSquares++
    else if (ch === ']') openSquares--
  }

  repaired += '}'.repeat(Math.max(0, openCurlies))
  repaired += ']'.repeat(Math.max(0, openSquares))

  try {
    return JSON.parse(repaired) as T
  } catch {
    // fall through
  }

  throw new Error(
    `Failed to parse JSON from LLM response (tried repair):\n${raw.slice(0, 300)}`
  )
}

/**
 * Scans a JSON array string and returns all top-level complete objects as strings.
 * Used to salvage partial arrays where the last object was cut off.
 */
function extractCompleteObjects(arrayStr: string): string[] {
  const results: string[] = []
  let depth = 0
  let inString = false
  let escape = false
  let objStart = -1

  for (let i = 0; i < arrayStr.length; i++) {
    const ch = arrayStr[i]

    if (escape) { escape = false; continue }
    if (ch === '\\' && inString) { escape = true; continue }
    if (ch === '"') { inString = !inString; continue }
    if (inString) continue

    if (ch === '{') {
      if (depth === 0 || (depth === 1 && arrayStr[0] === '[')) {
        if (depth === 0 && arrayStr[0] !== '[') objStart = i
        if (depth === 1) objStart = i
      }
      depth++
    } else if (ch === '}') {
      depth--
      if (depth === 1 && objStart !== -1 && arrayStr[0] === '[') {
        results.push(arrayStr.slice(objStart, i + 1))
        objStart = -1
      } else if (depth === 0 && objStart !== -1 && arrayStr[0] !== '[') {
        results.push(arrayStr.slice(objStart, i + 1))
        objStart = -1
      }
    } else if (ch === '[') {
      depth++
    } else if (ch === ']') {
      depth--
    }
  }

  return results
}
