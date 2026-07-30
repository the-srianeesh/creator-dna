import { NextRequest, NextResponse } from 'next/server'
import { analyzeCreator } from '@/lib/analyzer'
import { analyzeVideoVisuals } from '@/lib/vision'
import { readSession, setFingerprint } from '@/lib/session'
import type { TranscriptResult } from '@/types'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { sessionId, transcripts } = body as {
      sessionId?: string
      transcripts?: TranscriptResult[]
    }

    let toAnalyze: TranscriptResult[] = []

    if (transcripts && transcripts.length > 0) {
      toAnalyze = transcripts
    } else if (sessionId) {
      const session = readSession(sessionId)
      toAnalyze = session.transcripts
    }

    if (toAnalyze.length === 0) {
      return NextResponse.json(
        { error: 'No transcripts provided. Add at least one video before analyzing.' },
        { status: 400 }
      )
    }

    // ── Vision analysis ────────────────────────────────────────────────────
    // Run LLaVA frame analysis on up to 2 videos to keep latency reasonable.
    // Failures are silently skipped — visual context is additive, not required.
    const visualSummaries = new Map<string, string>()
    const videosToAnalyze = toAnalyze.slice(0, 2)

    await Promise.allSettled(
      videosToAnalyze.map(async (t) => {
        try {
          const visual = await analyzeVideoVisuals(t.url)
          visualSummaries.set(t.url, visual.summary)
        } catch (e) {
          console.warn(`[vision] skipped ${t.url}:`, (e as { message?: string })?.message)
        }
      })
    )

    // ── Fingerprint analysis ───────────────────────────────────────────────
    const fingerprint = await analyzeCreator(toAnalyze, visualSummaries)

    if (sessionId) {
      setFingerprint(sessionId, fingerprint)
    }

    return NextResponse.json(
      {
        fingerprint,
        visualsAnalyzed: visualSummaries.size,
      },
      { status: 200 }
    )
  } catch (e: unknown) {
    const err = e as { message?: string }
    const message = err?.message ?? 'Analysis failed.'
    console.error('[/api/analyze]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
