import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { fetchCaptions, fetchAudio, fetchVideoMetadata } from './ytdlp'
import { transcribeAudio } from './whisper'
import type { AnalysisMode, TranscriptResult } from '@/types'

/**
 * Main entry point for the transcription pipeline.
 * Accepts a public TikTok or Instagram URL and an analysis mode.
 *
 * Standard mode: pulls existing auto-captions via yt-dlp (fast, ~seconds)
 * Deep mode:     downloads audio and transcribes with local Whisper (accurate, ~minutes)
 */
export async function transcribe(
  url: string,
  mode: AnalysisMode
): Promise<TranscriptResult> {
  // Always fetch metadata regardless of mode
  const metadata = await fetchVideoMetadata(url)

  let transcript: string

  if (mode === 'standard') {
    transcript = await fetchCaptions(url)
  } else {
    // Deep mode — download audio to a temp dir, transcribe, then clean up
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'creatordna-deep-'))
    try {
      const audioPath = await fetchAudio(url, tmpDir)
      transcript = await transcribeAudio(audioPath)
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true })
    }
  }

  return {
    url,
    transcript: normalizeText(transcript),
    metadata,
    mode,
  }
}

/**
 * Final normalization pass on any transcript source.
 * Removes excessive whitespace, normalizes punctuation spacing.
 */
export function normalizeText(text: string): string {
  return text
    .replace(/\s{2,}/g, ' ')
    .replace(/ ([,.!?])/g, '$1')
    .trim()
}
