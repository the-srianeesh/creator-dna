import { exec } from 'child_process'
import { promisify } from 'util'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import type { VideoMetadata } from '@/types'

const execAsync = promisify(exec)

const YTDLP = process.env.YTDLP_PATH ?? '/opt/homebrew/bin/yt-dlp'

// ─── Platform Detection ───────────────────────────────────────────────────────

function detectPlatform(url: string): VideoMetadata['platform'] {
  if (url.includes('tiktok.com')) return 'tiktok'
  if (url.includes('instagram.com')) return 'instagram'
  return 'unknown'
}

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function fetchVideoMetadata(url: string): Promise<VideoMetadata> {
  const { stdout } = await execAsync(`"${YTDLP}" --dump-json --no-playlist "${url}"`)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw: any = JSON.parse(stdout.trim())

  return {
    url,
    title: raw.title ?? '',
    description: raw.description ?? '',
    duration: raw.duration ?? 0,
    viewCount: raw.view_count ?? 0,
    likeCount: raw.like_count ?? 0,
    platform: detectPlatform(url),
  }
}

// ─── Captions ─────────────────────────────────────────────────────────────────

/**
 * Fetches auto-generated captions for a video URL.
 * Returns cleaned plain text, or throws if no captions are available.
 */
export async function fetchCaptions(url: string): Promise<string> {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'creatordna-'))
  const outTemplate = path.join(tmpDir, 'caption')

  try {
    await execAsync(
      `"${YTDLP}" --write-auto-sub --skip-download --sub-format vtt --sub-lang en ` +
        `--convert-subs vtt -o "${outTemplate}" --no-playlist "${url}"`
    )

    // yt-dlp writes files like caption.en.vtt
    const files = fs.readdirSync(tmpDir).filter((f) => f.endsWith('.vtt'))
    if (files.length === 0) {
      throw new Error('No captions found for this video.')
    }

    const raw = fs.readFileSync(path.join(tmpDir, files[0]), 'utf-8')
    return cleanVtt(raw)
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  }
}

// ─── Audio Download ───────────────────────────────────────────────────────────

/**
 * Downloads audio from a video URL as mp3.
 * Returns the path to the downloaded mp3 file.
 * Caller is responsible for cleaning up the file.
 */
export async function fetchAudio(url: string, outputDir: string): Promise<string> {
  const outTemplate = path.join(outputDir, 'audio.%(ext)s')
  await execAsync(
    `"${YTDLP}" -x --audio-format mp3 --audio-quality 5 ` +
      `-o "${outTemplate}" --no-playlist "${url}"`
  )

  const files = fs.readdirSync(outputDir).filter((f) => f.endsWith('.mp3'))
  if (files.length === 0) {
    throw new Error('Audio download failed — no mp3 found.')
  }
  return path.join(outputDir, files[0])
}

// ─── VTT Cleaner ──────────────────────────────────────────────────────────────

/**
 * Strips VTT timestamps, cue identifiers, HTML tags, and de-duplicates lines.
 */
export function cleanVtt(vtt: string): string {
  const lines = vtt.split('\n')
  const seen = new Set<string>()
  const result: string[] = []

  for (const line of lines) {
    const trimmed = line.trim()

    // Skip header, timestamps, blank lines, cue numbers
    if (
      trimmed === 'WEBVTT' ||
      trimmed === '' ||
      /^\d+$/.test(trimmed) ||
      /-->/.test(trimmed) ||
      /^NOTE/.test(trimmed) ||
      /^STYLE/.test(trimmed)
    ) {
      continue
    }

    // Strip HTML-like tags and position directives
    const clean = trimmed
      .replace(/<[^>]+>/g, '')          // remove <tags>
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&nbsp;/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim()

    if (clean && !seen.has(clean)) {
      seen.add(clean)
      result.push(clean)
    }
  }

  return result.join(' ')
}
