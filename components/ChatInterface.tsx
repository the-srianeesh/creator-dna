'use client'

import { useState, useRef, useEffect } from 'react'
import type { ChatMessage, ContentDirection } from '@/types'

interface Props {
  sessionId: string
  directions: ContentDirection[]
  initialHistory?: ChatMessage[]
}

const SUGGESTIONS = [
  { icon: '🎣', text: 'Give me 3 alternative hooks for direction 1' },
  { icon: '🔁', text: 'Rewrite the CTA to sound less salesy' },
  { icon: '🎙️', text: 'Make the body feel more natural and conversational' },
  { icon: '🚫', text: 'What should I avoid saying for this brand?' },
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
        setMessages((prev) => {
          const updated = [...prev]
          updated[updated.length - 1] = { ...updated[updated.length - 1], content: accumulated }
          return updated
        })
      }
    } catch (e: unknown) {
      const err = e as { message?: string }
      setError(err?.message ?? 'Something went wrong. Please try again.')
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
    <div className="flex flex-col rounded-2xl border border-[#E4E8F0] bg-white overflow-hidden" style={{ minHeight: 480 }}>

      {/* Chat header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#E4E8F0] bg-[#F8F9FB]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl dna-gradient flex items-center justify-center">
            <span className="text-white text-sm">🤖</span>
          </div>
          <div>
            <p className="text-sm font-bold text-[#1B2B4B]">Creative Director</p>
            <p className="text-xs text-[#8A99B3]">AI grounded in your DNA + brand brief</p>
          </div>
        </div>

        {/* Direction focus pills */}
        {directions.length > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-[#8A99B3] font-medium hidden sm:block">Focus:</span>
            <button
              onClick={() => setFocusIndex(null)}
              className={[
                'text-[10px] font-bold px-2.5 py-1 rounded-full transition-smooth',
                focusIndex === null
                  ? 'bg-[#1B2B4B] text-white'
                  : 'bg-[#EEF1F7] text-[#5A6A85] hover:bg-[#E4E8F0]',
              ].join(' ')}
            >
              All
            </button>
            {directions.map((_, i) => (
              <button
                key={i}
                onClick={() => setFocusIndex(i)}
                className={[
                  'text-[10px] font-bold px-2.5 py-1 rounded-full transition-smooth',
                  focusIndex === i
                    ? 'text-white'
                    : 'bg-[#EEF1F7] text-[#5A6A85] hover:bg-[#E4E8F0]',
                ].join(' ')}
                style={focusIndex === i ? {
                  background: ['#00C8D4', '#9B4FD8', '#FF6B35'][i],
                } : {}}
              >
                D{i + 1}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full py-8 space-y-5 animate-fade-in">
            <div className="w-12 h-12 rounded-2xl dna-gradient flex items-center justify-center">
              <span className="text-white text-xl">💬</span>
            </div>
            <div className="text-center space-y-1">
              <p className="text-sm font-semibold text-[#1B2B4B]">Your Creative Director is ready</p>
              <p className="text-xs text-[#8A99B3] max-w-xs">Ask for rewrites, alternative hooks, clarity on any direction, or scripting guidance.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-md">
              {SUGGESTIONS.map((s, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(s.text)}
                  className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl border border-[#E4E8F0] bg-[#F8F9FB] hover:bg-[#EEF1F7] hover:border-[#C8D0E0] text-left transition-smooth text-xs text-[#5A6A85] hover:text-[#1B2B4B]"
                >
                  <span className="flex-shrink-0">{s.icon}</span>
                  <span>{s.text}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <MessageBubble
            key={i}
            message={msg}
            isStreaming={isStreaming && i === messages.length - 1}
          />
        ))}

        {error && (
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-red-100 bg-red-50 text-xs text-red-600">
            <span>⚠</span> {error}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-[#E4E8F0] bg-[#F8F9FB]">
        <div className="flex gap-2 items-end">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={2}
            disabled={isStreaming}
            placeholder="Ask about your script, request alternatives, get more clarity… (⏎ to send)"
            className="flex-1 border border-[#E4E8F0] rounded-xl px-4 py-2.5 text-sm text-[#1B2B4B] placeholder:text-[#C8D0E0] bg-white focus:outline-none focus:ring-2 focus:ring-[#00C8D4] focus:border-transparent resize-none disabled:opacity-50 transition-smooth"
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={isStreaming || !input.trim()}
            className="h-[66px] w-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-smooth disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: 'linear-gradient(135deg, #1B2B4B, #2D4169)' }}
          >
            {isStreaming ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <span className="text-white text-base">↑</span>
            )}
          </button>
        </div>
        <p className="text-[10px] text-[#C8D0E0] mt-1.5 text-center">Shift + Enter for new line</p>
      </div>
    </div>
  )
}

function MessageBubble({ message, isStreaming }: { message: ChatMessage; isStreaming: boolean }) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex items-end gap-2.5 animate-slide-up ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="w-7 h-7 rounded-xl dna-gradient flex items-center justify-center flex-shrink-0 mb-0.5">
          <span className="text-white text-xs">AI</span>
        </div>
      )}
      <div
        className={[
          'max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed',
          isUser
            ? 'rounded-br-sm text-white'
            : 'rounded-bl-sm text-[#1B2B4B] border border-[#E4E8F0] bg-white shadow-sm',
        ].join(' ')}
        style={isUser ? { background: 'linear-gradient(135deg, #1B2B4B, #2D4169)' } : {}}
      >
        {message.content ? (
          <p className="whitespace-pre-wrap">{message.content}</p>
        ) : (
          isStreaming && (
            <span className="inline-flex gap-1 items-center">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00C8D4] animate-bounce [animation-delay:0ms]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#9B4FD8] animate-bounce [animation-delay:150ms]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#FF6B35] animate-bounce [animation-delay:300ms]" />
            </span>
          )
        )}
      </div>
      {isUser && (
        <div className="w-7 h-7 rounded-xl bg-[#EEF1F7] border border-[#E4E8F0] flex items-center justify-center flex-shrink-0 mb-0.5">
          <span className="text-[#1B2B4B] text-xs font-bold">You</span>
        </div>
      )}
    </div>
  )
}
