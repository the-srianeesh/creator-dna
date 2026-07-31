'use client'

import { useState, useRef } from 'react'
import type { AnalysisMode, TranscriptResult } from '@/types'

interface Props {
  onTranscriptAdded: (result: TranscriptResult) => void
  mode: AnalysisMode
  onModeChange: (mode: AnalysisMode) => void
  disabled?: boolean
}

export default function VideoUrlInput({ onTranscriptAdded, mode, onModeChange, disabled }: Props) {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [added, setAdded] = useState<TranscriptResult[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleAdd() {
    const trimmed = url.trim()
    if (!trimmed) return

    if (!trimmed.includes('tiktok.com') && !trimmed.includes('instagram.com')) {
      setError('Only TikTok and Instagram URLs are supported.')
      return
    }

    if (added.find((t) => t.url === trimmed)) {
      setError('This video has already been added.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: trimmed, mode }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to process video.')
      const result = data as TranscriptResult
      setAdded((prev) => [...prev, result])
      onTranscriptAdded(result)
      setUrl('')
      inputRef.current?.focus()
    } catch (e: unknown) {
      const err = e as { message?: string }
      setError(err?.message ?? 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') handleAdd()
  }

  function removeVideo(urlToRemove: string) {
    setAdded((prev) => prev.filter((t) => t.url !== urlToRemove))
  }

  return (
    <div className="space-y-5">

      {/* Analysis mode selector */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-[#8A99B3] mb-2">Analysis Mode</p>
        <div className="grid grid-cols-2 gap-2">
          <ModeCard
            active={mode === 'standard'}
            onClick={() => onModeChange('standard')}
            disabled={disabled || loading}
            icon="⚡"
            title="Standard"
            desc="Uses auto-captions. Fast results in seconds."
          />
          <ModeCard
            active={mode === 'deep'}
            onClick={() => onModeChange('deep')}
            disabled={disabled || loading}
            icon="🔬"
            title="Deep"
            desc="Whisper audio transcription. More accurate."
          />
        </div>
        {mode === 'deep' && (
          <div className="mt-2 flex items-start gap-2 px-3 py-2 rounded-lg bg-orange-50 border border-orange-100">
            <span className="text-orange-400 text-xs mt-0.5">⚠</span>
            <p className="text-xs text-orange-600">Deep mode downloads audio and runs Whisper locally — allow 1–3 min per video.</p>
          </div>
        )}
      </div>

      {/* URL input */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-[#8A99B3] mb-2">Add Video URLs</p>
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="url"
              value={url}
              onChange={(e) => { setUrl(e.target.value); setError(null) }}
              onKeyDown={handleKeyDown}
              placeholder="https://www.tiktok.com/@you/video/…"
              disabled={disabled || loading}
              className="w-full border border-[#E4E8F0] rounded-xl px-4 py-3 text-sm text-[#1B2B4B] placeholder:text-[#8A99B3] bg-white focus:outline-none focus:ring-2 focus:ring-[#00C8D4] focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-smooth"
            />
          </div>
          <button
            onClick={handleAdd}
            disabled={disabled || loading || !url.trim()}
            className="px-5 py-3 rounded-xl text-sm font-semibold text-white navy-gradient hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-smooth flex-shrink-0 flex items-center gap-2"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span className="hidden sm:inline">{mode === 'deep' ? 'Transcribing…' : 'Fetching…'}</span>
              </>
            ) : (
              <>
                <span>+</span>
                <span className="hidden sm:inline">Add</span>
              </>
            )}
          </button>
        </div>
        {error && (
          <p className="mt-2 text-xs text-[#E8365D] flex items-center gap-1">
            <span>✕</span> {error}
          </p>
        )}
      </div>

      {/* Added videos */}
      {added.length > 0 && (
        <div className="animate-fade-in">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#8A99B3] mb-2">
            Added — {added.length} video{added.length !== 1 ? 's' : ''}
          </p>
          <div className="space-y-2">
            {added.map((t, i) => (
              <div
                key={t.url}
                className="flex items-center gap-3 px-4 py-3 rounded-xl border border-[#E4E8F0] bg-[#F8F9FB] animate-slide-up"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: t.metadata.platform === 'tiktok' ? '#010101' : 'linear-gradient(135deg, #F58529, #DD2A7B, #8134AF, #515BD4)' }}>
                  <span className="text-white text-xs">{t.metadata.platform === 'tiktok' ? '♪' : '◻'}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#1B2B4B] truncate">{t.metadata.title || 'Untitled video'}</p>
                  <p className="text-xs text-[#8A99B3]">
                    {t.metadata.duration}s · {t.mode === 'deep' ? '🔬 Deep' : '⚡ Standard'} · {t.transcript.length} chars
                  </p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span className="text-xs text-emerald-600 font-medium">Ready</span>
                  <button
                    onClick={() => removeVideo(t.url)}
                    className="ml-2 text-[#8A99B3] hover:text-[#E8365D] transition-smooth text-sm"
                    title="Remove"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tip */}
      {added.length === 0 && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-[#EEF1F7] border border-[#E4E8F0]">
          <span className="text-[#00C8D4] text-base flex-shrink-0">💡</span>
          <p className="text-xs text-[#5A6A85] leading-relaxed">
            <strong className="text-[#1B2B4B]">Tip:</strong> Add 3–8 of your best-performing videos for the most accurate DNA analysis. Mix different content types for richer style detection.
          </p>
        </div>
      )}
    </div>
  )
}

function ModeCard({
  active, onClick, disabled, icon, title, desc,
}: {
  active: boolean; onClick: () => void; disabled?: boolean; icon: string; title: string; desc: string
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={[
        'relative flex flex-col items-start gap-1 p-3 rounded-xl border text-left transition-smooth',
        active
          ? 'border-[#1B2B4B] bg-[#EEF1F7] shadow-sm'
          : 'border-[#E4E8F0] bg-white hover:border-[#C8D0E0] hover:bg-[#F8F9FB]',
        'disabled:opacity-40 disabled:cursor-not-allowed',
      ].join(' ')}
    >
      {active && (
        <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-[#1B2B4B] flex items-center justify-center">
          <span className="text-white text-[8px]">✓</span>
        </span>
      )}
      <span className="text-base">{icon}</span>
      <p className="text-xs font-semibold text-[#1B2B4B]">{title}</p>
      <p className="text-[11px] text-[#8A99B3] leading-tight">{desc}</p>
    </button>
  )
}
