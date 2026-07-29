import { exec } from 'child_process'
import { promisify } from 'util'
import * as fs from 'fs'
import * as path from 'path'

const execAsync = promisify(exec)

const WHISPER = process.env.WHISPER_PYTHON ?? '/opt/homebrew/bin/whisper'

/**
 * Transcribes an audio file using local OpenAI Whisper.
 * Writes output to the same directory as the audio file, then reads the .txt result.
 *
 * @param audioPath - Absolute path to the mp3/wav/m4a file
 * @param model     - Whisper model size: 'tiny' | 'base' | 'small' | 'medium'
 * @returns Cleaned transcript string
 */
export async function transcribeAudio(
  audioPath: string,
  model: 'tiny' | 'base' | 'small' | 'medium' = 'base'
): Promise<string> {
  const outputDir = path.dirname(audioPath)

  await execAsync(
    `"${WHISPER}" "${audioPath}" --model ${model} --output_format txt --output_dir "${outputDir}" --language en --fp16 False`,
    { maxBuffer: 10 * 1024 * 1024 } // 10 MB buffer for large outputs
  )

  // Whisper writes <filename>.txt next to the audio file
  const baseName = path.basename(audioPath, path.extname(audioPath))
  const txtPath = path.join(outputDir, `${baseName}.txt`)

  if (!fs.existsSync(txtPath)) {
    throw new Error(`Whisper output not found at ${txtPath}`)
  }

  const raw = fs.readFileSync(txtPath, 'utf-8')
  return normalizeTranscript(raw)
}

/**
 * Cleans raw Whisper output — strips timestamps (if any leaked through),
 * normalizes whitespace, and trims.
 */
export function normalizeTranscript(text: string): string {
  return text
    .replace(/\[\d{2}:\d{2}:\d{2}\.\d{3} --> \d{2}:\d{2}:\d{2}\.\d{3}\]/g, '') // strip SRT/VTT timestamps
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim()
}
