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
  icon: string
  hint: string
  color: string
  visionBacked?: boolean
}[] = [
  { key: 'niche', label: 'Niche', icon: '🎯', hint: 'Content topic and focus area', color: '#00C8D4' },
  { key: 'energyLevel', label: 'Energy Level', icon: '⚡', hint: 'Delivery intensity and presence', color: '#FF6B35' },
  { key: 'hookPatterns', label: 'Hook Patterns', icon: '🎣', hint: 'How they open and grab attention', color: '#9B4FD8' },
  { key: 'storytellingStructure', label: 'Storytelling', icon: '📖', hint: 'Narrative arc and flow', color: '#1B2B4B' },
  { key: 'humor', label: 'Humor Style', icon: '😄', hint: 'Type and frequency of humor', color: '#FF6B35' },
  { key: 'pacing', label: 'Pacing & Rhythm', icon: '🥁', hint: 'Speed, pauses, sentence length', color: '#00C8D4' },
  { key: 'editingStyle', label: 'Editing Style', icon: '✂️', hint: 'Cut style, overlays, transitions', color: '#E8365D', visionBacked: true },
  { key: 'cameraAngles', label: 'Camera Angles', icon: '📷', hint: 'Framing, distance, shot types', color: '#9B4FD8', visionBacked: true },
  { key: 'vocabulary', label: 'Vocabulary', icon: '💬', hint: 'Word choices, slang, sentence length', color: '#1B2B4B' },
  { key: 'emotionalTone', label: 'Emotional Tone', icon: '🫀', hint: 'Emotional register and feeling', color: '#E8365D' },
  { key: 'ctaStyle', label: 'CTA Style', icon: '📣', hint: 'How they close and prompt action', color: '#FF6B35' },
  { key: 'audienceInteraction', label: 'Audience Interaction', icon: '🤝', hint: 'How they address and engage viewers', color: '#00C8D4' },
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

  const changedKeys = (Object.keys(edited) as (keyof CreatorFingerprint)[]).filter(
    (k) => edited[k] !== fingerprint[k]
  )
  const hasChanges = changedKeys.length > 0

  return (
    <div className="space-y-6 animate-fade-in">

      {/* AI confidence banner */}
      <div className="flex items-start gap-4 p-4 rounded-2xl border border-[#E4E8F0] bg-gradient-to-r from-[#EEF1F7] to-white">
        <div className="w-10 h-10 rounded-xl dna-gradient flex items-center justify-center flex-shrink-0">
          <span className="text-white text-lg">🧬</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-[#1B2B4B]">Creator DNA Analysis Complete</p>
            {visualsAnalyzed > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                style={{ background: 'rgba(0,200,212,0.1)', color: '#00A8A8', border: '1px solid rgba(0,200,212,0.2)' }}>
                📷 Vision-backed · {visualsAnalyzed} video{visualsAnalyzed !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <p className="text-xs text-[#5A6A85] mt-1 leading-relaxed">
            Review each dimension below. The AI analyzed your transcripts{visualsAnalyzed > 0 ? ' and actual video frames' : ''} to build this profile.
            Click any field to correct inaccuracies — your edits directly shape the generated content.
          </p>
        </div>
      </div>

      {/* Changes indicator */}
      {hasChanges && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-amber-200 bg-amber-50 animate-slide-up">
          <span className="text-amber-500">✏️</span>
          <p className="text-xs text-amber-700 font-medium">
            {changedKeys.length} dimension{changedKeys.length !== 1 ? 's' : ''} edited — these changes will be used when generating your content.
          </p>
        </div>
      )}

      {/* Dimensions grid */}
      <div className="grid grid-cols-1 gap-3">
        {DIMENSIONS.map(({ key, label, icon, hint, color, visionBacked }, i) => {
          const isEditing = editingKey === key
          const isChanged = edited[key] !== fingerprint[key]

          return (
            <div
              key={key}
              className={[
                'group rounded-2xl border transition-smooth overflow-hidden animate-slide-up',
                isEditing
                  ? 'border-[#00C8D4] shadow-md shadow-cyan-100'
                  : isChanged
                  ? 'border-amber-200 bg-amber-50/30'
                  : 'border-[#E4E8F0] bg-white hover:border-[#C8D0E0] hover:shadow-sm',
              ].join(' ')}
              style={{ animationDelay: `${i * 30}ms` }}
            >
              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  {/* Label row */}
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-sm"
                      style={{ background: `${color}15`, border: `1px solid ${color}30` }}
                    >
                      {icon}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-semibold text-[#1B2B4B] uppercase tracking-wide">{label}</span>
                        {visionBacked && visualsAnalyzed > 0 && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wide"
                            style={{ background: 'rgba(0,200,212,0.1)', color: '#00A8A8' }}>
                            VISION
                          </span>
                        )}
                        {isChanged && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wide bg-amber-100 text-amber-600">
                            EDITED
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-[#8A99B3] mt-0.5">{hint}</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {isChanged && !isEditing && (
                      <button
                        onClick={() => handleReset(key)}
                        className="text-[11px] text-[#8A99B3] hover:text-[#5A6A85] transition-smooth font-medium"
                      >
                        ↺ Reset
                      </button>
                    )}
                    <button
                      onClick={() => setEditingKey(isEditing ? null : key)}
                      className={[
                        'text-[11px] font-semibold transition-smooth px-2.5 py-1 rounded-lg',
                        isEditing
                          ? 'bg-[#1B2B4B] text-white'
                          : 'text-[#1B2B4B] bg-[#EEF1F7] hover:bg-[#E4E8F0]',
                      ].join(' ')}
                    >
                      {isEditing ? '✓ Done' : 'Edit'}
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div className="mt-3 pl-9">
                  {isEditing ? (
                    <textarea
                      autoFocus
                      rows={3}
                      value={edited[key]}
                      onChange={(e) => handleChange(key, e.target.value)}
                      className="w-full border border-[#00C8D4] rounded-xl px-3 py-2.5 text-sm text-[#1B2B4B] bg-white focus:outline-none focus:ring-2 focus:ring-[#00C8D4]/30 resize-none transition-smooth"
                    />
                  ) : (
                    <p
                      className="text-sm text-[#5A6A85] leading-relaxed cursor-pointer group-hover:text-[#1B2B4B] transition-smooth"
                      onClick={() => setEditingKey(key)}
                      title="Click to edit"
                    >
                      {edited[key]}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Confirm */}
      <button
        onClick={() => onConfirm(edited)}
        disabled={isLoading}
        className="w-full py-4 rounded-2xl text-sm font-bold text-white transition-smooth disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden group"
        style={{ background: 'linear-gradient(135deg, #1B2B4B 0%, #2D4169 100%)' }}
      >
        <span className="relative z-10">
          {isLoading
            ? 'Saving your DNA…'
            : hasChanges
            ? `Confirm ${changedKeys.length} Edit${changedKeys.length !== 1 ? 's' : ''} & Continue →`
            : 'DNA Looks Right — Continue to Brief →'}
        </span>
        <div className="absolute inset-0 dna-gradient opacity-0 group-hover:opacity-20 transition-smooth" />
      </button>
    </div>
  )
}
