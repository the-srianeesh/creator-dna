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

    // Basic URL check
    if (!trimmed.includes('tiktok.com') && !trimmed.includes('instagram.com')) {
      setError('Only TikTok and Instagram URLs are supported.')
      return
    }

    // Prevent duplicates
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

      if (!res.ok) {
        throw new Error(data.error ?? 'Failed to process video.')
      }

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
    <div className="space-y-4">
      {/* Mode Toggle */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-zinc-400">Analysis mode:</span>
        <div className="flex rounded-lg border border-zinc-700 overflow-hidden">
          <ModeButton
            label="⚡ Standard"
            desc="Uses auto-captions (fast)"
            active={mode === 'standard'}
            onClick={() => onModeChange('standard')}
            disabled={disabled || loading}
          />
          <ModeButton
            label="🔬 Deep"
            desc="Whisper audio transcription (accurate)"
            active={mode === 'deep'}
            onClick={() => onModeChange('deep')}
            disabled={disabled || loading}
          />
        </div>
      </div>

      {/* URL Input */}
      <div className="flex gap-2">
        <input
          ref={inputRef}
          type="url"
          value={url}
          onChange={(e) => { setUrl(e.target.value); setError(null) }}
          onKeyDown={handleKeyDown}
          placeholder="Paste a TikTok or Instagram video URL…"
          disabled={disabled || loading}
          className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:opacity-50"
        />
        <button
          onClick={handleAdd}
          disabled={disabled || loading || !url.trim()}
          className="px-5 py-3 bg-violet-600 hover:bg-violet-500 disabled:bg-violet-900 disabled:cursor-not-allowed text-white font-medium text-sm rounded-xl transition-colors flex-shrink-0"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              {mode === 'deep' ? 'Transcribing…' : 'Fetching…'}
            </span>
          ) : (
            '+ Add'
          )}
        </button>
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      {mode === 'deep' && (
        <p className="text-xs text-amber-500/80 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
          ⚠️ Deep mode downloads audio and runs Whisper locally. This can take 1–3 minutes per video.
        </p>
      )}

      {/* Added videos list */}
      {added.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Added videos ({added.length})</p>
          {added.map((t) => (
            <div
              key={t.url}
              className="flex items-start gap-3 bg-zinc-800/60 border border-zinc-700 rounded-lg px-3 py-2.5"
            >
              <span className="text-base mt-0.5">{t.metadata.platform === 'tiktok' ? '🎵' : '📸'}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-zinc-200 truncate">{t.metadata.title || t.url}</p>
                <p className="text-xs text-zinc-500 mt-0.5">
                  {t.metadata.duration}s · {t.mode === 'deep' ? '🔬 Deep' : '⚡ Standard'} ·{' '}
                  {t.transcript.length > 0 ? `${t.transcript.length} chars transcribed` : 'no transcript'}
                </p>
              </div>
              <button
                onClick={() => removeVideo(t.url)}
                className="text-zinc-600 hover:text-red-400 transition-colors text-sm flex-shrink-0"
                title="Remove"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ModeButton({
  label, desc, active, onClick, disabled,
}: {
  label: string; desc: string; active: boolean; onClick: () => void; disabled?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={desc}
      className={[
        'px-4 py-2 text-xs font-medium transition-colors',
        active ? 'bg-violet-600 text-white' : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200',
        'disabled:opacity-50 disabled:cursor-not-allowed',
      ].join(' ')}
    >
      {label}
    </button>
  )
}
