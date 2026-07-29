'use client'

import type { CreatorFingerprint } from '@/types'

interface Props {
  fingerprint: CreatorFingerprint
}

const DIMENSIONS: { key: keyof CreatorFingerprint; label: string; emoji: string }[] = [
  { key: 'niche', label: 'Niche', emoji: '🎯' },
  { key: 'energyLevel', label: 'Energy Level', emoji: '⚡' },
  { key: 'hookPatterns', label: 'Hook Patterns', emoji: '🎣' },
  { key: 'storytellingStructure', label: 'Storytelling Structure', emoji: '📖' },
  { key: 'humor', label: 'Humor Style', emoji: '😄' },
  { key: 'pacing', label: 'Pacing & Rhythm', emoji: '🥁' },
  { key: 'editingStyle', label: 'Editing Style', emoji: '✂️' },
  { key: 'cameraAngles', label: 'Camera Angles', emoji: '📷' },
  { key: 'vocabulary', label: 'Vocabulary', emoji: '💬' },
  { key: 'emotionalTone', label: 'Emotional Tone', emoji: '🫀' },
  { key: 'ctaStyle', label: 'CTA Style', emoji: '📣' },
  { key: 'audienceInteraction', label: 'Audience Interaction', emoji: '🤝' },
]

export default function FingerprintDisplay({ fingerprint }: Props) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center text-xl">🧬</div>
        <div>
          <h2 className="font-semibold text-zinc-100">Creator DNA</h2>
          <p className="text-xs text-zinc-500">Your unique content fingerprint — 12 dimensions</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {DIMENSIONS.map(({ key, label, emoji }) => (
          <div
            key={key}
            className="bg-zinc-800/60 border border-zinc-700 rounded-xl p-3 space-y-1"
          >
            <p className="text-xs font-semibold text-zinc-500 flex items-center gap-1.5">
              <span>{emoji}</span>
              <span className="uppercase tracking-wider">{label}</span>
            </p>
            <p className="text-sm text-zinc-200 leading-relaxed">{fingerprint[key]}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
