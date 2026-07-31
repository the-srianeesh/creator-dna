'use client'

import { useState } from 'react'
import type { ContentDirection } from '@/types'

interface Props {
  directions: ContentDirection[]
  onDirectionSelect?: (index: number) => void
  selectedIndex?: number
}

const DIRECTION_ACCENTS = [
  { border: '#00C8D4', bg: 'rgba(0,200,212,0.06)', num: '#00C8D4', badge: { bg: 'rgba(0,200,212,0.1)', color: '#00A8A8' } },
  { border: '#9B4FD8', bg: 'rgba(155,79,216,0.06)', num: '#9B4FD8', badge: { bg: 'rgba(155,79,216,0.1)', color: '#9B4FD8' } },
  { border: '#FF6B35', bg: 'rgba(255,107,53,0.06)', num: '#FF6B35', badge: { bg: 'rgba(255,107,53,0.1)', color: '#E8365D' } },
]

export default function ContentDirections({ directions, onDirectionSelect, selectedIndex }: Props) {
  const [expanded, setExpanded] = useState<number | null>(0)
  const [copied, setCopied] = useState<string | null>(null)

  function toggle(i: number) {
    setExpanded((prev) => (prev === i ? null : i))
    onDirectionSelect?.(i)
  }

  async function copyScript(dir: ContentDirection, i: number) {
    const text = `HOOK:\n${dir.script.hook}\n\nBODY:\n${dir.script.body}\n\nCTA:\n${dir.script.cta}`
    await navigator.clipboard.writeText(text)
    setCopied(`${i}`)
    setTimeout(() => setCopied(null), 2000)
  }

  if (directions.length === 0) return null

  return (
    <div className="space-y-3 animate-fade-in">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-[#1B2B4B]">Your Content Directions</h2>
          <p className="text-sm text-[#8A99B3] mt-0.5">3 directions written in your voice — each takes a different creative angle</p>
        </div>
        <div className="w-8 h-8 rounded-xl dna-gradient flex items-center justify-center flex-shrink-0">
          <span className="text-white text-sm">✨</span>
        </div>
      </div>

      {directions.map((dir, i) => {
        const accent = DIRECTION_ACCENTS[i % DIRECTION_ACCENTS.length]
        const isOpen = expanded === i
        const isSelected = selectedIndex === i

        return (
          <div
            key={i}
            className={[
              'rounded-2xl border transition-smooth overflow-hidden animate-slide-up',
              isSelected ? 'ring-2 ring-offset-1' : '',
            ].join(' ')}
            style={{
              borderColor: isOpen ? accent.border : '#E4E8F0',
              background: isOpen ? accent.bg : 'white',
              animationDelay: `${i * 80}ms`,
            }}
          >
            {/* Header */}
            <button
              onClick={() => toggle(i)}
              className="w-full flex items-start gap-4 p-5 text-left hover:bg-black/[0.02] transition-smooth"
            >
              {/* Number */}
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 font-black text-lg border-2"
                style={{ borderColor: accent.border, color: accent.num, background: `${accent.border}15` }}
              >
                {i + 1}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-[#1B2B4B] text-sm">{dir.title}</h3>
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full tracking-wide"
                    style={accent.badge}
                  >
                    DIRECTION {i + 1}
                  </span>
                </div>
                <p className="text-sm text-[#5A6A85] mt-1 leading-snug">{dir.angle}</p>
              </div>

              <span className="text-[#8A99B3] flex-shrink-0 mt-1 text-sm">
                {isOpen ? '▲' : '▼'}
              </span>
            </button>

            {/* Expanded */}
            {isOpen && (
              <div className="border-t px-5 pb-5 pt-4 space-y-5 animate-slide-up" style={{ borderColor: `${accent.border}30` }}>

                {/* Rationale — AI explains itself */}
                <div className="flex items-start gap-3 p-3 rounded-xl"
                  style={{ background: `${accent.border}08`, border: `1px solid ${accent.border}20` }}>
                  <span className="text-sm flex-shrink-0 mt-0.5">🧠</span>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: accent.num }}>
                      Why this fits your style
                    </p>
                    <p className="text-xs text-[#5A6A85] leading-relaxed">{dir.rationale}</p>
                  </div>
                </div>

                {/* Script */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-bold uppercase tracking-wider text-[#1B2B4B]">Full Script</p>
                    <button
                      onClick={() => copyScript(dir, i)}
                      className="text-xs font-semibold px-3 py-1 rounded-lg transition-smooth"
                      style={{
                        background: copied === `${i}` ? 'rgba(0,200,212,0.1)' : '#EEF1F7',
                        color: copied === `${i}` ? '#00A8A8' : '#5A6A85',
                      }}
                    >
                      {copied === `${i}` ? '✓ Copied!' : '⎘ Copy script'}
                    </button>
                  </div>
                  <div className="space-y-2">
                    <ScriptSection
                      label="Hook" icon="🎣"
                      content={dir.script.hook}
                      accent={accent.border}
                    />
                    <ScriptSection
                      label="Body" icon="📖"
                      content={dir.script.body}
                      accent="#1B2B4B"
                    />
                    <ScriptSection
                      label="CTA" icon="📣"
                      content={dir.script.cta}
                      accent="#FF6B35"
                    />
                  </div>
                </div>

                {/* Visual notes */}
                <div className="p-3 rounded-xl bg-[#F8F9FB] border border-[#E4E8F0]">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#8A99B3] mb-1.5">📸 Visual & Editing Notes</p>
                  <p className="text-xs text-[#5A6A85] leading-relaxed italic">{dir.visualNotes}</p>
                </div>

                {/* Ask AI button */}
                {onDirectionSelect && (
                  <button
                    onClick={() => onDirectionSelect(i)}
                    className={[
                      'w-full py-2.5 px-4 rounded-xl text-sm font-semibold transition-smooth border',
                      isSelected
                        ? 'text-white border-transparent'
                        : 'text-[#1B2B4B] border-[#E4E8F0] hover:border-[#1B2B4B] bg-white',
                    ].join(' ')}
                    style={isSelected ? { background: `linear-gradient(135deg, #1B2B4B, #2D4169)` } : {}}
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

function ScriptSection({ label, icon, content, accent }: {
  label: string; icon: string; content: string; accent: string
}) {
  return (
    <div className="rounded-xl overflow-hidden border border-[#E4E8F0]">
      <div className="flex items-center gap-2 px-3 py-2 bg-[#F8F9FB] border-b border-[#E4E8F0]">
        <span className="text-sm">{icon}</span>
        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: accent }}>{label}</span>
      </div>
      <div className="px-4 py-3 bg-white">
        <p className="text-sm text-[#1B2B4B] leading-relaxed whitespace-pre-wrap">{content}</p>
      </div>
    </div>
  )
}
