import { NextRequest, NextResponse } from 'next/server'
import { analyzeCreator } from '@/lib/analyzer'
import { readSession, setFingerprint } from '@/lib/session'
import type { TranscriptResult } from '@/types'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { sessionId, transcripts } = body as {
      sessionId?: string
      transcripts?: TranscriptResult[]
    }

    // Support passing transcripts directly OR reading from an existing session
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

    const fingerprint = await analyzeCreator(toAnalyze)

    // Persist to session if sessionId was provided
    if (sessionId) {
      setFingerprint(sessionId, fingerprint)
    }

    return NextResponse.json({ fingerprint }, { status: 200 })
  } catch (e: unknown) {
    const err = e as { message?: string }
    const message = err?.message ?? 'Analysis failed.'
    console.error('[/api/analyze]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
