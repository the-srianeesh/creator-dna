import { NextRequest, NextResponse } from 'next/server'
import { generateDirections } from '@/lib/strategist'
import { readSession, setDirections } from '@/lib/session'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { sessionId } = body as { sessionId?: string }

    if (!sessionId) {
      return NextResponse.json({ error: 'Missing sessionId.' }, { status: 400 })
    }

    const session = readSession(sessionId)

    if (!session.fingerprint) {
      return NextResponse.json(
        { error: 'No creator fingerprint found. Run analysis before generating directions.' },
        { status: 400 }
      )
    }

    if (!session.brief) {
      return NextResponse.json(
        { error: 'No brand brief found. Complete the brand brief before generating directions.' },
        { status: 400 }
      )
    }

    if (session.transcripts.length === 0) {
      return NextResponse.json(
        { error: 'No transcripts found in session.' },
        { status: 400 }
      )
    }

    const directions = await generateDirections(
      session.fingerprint,
      session.brief,
      session.transcripts
    )

    setDirections(sessionId, directions)

    return NextResponse.json({ directions }, { status: 200 })
  } catch (e: unknown) {
    const err = e as { message?: string }
    const message = err?.message ?? 'Generation failed.'
    console.error('[/api/generate]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
