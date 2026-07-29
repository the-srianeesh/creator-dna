import { NextRequest, NextResponse } from 'next/server'
import { createSession, readSession, setBrief, setFingerprint, setDirections, addTranscript } from '@/lib/session'
import type { BrandBrief, CreatorFingerprint, ContentDirection, TranscriptResult } from '@/types'

// POST — create a new session
export async function POST() {
  try {
    const session = createSession()
    return NextResponse.json({ sessionId: session.sessionId, session }, { status: 201 })
  } catch (e: unknown) {
    const err = e as { message?: string }
    return NextResponse.json({ error: err?.message ?? 'Failed to create session.' }, { status: 500 })
  }
}

// GET — retrieve a session by ?sessionId=
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const sessionId = searchParams.get('sessionId')

    if (!sessionId) {
      return NextResponse.json({ error: 'Missing sessionId query parameter.' }, { status: 400 })
    }

    const session = readSession(sessionId)
    return NextResponse.json({ session }, { status: 200 })
  } catch (e: unknown) {
    const err = e as { message?: string }
    const message = err?.message ?? 'Failed to read session.'
    if (message.includes('not found')) {
      return NextResponse.json({ error: message }, { status: 404 })
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// PUT — update session fields (brief, fingerprint, directions, transcript)
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const { sessionId, brief, fingerprint, directions, transcript } = body as {
      sessionId?: string
      brief?: BrandBrief
      fingerprint?: CreatorFingerprint
      directions?: ContentDirection[]
      transcript?: TranscriptResult
    }

    if (!sessionId) {
      return NextResponse.json({ error: 'Missing sessionId.' }, { status: 400 })
    }

    let session = readSession(sessionId)

    if (transcript) session = addTranscript(sessionId, transcript)
    if (brief) session = setBrief(sessionId, brief)
    if (fingerprint) session = setFingerprint(sessionId, fingerprint)
    if (directions) session = setDirections(sessionId, directions)

    return NextResponse.json({ session }, { status: 200 })
  } catch (e: unknown) {
    const err = e as { message?: string }
    const message = err?.message ?? 'Failed to update session.'
    if (message.includes('not found')) {
      return NextResponse.json({ error: message }, { status: 404 })
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
