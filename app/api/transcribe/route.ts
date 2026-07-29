import { NextRequest, NextResponse } from 'next/server'
import { transcribe } from '@/lib/transcription'
import type { AnalysisMode } from '@/types'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { url, mode } = body as { url?: string; mode?: AnalysisMode }

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid "url" field.' }, { status: 400 })
    }

    if (mode !== 'standard' && mode !== 'deep') {
      return NextResponse.json(
        { error: 'Invalid "mode". Must be "standard" or "deep".' },
        { status: 400 }
      )
    }

    // Validate URL is TikTok or Instagram
    const isTikTok = url.includes('tiktok.com')
    const isInstagram = url.includes('instagram.com')
    if (!isTikTok && !isInstagram) {
      return NextResponse.json(
        { error: 'Only TikTok and Instagram URLs are supported.' },
        { status: 400 }
      )
    }

    const result = await transcribe(url, mode)
    return NextResponse.json(result, { status: 200 })
  } catch (e: unknown) {
    const err = e as { message?: string }
    const message = err?.message ?? 'Transcription failed.'

    // Surface user-friendly messages for common failures
    if (message.includes('No captions found')) {
      return NextResponse.json(
        {
          error:
            'No auto-captions found for this video in Standard mode. ' +
            'Try switching to Deep Analysis mode.',
        },
        { status: 422 }
      )
    }

    if (message.includes('Private') || message.includes('private')) {
      return NextResponse.json(
        { error: 'This video appears to be private or unavailable.' },
        { status: 422 }
      )
    }

    console.error('[/api/transcribe]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
