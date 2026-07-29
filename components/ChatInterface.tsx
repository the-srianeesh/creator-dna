'use client'

import { useState, useRef, useEffect } from 'react'
import type { ChatMessage, ContentDirection } from '@/types'

interface Props {
  sessionId: string
  directions: ContentDirection[]
  initialHistory?: ChatMessage[]
}

const SUGGESTIONS = [
  'Give me 3 alternative hooks for direction 1',
  'Rewrite the CTA to sound less salesy',
  'How do I make the body feel more natural?',
  'What should I avoid saying for this brand?',
]

export default function ChatInterface({ sessionId, directions, initialHistory = [] }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialHistory)
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [focusIndex, setFocusIndex] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage(text: string) {
    const trimmed = text.trim()
    if (!trimmed || isStreaming) return

    setInput('')
    setError(null)

    const userMsg: ChatMessage = {
      role: 'user',
      content: trimmed,
      timestamp: new Date().toISOString(),
    }

    // Optimistically add user message + empty assistant placeholder
    const assistantPlaceholder: ChatMessage = {
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
    }

    setMessages((prev) => [...prev, userMsg, assistantPlaceholder])
    setIsStreaming(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, message: trimmed, focusDirectionIndex: focusIndex }),
      })

      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({ error: 'Request failed.' }))
        throw new Error(err.error ?? 'Unknown error')
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let accumulated = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        accumulated += decoder.decode(value, { stream: true })

        // Update the last (assistant) message in real time
        setMessages((prev) => {
          const updated = [...prev]
          updated[updated.length - 1] = {
            ...updated[updated.length - 1],
            content: accumulated,
          }
          return updated
        })
      }
    } catch (e: unknown) {
      const err = e as { message?: string }
      setError(err?.message ?? 'Something went wrong. Please try again.')
      // Remove the empty assistant placeholder on error
      setMessages((prev) => prev.slice(0, -1))
    } finally {
      setIsStreaming(false)
      textareaRef.current?.focus()
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  return (
    <div className="flex flex-col h-full min-h-[500px]">
      {/* Direction context selector */}
      {directions.length > 0 && (
        <div className="flex gap-2 flex-wrap mb-4">
          <span className="text-xs text-zinc-500 self-center">Focus on:</span>
          <button
            onClick={() => setFocusIndex(null)}
            className={`text-xs px-3 py-1 rounded-full border transition-colors ${
              focusIndex === null
                ? 'bg-zinc-700 border-zinc-500 text-zinc-100'
                : 'border-zinc-700 text-zinc-500 hover:border-zinc-500'
            }`}
          >
            All directions
          </button>
          {directions.map((d, i) => (
            <button
              key={i}
              onClick={() => setFocusIndex(i)}
              className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                focusIndex === i
                  ? 'bg-violet-600 border-violet-500 text-white'
                  : 'border-zinc-700 text-zinc-500 hover:border-violet-600 hover:text-violet-300'
              }`}
            >
              Direction {i + 1}
            </button>
          ))}
        </div>
      )}

      {/* Message thread */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1 mb-4">
        {messages.length === 0 && (
          <div className="text-center py-10 space-y-4">
            <p className="text-zinc-500 text-sm">Ask anything about your content directions</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => sendMessage(s)}
                  className="text-xs px-3 py-1.5 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <MessageBubble key={i} message={msg} isStreaming={isStreaming && i === messages.length - 1} />
        ))}

        {error && (
          <div className="text-xs text-red-400 bg-red-900/20 border border-red-800 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex gap-2 items-end">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={2}
          disabled={isStreaming}
          placeholder="Ask about your script, request alternatives, get more clarity… (Enter to send)"
          className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none disabled:opacity-50"
        />
        <button
          onClick={() => sendMessage(input)}
          disabled={isStreaming || !input.trim()}
          className="h-[70px] px-4 bg-violet-600 hover:bg-violet-500 disabled:bg-violet-900 disabled:cursor-not-allowed text-white rounded-xl font-medium text-sm transition-colors flex-shrink-0"
        >
          {isStreaming ? (
            <span className="flex flex-col items-center gap-1">
              <span className="animate-spin text-lg">⟳</span>
              <span className="text-xs">…</span>
            </span>
          ) : (
            '↑ Send'
          )}
        </button>
      </div>
    </div>
  )
}

// ─── Message Bubble ───────────────────────────────────────────────────────────

function MessageBubble({
  message,
  isStreaming,
}: {
  message: ChatMessage
  isStreaming: boolean
}) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={[
          'max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed',
          isUser
            ? 'bg-violet-600 text-white rounded-br-sm'
            : 'bg-zinc-800 text-zinc-200 rounded-bl-sm border border-zinc-700',
        ].join(' ')}
      >
        {message.content ? (
          <p className="whitespace-pre-wrap">{message.content}</p>
        ) : (
          isStreaming && (
            <span className="inline-flex gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce [animation-delay:0ms]" />
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce [animation-delay:150ms]" />
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce [animation-delay:300ms]" />
            </span>
          )
        )}
      </div>
    </div>
  )
}
