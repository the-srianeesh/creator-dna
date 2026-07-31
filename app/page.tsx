'use client'

import { useState, useEffect, useRef } from 'react'
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

// ─── Step definitions ─────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, label: 'Add Videos' },
  { id: 2, label: 'Review DNA' },
  { id: 3, label: 'Brand Brief' },
  { id: 4, label: 'Generate' },
]

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Home() {
  const [sessionId, setSessionId] = useState<string | null>(null)
  const sessionIdRef = useRef<string | null>(null)
  const [step, setStep] = useState(1)
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
          if (!session) throw new Error('Session expired')
          setSessionId(stored)
          sessionIdRef.current = stored
          setTranscripts(session.transcripts ?? [])
          setFingerprint(session.fingerprint ?? null)
          setBrief(session.brief ?? null)
          setDirections(session.directions ?? [])
          setChatHistory(session.chatHistory ?? [])

          // Restore step
          if (session.directions?.length > 0) setStep(4)
          else if (session.brief) setStep(4)
          else if (session.fingerprint) setStep(2)
          else if (session.transcripts?.length > 0) setStep(1)
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

  // Triggered by "Continue to Analysis" — runs analysis then moves to Step 2
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
      setFingerprint(data.fingerprint)
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
      const res = await fetch('/api/session', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, fingerprint: fp }),
      })
      if (!res.ok) throw new Error('Failed to save fingerprint.')
      setFingerprint(fp)
      setStep(3)
    } catch (e: unknown) {
      const err = e as { message?: string }
      setError(err?.message ?? 'Failed to save fingerprint.')
    } finally {
      setSavingFingerprint(false)
    }
  }

  // Triggered by brand brief submit — saves brief then auto-generates directions
  async function handleBriefSubmit(b: BrandBrief) {
    if (!sessionId) return
    setSavingBrief(true)
    setError(null)
    try {
      // Save brief
      const saveRes = await fetch('/api/session', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, brief: b }),
      })
      if (!saveRes.ok) throw new Error('Failed to save brief.')
      setBrief(b)

      // Auto-trigger generation
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

  // Manual re-generation from Step 4
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
    createNewSession()
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <header className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🧬</span>
          <div>
            <h1 className="font-bold text-lg leading-none">Creator DNA</h1>
            <p className="text-xs text-zinc-500 mt-0.5">AI-powered UGC content strategist</p>
          </div>
        </div>
        <button
          onClick={handleReset}
          className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
        >
          Start over
        </button>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-8">
        {/* Stepper */}
        <Stepper currentStep={step} steps={STEPS} onStepClick={(s) => { if (s < step) setStep(s) }} />

        {/* Error banner */}
        {error && (
          <div className="bg-red-900/30 border border-red-700 rounded-xl px-4 py-3 text-sm text-red-300 flex items-start gap-2">
            <span>⚠️</span>
            <span>{error}</span>
            <button onClick={() => setError(null)} className="ml-auto text-red-500 hover:text-red-300">✕</button>
          </div>
        )}

        {/* Step 1 — Add Videos */}
        {step === 1 && (
          <Card
            title="Step 1 — Add Your Videos"
            subtitle="Paste public TikTok or Instagram video URLs from your own profile. Add 3–8 for best results."
          >
            <VideoUrlInput
              mode={mode}
              onModeChange={setMode}
              onTranscriptAdded={handleTranscriptAdded}
              disabled={analyzing}
            />
            {transcripts.length > 0 && (
              <button
                onClick={handleContinueToAnalysis}
                disabled={analyzing}
                className="w-full mt-4 py-3 bg-violet-600 hover:bg-violet-500 disabled:bg-violet-900 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors"
              >
                {analyzing ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Analyzing style + extracting video frames… ~1 min
                  </span>
                ) : (
                  'Analyze My Creator DNA →'
                )}
              </button>
            )}
          </Card>
        )}

        {/* Step 2 — Review & Edit DNA */}
        {step === 2 && fingerprint && (
          <Card
            title="Step 2 — Review Your Creator DNA"
            subtitle="The AI has analyzed your style. Review each dimension and correct anything that feels off before generating content."
          >
            <FingerprintEditor
              fingerprint={fingerprint}
              onConfirm={handleFingerprintConfirm}
              isLoading={savingFingerprint}
              visualsAnalyzed={visualsAnalyzed}
            />
          </Card>
        )}

        {/* Step 3 — Brand Brief */}
        {step === 3 && (
          <Card
            title="Step 3 — Brand Brief"
            subtitle="Tell the AI about the brand. Be specific — better brief = better content. Directions will be generated automatically."
          >
            <BrandBriefForm
              onSubmit={handleBriefSubmit}
              isLoading={savingBrief || generating}
              initialValues={brief ?? undefined}
              submitLabel={generating ? 'Generating directions…' : savingBrief ? 'Saving brief…' : 'Save Brief & Generate Directions →'}
            />
          </Card>
        )}

        {/* Step 4 — Generate (directions + chat) */}
        {step === 4 && sessionId && (
          <div className="space-y-8">
            {directions.length > 0 ? (
              <ContentDirections
                directions={directions}
                onDirectionSelect={setSelectedDirectionIndex}
                selectedIndex={selectedDirectionIndex}
              />
            ) : (
              <Card title="Generating your directions…" subtitle="This takes about 45 seconds.">
                <div className="flex items-center justify-center py-8">
                  <span className="w-8 h-8 border-2 border-violet-600/30 border-t-violet-500 rounded-full animate-spin" />
                </div>
              </Card>
            )}

            {directions.length > 0 && (
              <div className="border-t border-zinc-800 pt-8">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-lg">💬</span>
                  <div>
                    <h2 className="font-semibold text-zinc-100">AI Strategist Chat</h2>
                    <p className="text-xs text-zinc-500">Get clarity, rewrites, alternatives — all grounded in your fingerprint</p>
                  </div>
                </div>
                <ChatInterface
                  sessionId={sessionId}
                  directions={directions}
                  initialHistory={chatHistory}
                />
              </div>
            )}

            {directions.length > 0 && (
              <div className="flex gap-3">
                <button
                  onClick={handleRegenerate}
                  disabled={generating}
                  className="flex-1 py-2.5 border border-zinc-700 hover:border-zinc-500 text-zinc-400 hover:text-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium rounded-xl transition-colors"
                >
                  {generating ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-3 h-3 border border-zinc-500 border-t-zinc-200 rounded-full animate-spin" />
                      Regenerating…
                    </span>
                  ) : (
                    '↺ Regenerate directions'
                  )}
                </button>
                <button
                  onClick={() => setStep(3)}
                  className="flex-1 py-2.5 border border-zinc-700 hover:border-zinc-500 text-zinc-400 hover:text-zinc-200 text-sm font-medium rounded-xl transition-colors"
                >
                  ← Edit brief
                </button>
                <button
                  onClick={handleReset}
                  className="flex-1 py-2.5 border border-zinc-700 hover:border-zinc-500 text-zinc-400 hover:text-zinc-200 text-sm font-medium rounded-xl transition-colors"
                >
                  Start over
                </button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Stepper({
  steps,
  currentStep,
  onStepClick,
}: {
  steps: { id: number; label: string }[]
  currentStep: number
  onStepClick: (step: number) => void
}) {
  return (
    <div className="flex items-center gap-0">
      {steps.map((s, i) => {
        const done = s.id < currentStep
        const active = s.id === currentStep
        return (
          <div key={s.id} className="flex items-center flex-1 min-w-0">
            <button
              onClick={() => onStepClick(s.id)}
              disabled={s.id > currentStep}
              className="flex flex-col items-center gap-1 flex-shrink-0 disabled:cursor-default group"
            >
              <div className={[
                'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors',
                done ? 'bg-violet-600 text-white group-hover:bg-violet-500' : active ? 'bg-white text-zinc-900' : 'bg-zinc-800 text-zinc-600',
              ].join(' ')}>
                {done ? '✓' : s.id}
              </div>
              <span className={`text-[10px] hidden sm:block ${active ? 'text-zinc-200' : done ? 'text-zinc-400' : 'text-zinc-600'}`}>
                {s.label}
              </span>
            </button>
            {i < steps.length - 1 && (
              <div className={`flex-1 h-px mx-2 ${done ? 'bg-violet-600' : 'bg-zinc-800'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

function Card({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-5">
      <div>
        <h2 className="font-semibold text-zinc-100">{title}</h2>
        {subtitle && <p className="text-sm text-zinc-500 mt-1">{subtitle}</p>}
      </div>
      {children}
    </div>
  )
}
