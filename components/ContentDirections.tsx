'use client'

import { useState } from 'react'
import type { ContentDirection } from '@/types'

interface Props {
  directions: ContentDirection[]
  onDirectionSelect?: (index: number) => void
  selectedIndex?: number
}

const DIRECTION_COLORS = [
  { border: 'border-violet-500', badge: 'bg-violet-500/20 text-violet-300', num: 'text-violet-400' },
  { border: 'border-cyan-500', badge: 'bg-cyan-500/20 text-cyan-300', num: 'text-cyan-400' },
  { border: 'border-emerald-500', badge: 'bg-emerald-500/20 text-emerald-300', num: 'text-emerald-400' },
]

export default function ContentDirections({ directions, onDirectionSelect, selectedIndex }: Props) {
  const [expanded, setExpanded] = useState<number | null>(0)

  function toggle(i: number) {
    setExpanded((prev) => (prev === i ? null : i))
    onDirectionSelect?.(i)
  }

  if (directions.length === 0) return null

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-zinc-100">Your 3 Content Directions</h2>
        <span className="text-xs text-zinc-500">Click a direction to expand the full script</span>
      </div>

      {directions.map((dir, i) => {
        const color = DIRECTION_COLORS[i % DIRECTION_COLORS.length]
        const isOpen = expanded === i
        const isSelected = selectedIndex === i

        return (
          <div
            key={i}
            className={[
              'rounded-xl border bg-zinc-900 overflow-hidden transition-all',
              color.border,
              isSelected ? 'ring-2 ring-white/10' : '',
            ].join(' ')}
          >
            {/* Header — always visible */}
            <button
              onClick={() => toggle(i)}
              className="w-full flex items-start gap-4 p-5 text-left hover:bg-zinc-800/50 transition-colors"
            >
              <span className={`text-3xl font-black mt-0.5 ${color.num}`}>{i + 1}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-zinc-100">{dir.title}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${color.badge}`}>
                    Direction {i + 1}
                  </span>
                </div>
                <p className="text-sm text-zinc-400 mt-1">{dir.angle}</p>
              </div>
              <span className="text-zinc-500 mt-1 flex-shrink-0">{isOpen ? '▲' : '▼'}</span>
            </button>

            {/* Expanded content */}
            {isOpen && (
              <div className="border-t border-zinc-800 p-5 space-y-5">
                {/* Rationale */}
                <Section label="Why This Fits You">
                  <p className="text-sm text-zinc-300 leading-relaxed">{dir.rationale}</p>
                </Section>

                {/* Script */}
                <Section label="Script">
                  <div className="space-y-3">
                    <ScriptBlock label="🎣 Hook" content={dir.script.hook} color="violet" />
                    <ScriptBlock label="📖 Body" content={dir.script.body} color="zinc" />
                    <ScriptBlock label="📣 CTA" content={dir.script.cta} color="emerald" />
                  </div>
                </Section>

                {/* Visual Notes */}
                <Section label="📸 Visual & Editing Notes">
                  <p className="text-sm text-zinc-300 leading-relaxed italic">{dir.visualNotes}</p>
                </Section>

                {/* Select for chat */}
                {onDirectionSelect && (
                  <button
                    onClick={() => onDirectionSelect(i)}
                    className={[
                      'w-full py-2.5 px-4 rounded-lg text-sm font-medium transition-colors',
                      isSelected
                        ? 'bg-white/10 text-white border border-white/20'
                        : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700',
                    ].join(' ')}
                  >
                    {isSelected ? '✓ Discussing this direction in chat' : 'Ask AI about this direction →'}
                  </button>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">{label}</p>
      {children}
    </div>
  )
}

function ScriptBlock({
  label,
  content,
  color,
}: {
  label: string
  content: string
  color: 'violet' | 'zinc' | 'emerald'
}) {
  const bg = {
    violet: 'bg-violet-950/40 border-violet-800/50',
    zinc: 'bg-zinc-800/60 border-zinc-700/50',
    emerald: 'bg-emerald-950/40 border-emerald-800/50',
  }[color]

  return (
    <div className={`rounded-lg border p-3 ${bg}`}>
      <p className="text-xs font-semibold text-zinc-500 mb-1.5">{label}</p>
      <p className="text-sm text-zinc-200 leading-relaxed whitespace-pre-wrap">{content}</p>
    </div>
  )
}
