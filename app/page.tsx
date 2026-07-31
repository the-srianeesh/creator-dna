'use client'

import { useState, useEffect, useRef } from 'react'
import { flattenFingerprint } from '@/lib/fingerprint'
import VideoUrlInput from '@/components/VideoUrlInput'
import FingerprintEditor from '@/components/FingerprintEditor'
import BrandBriefForm from '@/components/BrandBriefForm'
import ContentDirections from '@/components/ContentDirections'
import ChatInterface from '@/components/ChatInterface'
import type {
  AnalysisMode,
  TranscriptResult,
  CreatorFingerprint,
  BrandBrief,
  ContentDirection,
  ChatMessage,
} from '@/types'

// ─── Steps ────────────────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, label: 'Add Videos', icon: '📹', desc: 'Upload your portfolio' },
  { id: 2, label: 'Review DNA', icon: '🧬', desc: 'Confirm your style profile' },
  { id: 3, label: 'Brand Brief', icon: '📋', desc: 'Describe the campaign' },
  { id: 4, label: 'Generate', icon: '✨', desc: 'Get your content directions' },
]

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Home() {
  const [sessionId, setSessionId] = useState<string | null>(null)
  const sessionIdRef = useRef<string | null>(null)
  const [step, setStep] = useState(0) // 0 = landing
  const [mode, setMode] = useState<AnalysisMode>('standard')
  const [transcripts, setTranscripts] = useState<TranscriptResult[]>([])
  const [fingerprint, setFingerprint] = useState<CreatorFingerprint | null>(null)
  const [brief, setBrief] = useState<BrandBrief | null>(null)
  const [directions, setDirections] = useState<ContentDirection[]>([])
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([])
  const [selectedDirectionIndex, setSelectedDirectionIndex] = useState<number>(0)

  const [analyzing, setAnalyzing] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [savingBrief, setSavingBrief] = useState(false)
  const [savingFingerprint, setSavingFingerprint] = useState(false)
  const [visualsAnalyzed, setVisualsAnalyzed] = useState(0)
  const [error, setError] = useState<string | null>(null)

  // ─── Session init ──────────────────────────────────────────────────────────

  useEffect(() => {
    const stored = localStorage.getItem('creatordna_session')
    if (stored) {
      fetch(`/api/session?sessionId=${stored}`)
        .then((r) => r.json())
        .then(({ session }) => {
          if (!session) throw new Error('expired')
          setSessionId(stored)
          sessionIdRef.current = stored
          setTranscripts(session.transcripts ?? [])
          setFingerprint(session.fingerprint ? flattenFingerprint(session.fingerprint) : null)
          setBrief(session.brief ?? null)
          setDirections(session.directions ?? [])
          setChatHistory(session.chatHistory ?? [])

          if (session.directions?.length > 0) setStep(4)
          else if (session.brief) setStep(4)
          else if (session.fingerprint) setStep(2)
          else if (session.transcripts?.length > 0) setStep(1)
          else setStep(1)
        })
        .catch(() => createNewSession())
    } else {
      createNewSession()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function createNewSession() {
    const res = await fetch('/api/session', { method: 'POST' })
    const { sessionId: id } = await res.json()
    setSessionId(id)
    sessionIdRef.current = id
    localStorage.setItem('creatordna_session', id)
  }

  // ─── Handlers ─────────────────────────────────────────────────────────────

  function handleTranscriptAdded(result: TranscriptResult) {
    setTranscripts((prev) => {
      const exists = prev.find((t) => t.url === result.url)
      if (exists) return prev
      return [...prev, result]
    })
    const sid = sessionIdRef.current ?? sessionId
    if (sid) {
      fetch('/api/session', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: sid, transcript: result }),
      })
    }
  }

  async function handleContinueToAnalysis() {
    if (!sessionId || transcripts.length === 0) return
    setAnalyzing(true)
    setError(null)
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Analysis failed.')
      setFingerprint(flattenFingerprint(data.fingerprint))
      setVisualsAnalyzed(data.visualsAnalyzed ?? 0)
      setStep(2)
    } catch (e: unknown) {
      const err = e as { message?: string }
      setError(err?.message ?? 'Analysis failed. Please try again.')
    } finally {
      setAnalyzing(false)
    }
  }

  async function handleFingerprintConfirm(fp: CreatorFingerprint) {
    if (!sessionId) return
    setSavingFingerprint(true)
    setError(null)
    try {
      const safe = flattenFingerprint(fp)
      await fetch('/api/session', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, fingerprint: safe }),
      })
      setFingerprint(safe)
      setStep(3)
    } catch (e: unknown) {
      const err = e as { message?: string }
      setError(err?.message ?? 'Failed to save fingerprint.')
    } finally {
      setSavingFingerprint(false)
    }
  }

  async function handleBriefSubmit(b: BrandBrief) {
    if (!sessionId) return
    setSavingBrief(true)
    setError(null)
    try {
      const saveRes = await fetch('/api/session', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, brief: b }),
      })
      if (!saveRes.ok) throw new Error('Failed to save brief.')
      setBrief(b)

      setGenerating(true)
      const genRes = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      })
      const genData = await genRes.json()
      if (!genRes.ok) throw new Error(genData.error ?? 'Generation failed.')
      setDirections(genData.directions)
      setStep(4)
    } catch (e: unknown) {
      const err = e as { message?: string }
      setError(err?.message ?? 'Something went wrong. Please try again.')
    } finally {
      setSavingBrief(false)
      setGenerating(false)
    }
  }

  async function handleRegenerate() {
    if (!sessionId) return
    setGenerating(true)
    setError(null)
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Generation failed.')
      setDirections(data.directions)
    } catch (e: unknown) {
      const err = e as { message?: string }
      setError(err?.message ?? 'Generation failed. Please try again.')
    } finally {
      setGenerating(false)
    }
  }

  function handleReset() {
    localStorage.removeItem('creatordna_session')
    setSessionId(null)
    setStep(1)
    setTranscripts([])
    setFingerprint(null)
    setBrief(null)
    setDirections([])
    setChatHistory([])
    setError(null)
    createNewSession()
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#F8F9FB]">

      {/* ── Top Nav ── */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-[#E4E8F0]">
        <div className="max-w-5xl mx-auto px-5 py-3 flex items-center justify-between">
          {/* Logo */}
          <button
            onClick={() => step > 0 && handleReset()}
            className="flex items-center gap-2.5 group"
          >
            <div className="w-8 h-8 rounded-xl dna-gradient flex items-center justify-center flex-shrink-0">
              <span className="text-white text-sm font-black">C</span>
            </div>
            <div className="leading-none">
              <span className="text-sm font-light text-[#1B2B4B] tracking-tight">CREATOR</span>
              <span className="text-sm font-black text-[#1B2B4B] tracking-tight">DNA</span>
            </div>
          </button>

          {/* Step progress — only when in flow */}
          {step >= 1 && (
            <div className="hidden sm:flex items-center gap-0">
              {STEPS.map((s, i) => {
                const done = s.id < step
                const active = s.id === step
                return (
                  <div key={s.id} className="flex items-center">
                    <button
                      onClick={() => done && setStep(s.id)}
                      disabled={!done}
                      className={[
                        'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-smooth',
                        active ? 'bg-[#EEF1F7] text-[#1B2B4B]' : done ? 'text-[#5A6A85] hover:text-[#1B2B4B] cursor-pointer' : 'text-[#C8D0E0] cursor-default',
                      ].join(' ')}
                    >
                      <span className={[
                        'w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center flex-shrink-0',
                        done ? 'text-white' : active ? 'bg-[#1B2B4B] text-white' : 'bg-[#E4E8F0] text-[#C8D0E0]',
                      ].join(' ')}
                        style={done ? { background: 'linear-gradient(135deg, #00C8D4, #9B4FD8)' } : {}}
                      >
                        {done ? '✓' : s.id}
                      </span>
                      <span className="hidden md:inline">{s.label}</span>
                    </button>
                    {i < STEPS.length - 1 && (
                      <div className={[
                        'w-6 h-px mx-0.5',
                        done ? 'bg-gradient-to-r from-[#00C8D4] to-[#9B4FD8]' : 'bg-[#E4E8F0]',
                      ].join(' ')} />
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Right actions */}
          <div className="flex items-center gap-2">
            {step >= 1 && (
              <button
                onClick={handleReset}
                className="text-xs font-medium text-[#8A99B3] hover:text-[#1B2B4B] transition-smooth px-3 py-1.5 rounded-lg hover:bg-[#EEF1F7]"
              >
                Start over
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ── Landing / Hero (step 0) ── */}
      {step === 0 && (
        <div className="animate-fade-in">
          {/* Hero */}
          <section className="max-w-4xl mx-auto px-5 pt-20 pb-16 text-center">
            {/* DNA helix decoration */}
            <div className="flex justify-center mb-8">
              <div className="relative">
                <div className="w-20 h-20 rounded-3xl dna-gradient flex items-center justify-center shadow-xl shadow-cyan-200/40">
                  <span className="text-4xl">🧬</span>
                </div>
                <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-[#FF6B35] flex items-center justify-center shadow-md">
                  <span className="text-white text-xs">✨</span>
                </div>
              </div>
            </div>

            <h1 className="text-4xl sm:text-5xl font-black text-[#1B2B4B] leading-tight tracking-tight mb-4">
              Your Creative DNA,<br />
              <span className="dna-gradient-text">Decoded.</span>
            </h1>
            <p className="text-lg text-[#5A6A85] max-w-xl mx-auto leading-relaxed mb-10">
              Upload your portfolio. Get a precise analysis of your creative style.
              Generate brand campaigns written entirely in your voice.
            </p>

            <button
              onClick={() => setStep(1)}
              className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl text-white font-bold text-base transition-smooth hover:opacity-90 hover:scale-[1.02] shadow-lg shadow-navy-900/20 relative overflow-hidden group"
              style={{ background: 'linear-gradient(135deg, #1B2B4B 0%, #2D4169 100%)' }}
            >
              <span className="relative z-10">Start Analyzing Your DNA</span>
              <span className="relative z-10 text-lg">→</span>
              <div className="absolute inset-0 dna-gradient opacity-0 group-hover:opacity-20 transition-smooth" />
            </button>

            <p className="mt-4 text-xs text-[#8A99B3]">Works with TikTok & Instagram · No account required</p>
          </section>

          {/* How it works */}
          <section className="max-w-4xl mx-auto px-5 pb-20">
            <p className="text-xs font-bold uppercase tracking-widest text-[#8A99B3] text-center mb-8">How it works</p>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              {STEPS.map((s, i) => (
                <div
                  key={s.id}
                  className="bg-white rounded-2xl border border-[#E4E8F0] p-5 space-y-3 animate-slide-up"
                  style={{ animationDelay: `${i * 80}ms` }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center text-base"
                      style={{ background: ['rgba(0,200,212,0.1)', 'rgba(155,79,216,0.1)', 'rgba(255,107,53,0.1)', 'rgba(27,43,75,0.08)'][i] }}>
                      {s.icon}
                    </div>
                    <span className="text-xs font-black text-[#C8D0E0]">0{s.id}</span>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[#1B2B4B]">{s.label}</p>
                    <p className="text-xs text-[#8A99B3] mt-0.5">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {/* ── Workflow Steps ── */}
      {step >= 1 && (
        <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">

          {/* Error banner */}
          {error && (
            <div className="flex items-start gap-3 px-4 py-3 rounded-xl border border-red-100 bg-red-50 animate-slide-up">
              <span className="text-red-400 flex-shrink-0">⚠</span>
              <p className="text-sm text-red-700 flex-1">{error}</p>
              <button onClick={() => setError(null)} className="text-red-300 hover:text-red-500 transition-smooth flex-shrink-0">✕</button>
            </div>
          )}

          {/* ── Step 1 — Add Videos ── */}
          {step === 1 && (
            <div className="animate-slide-up">
              <StepCard
                step={1}
                title="Add Your Videos"
                subtitle="Paste public TikTok or Instagram URLs from your profile. The AI will analyze your style across all dimensions."
                accent="#00C8D4"
              >
                <VideoUrlInput
                  mode={mode}
                  onModeChange={setMode}
                  onTranscriptAdded={handleTranscriptAdded}
                  disabled={analyzing}
                />

                {transcripts.length > 0 && (
                  <div className="pt-2 animate-slide-up">
                    {/* Readiness indicator */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="flex gap-0.5">
                          {[1,2,3,4,5].map((n) => (
                            <div
                              key={n}
                              className="w-5 h-1.5 rounded-full transition-smooth"
                              style={{
                                background: transcripts.length >= n
                                  ? 'linear-gradient(90deg, #00C8D4, #9B4FD8)'
                                  : '#E4E8F0'
                              }}
                            />
                          ))}
                        </div>
                        <span className="text-xs text-[#8A99B3]">
                          {transcripts.length < 3
                            ? `Add ${3 - transcripts.length} more for best results`
                            : transcripts.length >= 5
                            ? 'Great sample size!'
                            : 'Good — add more for richer analysis'}
                        </span>
                      </div>
                      <span className="text-xs font-bold text-[#1B2B4B]">{transcripts.length} video{transcripts.length !== 1 ? 's' : ''}</span>
                    </div>

                    <button
                      onClick={handleContinueToAnalysis}
                      disabled={analyzing}
                      className="w-full py-4 rounded-2xl text-sm font-bold text-white transition-smooth disabled:opacity-60 disabled:cursor-not-allowed relative overflow-hidden group"
                      style={{ background: 'linear-gradient(135deg, #1B2B4B 0%, #2D4169 100%)' }}
                    >
                      {analyzing ? (
                        <span className="flex items-center justify-center gap-3">
                          <DNALoader />
                          Analyzing style + extracting video frames…
                        </span>
                      ) : (
                        <span className="relative z-10">Analyze My Creator DNA →</span>
                      )}
                      <div className="absolute inset-0 dna-gradient opacity-0 group-hover:opacity-20 transition-smooth" />
                    </button>
                  </div>
                )}
              </StepCard>
            </div>
          )}

          {/* ── Step 2 — Review DNA ── */}
          {step === 2 && fingerprint && (
            <div className="animate-slide-up">
              <StepCard
                step={2}
                title="Review Your Creator DNA"
                subtitle="The AI has built your style profile. Review each dimension — click any field to correct inaccuracies before generating content."
                accent="#9B4FD8"
              >
                <FingerprintEditor
                  fingerprint={fingerprint}
                  onConfirm={handleFingerprintConfirm}
                  isLoading={savingFingerprint}
                  visualsAnalyzed={visualsAnalyzed}
                />
              </StepCard>
            </div>
          )}

          {/* ── Step 3 — Brand Brief ── */}
          {step === 3 && (
            <div className="animate-slide-up">
              <StepCard
                step={3}
                title="Brand Brief"
                subtitle="Describe the campaign. The AI will generate 3 content directions automatically when you submit."
                accent="#FF6B35"
              >
                <BrandBriefForm
                  onSubmit={handleBriefSubmit}
                  isLoading={savingBrief || generating}
                  initialValues={brief ?? undefined}
                  submitLabel={
                    generating
                      ? 'Generating your content directions…'
                      : savingBrief
                      ? 'Saving brief…'
                      : 'Save Brief & Generate Directions →'
                  }
                />
              </StepCard>
            </div>
          )}

          {/* ── Step 4 — Generate ── */}
          {step === 4 && sessionId && (
            <div className="space-y-6 animate-slide-up">

              {/* Directions or loading */}
              {directions.length > 0 ? (
                <ContentDirections
                  directions={directions}
                  onDirectionSelect={setSelectedDirectionIndex}
                  selectedIndex={selectedDirectionIndex}
                />
              ) : (
                <div className="bg-white rounded-2xl border border-[#E4E8F0] p-12 text-center space-y-4">
                  <div className="flex justify-center gap-2">
                    <DNALoader />
                  </div>
                  <div>
                    <p className="font-bold text-[#1B2B4B]">Writing your content directions…</p>
                    <p className="text-sm text-[#8A99B3] mt-1">The AI is crafting 3 approaches in your exact voice</p>
                  </div>
                  <div className="flex justify-center gap-6 pt-2">
                    {['Analyzing DNA', 'Matching brief', 'Writing scripts'].map((label, i) => (
                      <div key={i} className="flex items-center gap-1.5">
                        <span className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black text-white"
                          style={{ background: ['#00C8D4','#9B4FD8','#FF6B35'][i] }}>
                          {i + 1}
                        </span>
                        <span className="text-xs text-[#8A99B3]">{label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* AI Strategist Chat */}
              {directions.length > 0 && (
                <div className="animate-slide-up">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-px flex-1 bg-[#E4E8F0]" />
                    <span className="text-xs font-bold uppercase tracking-widest text-[#8A99B3] px-3">Creative Director Chat</span>
                    <div className="h-px flex-1 bg-[#E4E8F0]" />
                  </div>
                  <ChatInterface
                    sessionId={sessionId}
                    directions={directions}
                    initialHistory={chatHistory}
                  />
                </div>
              )}

              {/* Bottom actions */}
              {directions.length > 0 && (
                <div className="flex gap-2 animate-slide-up">
                  <button
                    onClick={handleRegenerate}
                    disabled={generating}
                    className="flex-1 py-3 rounded-xl border border-[#E4E8F0] bg-white text-xs font-semibold text-[#5A6A85] hover:text-[#1B2B4B] hover:border-[#C8D0E0] disabled:opacity-50 disabled:cursor-not-allowed transition-smooth flex items-center justify-center gap-2"
                  >
                    {generating ? (
                      <><span className="w-3 h-3 border border-[#C8D0E0] border-t-[#1B2B4B] rounded-full animate-spin" /> Regenerating…</>
                    ) : '↺ New directions'}
                  </button>
                  <button
                    onClick={() => setStep(3)}
                    className="flex-1 py-3 rounded-xl border border-[#E4E8F0] bg-white text-xs font-semibold text-[#5A6A85] hover:text-[#1B2B4B] hover:border-[#C8D0E0] transition-smooth"
                  >
                    ← Edit brief
                  </button>
                  <button
                    onClick={handleReset}
                    className="flex-1 py-3 rounded-xl border border-[#E4E8F0] bg-white text-xs font-semibold text-[#5A6A85] hover:text-[#1B2B4B] hover:border-[#C8D0E0] transition-smooth"
                  >
                    Start over
                  </button>
                </div>
              )}
            </div>
          )}
        </main>
      )}
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StepCard({
  step, title, subtitle, accent, children,
}: {
  step: number; title: string; subtitle: string; accent: string; children: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-3xl border border-[#E4E8F0] overflow-hidden shadow-sm">
      {/* Accent bar */}
      <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${accent}, #1B2B4B)` }} />

      <div className="p-6 sm:p-8">
        {/* Header */}
        <div className="flex items-start gap-4 mb-6">
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 text-sm font-black text-white"
            style={{ background: `linear-gradient(135deg, ${accent}, #1B2B4B)` }}
          >
            {step}
          </div>
          <div>
            <h2 className="text-lg font-black text-[#1B2B4B] leading-snug">{title}</h2>
            <p className="text-sm text-[#8A99B3] mt-0.5 leading-relaxed">{subtitle}</p>
          </div>
        </div>

        {children}
      </div>
    </div>
  )
}

function DNALoader() {
  return (
    <div className="flex items-end gap-0.5 h-5">
      {['#00C8D4', '#9B4FD8', '#FF6B35', '#E8365D', '#00C8D4'].map((color, i) => (
        <div
          key={i}
          className="w-1 rounded-full animate-bounce"
          style={{
            background: color,
            height: '100%',
            animationDelay: `${i * 100}ms`,
            animationDuration: '0.8s',
          }}
        />
      ))}
    </div>
  )
}
