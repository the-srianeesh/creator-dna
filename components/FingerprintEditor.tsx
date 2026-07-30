'use client'

import { useState } from 'react'
import type { CreatorFingerprint } from '@/types'

interface Props {
  fingerprint: CreatorFingerprint
  onConfirm: (fingerprint: CreatorFingerprint) => void
  isLoading?: boolean
  visualsAnalyzed?: number
}

const DIMENSIONS: {
  key: keyof CreatorFingerprint
  label: string
  emoji: string
  hint: string
  visionBacked?: boolean
}[] = [
  { key: 'niche', label: 'Niche', emoji: '🎯', hint: 'Content topic and focus area' },
  { key: 'energyLevel', label: 'Energy Level', emoji: '⚡', hint: 'Delivery intensity and presence' },
  { key: 'hookPatterns', label: 'Hook Patterns', emoji: '🎣', hint: 'How they open and grab attention' },
  { key: 'storytellingStructure', label: 'Storytelling Structure', emoji: '📖', hint: 'Narrative arc and flow' },
  { key: 'humor', label: 'Humor Style', emoji: '😄', hint: 'Type and frequency of humor' },
  { key: 'pacing', label: 'Pacing & Rhythm', emoji: '🥁', hint: 'Speed, pauses, sentence length' },
  { key: 'editingStyle', label: 'Editing Style', emoji: '✂️', hint: 'Cut style, overlays, transitions', visionBacked: true },
  { key: 'cameraAngles', label: 'Camera Angles', emoji: '📷', hint: 'Framing, distance, shot types', visionBacked: true },
  { key: 'vocabulary', label: 'Vocabulary', emoji: '💬', hint: 'Word choices, slang, sentence length' },
  { key: 'emotionalTone', label: 'Emotional Tone', emoji: '🫀', hint: 'Emotional register and feeling' },
  { key: 'ctaStyle', label: 'CTA Style', emoji: '📣', hint: 'How they close and prompt action' },
  { key: 'audienceInteraction', label: 'Audience Interaction', emoji: '🤝', hint: 'How they address and engage viewers' },
]

export default function FingerprintEditor({
  fingerprint,
  onConfirm,
  isLoading = false,
  visualsAnalyzed = 0,
}: Props) {
  const [edited, setEdited] = useState<CreatorFingerprint>({ ...fingerprint })
  const [editingKey, setEditingKey] = useState<keyof CreatorFingerprint | null>(null)

  function handleChange(key: keyof CreatorFingerprint, value: string) {
    setEdited((prev) => ({ ...prev, [key]: value }))
  }

  function handleReset(key: keyof CreatorFingerprint) {
    setEdited((prev) => ({ ...prev, [key]: fingerprint[key] }))
    setEditingKey(null)
  }

  const hasChanges = (Object.keys(edited) as (keyof CreatorFingerprint)[]).some(
    (k) => edited[k] !== fingerprint[k]
  )

  return (
    <div className="space-y-5">
      {/* Header info */}
      <div className="flex items-start gap-3 bg-zinc-800/40 border border-zinc-700 rounded-xl p-4">
        <span className="text-2xl">🧬</span>
        <div className="space-y-1">
          <p className="text-sm font-medium text-zinc-200">Your Creator DNA is ready</p>
          <p className="text-xs text-zinc-500">
            Review each dimension below. Click any field to correct inaccuracies before generating content.
            {visualsAnalyzed > 0 && (
              <span className="ml-1 text-violet-400">
                📷 Camera angles grounded in actual frame analysis from {visualsAnalyzed} video{visualsAnalyzed !== 1 ? 's' : ''}.
              </span>
            )}
          </p>
        </div>
      </div>

      {hasChanges && (
        <div className="text-xs text-amber-400 bg-amber-900/20 border border-amber-700/40 rounded-lg px-3 py-2">
          ✏️ You've edited {(Object.keys(edited) as (keyof CreatorFingerprint)[]).filter((k) => edited[k] !== fingerprint[k]).length} dimension(s). These changes will be used when generating your content directions.
        </div>
      )}

      {/* Dimension cards */}
      <div className="space-y-3">
        {DIMENSIONS.map(({ key, label, emoji, hint, visionBacked }) => {
          const isEditing = editingKey === key
          const isChanged = edited[key] !== fingerprint[key]

          return (
            <div
              key={key}
              className={[
                'bg-zinc-900 border rounded-xl p-4 transition-colors',
                isEditing ? 'border-violet-500' : isChanged ? 'border-amber-600/60' : 'border-zinc-800',
              ].join(' ')}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-base flex-shrink-0">{emoji}</span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">{label}</p>
                      {visionBacked && visualsAnalyzed > 0 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-900/40 text-violet-400 border border-violet-800/50">
                          📷 vision
                        </span>
                      )}
                      {isChanged && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-900/40 text-amber-400 border border-amber-800/50">
                          edited
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-zinc-600 mt-0.5">{hint}</p>
                  </div>
                </div>

                <div className="flex gap-2 flex-shrink-0">
                  {isChanged && !isEditing && (
                    <button
                      onClick={() => handleReset(key)}
                      className="text-[11px] text-zinc-600 hover:text-zinc-400 transition-colors"
                    >
                      ↺ reset
                    </button>
                  )}
                  <button
                    onClick={() => setEditingKey(isEditing ? null : key)}
                    className="text-[11px] text-violet-500 hover:text-violet-300 transition-colors"
                  >
                    {isEditing ? 'done' : '✏️ edit'}
                  </button>
                </div>
              </div>

              <div className="mt-3">
                {isEditing ? (
                  <textarea
                    autoFocus
                    rows={3}
                    value={edited[key]}
                    onChange={(e) => handleChange(key, e.target.value)}
                    className="w-full bg-zinc-800 border border-violet-600/50 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
                  />
                ) : (
                  <p
                    className="text-sm text-zinc-300 leading-relaxed cursor-pointer hover:text-zinc-100 transition-colors"
                    onClick={() => setEditingKey(key)}
                  >
                    {edited[key]}
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Confirm button */}
      <button
        onClick={() => onConfirm(edited)}
        disabled={isLoading}
        className="w-full py-3 bg-violet-600 hover:bg-violet-500 disabled:bg-violet-900 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors"
      >
        {isLoading
          ? 'Saving…'
          : hasChanges
          ? '✓ Confirm Edited DNA & Continue →'
          : 'DNA Looks Good — Continue →'}
      </button>
    </div>
  )
}
