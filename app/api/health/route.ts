import { exec } from 'child_process'
import { promisify } from 'util'
import { NextResponse } from 'next/server'

const execAsync = promisify(exec)

async function check(cmd: string): Promise<{ ok: boolean; version?: string; error?: string }> {
  try {
    const { stdout } = await execAsync(cmd)
    return { ok: true, version: stdout.trim().split('\n')[0] }
  } catch (e: unknown) {
    const err = e as { message?: string }
    return { ok: false, error: err?.message ?? 'unknown error' }
  }
}

export async function GET() {
  const [ytdlp, whisper, ollama] = await Promise.all([
    check('/opt/homebrew/bin/yt-dlp --version'),
    check('/opt/homebrew/bin/whisper --help 2>&1 | head -1'),
    check('curl -s http://localhost:11434'),
  ])

  const allOk = ytdlp.ok && whisper.ok && ollama.ok

  return NextResponse.json(
    {
      status: allOk ? 'ok' : 'degraded',
      tools: { ytdlp, whisper, ollama },
    },
    { status: allOk ? 200 : 503 }
  )
}
