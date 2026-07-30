import { exec } from 'child_process'
import { promisify } from 'util'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

const execAsync = promisify(exec)

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434'
const VISION_MODEL = 'llava'

// ─── Frame Extraction ─────────────────────────────────────────────────────────

/**
 * Extracts N evenly-spaced frames from a video file using ffmpeg.
 * Returns an array of absolute paths to the extracted JPEG frames.
 * Caller is responsible for cleaning up the output directory.
 */
export async function extractFrames(
  videoPath: string,
  outputDir: string,
  frameCount = 4
): Promise<string[]> {
  // Use ffprobe to get duration
  const { stdout } = await execAsync(
    `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${videoPath}"`
  )
  const duration = parseFloat(stdout.trim())
  if (isNaN(duration) || duration <= 0) {
    throw new Error('Could not determine video duration.')
  }

  const frames: string[] = []
  const interval = duration / (frameCount + 1)

  for (let i = 1; i <= frameCount; i++) {
    const timestamp = (interval * i).toFixed(2)
    const framePath = path.join(outputDir, `frame_${i}.jpg`)
    await execAsync(
      `ffmpeg -ss ${timestamp} -i "${videoPath}" -frames:v 1 -q:v 2 "${framePath}" -y 2>/dev/null`
    )
    if (fs.existsSync(framePath)) {
      frames.push(framePath)
    }
  }

  if (frames.length === 0) {
    throw new Error('No frames could be extracted from the video.')
  }

  return frames
}

// ─── Vision Analysis ──────────────────────────────────────────────────────────

/**
 * Sends a single image frame to LLaVA via Ollama for visual description.
 * Returns a text description focused on camera angle, framing, and visual style.
 */
async function describeFrame(imagePath: string, frameIndex: number): Promise<string> {
  const imageData = fs.readFileSync(imagePath)
  const base64Image = imageData.toString('base64')

  const body = {
    model: VISION_MODEL,
    prompt: `You are analyzing a frame from a UGC (user-generated content) social media video.
Describe ONLY the following — be concise (2-3 sentences max):
1. Camera angle and distance (e.g. close-up selfie, medium shot, wide angle, POV)
2. Framing and composition (e.g. centered, rule of thirds, talking head)
3. Setting/background (e.g. bedroom, kitchen, outdoors, plain wall)
Do NOT describe the person's appearance. Focus purely on cinematography and framing.`,
    images: [base64Image],
    stream: false,
  }

  const res = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`LLaVA error on frame ${frameIndex}: ${res.status} ${text}`)
  }

  const data = await res.json()
  return data.response?.trim() ?? ''
}

// ─── Main Visual Analyzer ─────────────────────────────────────────────────────

export interface VisualAnalysis {
  frameDescriptions: string[]
  summary: string
}

/**
 * Downloads a video, extracts frames, and uses LLaVA to produce a
 * visual analysis summary focused on camera angles and framing style.
 *
 * @param videoUrl - Public TikTok or Instagram URL
 * @returns VisualAnalysis with per-frame descriptions and an overall summary
 */
export async function analyzeVideoVisuals(videoUrl: string): Promise<VisualAnalysis> {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'creatordna-vision-'))

  try {
    // Download video (not just audio) using yt-dlp
    const YTDLP = process.env.YTDLP_PATH ?? '/opt/homebrew/bin/yt-dlp'
    const videoPath = path.join(tmpDir, 'video.mp4')
    await execAsync(
      `"${YTDLP}" -f "best[ext=mp4]/best" --no-playlist -o "${videoPath}" "${videoUrl}"`,
      { maxBuffer: 50 * 1024 * 1024 }
    )

    if (!fs.existsSync(videoPath)) {
      throw new Error('Video download failed.')
    }

    // Extract 4 frames
    const frames = await extractFrames(videoPath, tmpDir, 4)

    // Describe each frame with LLaVA
    const frameDescriptions: string[] = []
    for (let i = 0; i < frames.length; i++) {
      try {
        const desc = await describeFrame(frames[i], i + 1)
        if (desc) frameDescriptions.push(`Frame ${i + 1}: ${desc}`)
      } catch {
        // Skip frames that fail — partial analysis is better than none
      }
    }

    if (frameDescriptions.length === 0) {
      throw new Error('Could not analyze any frames from this video.')
    }

    // Summarize across all frames
    const summary = await summarizeVisuals(frameDescriptions)

    return { frameDescriptions, summary }
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  }
}

/**
 * Uses LLaVA (text mode) to produce a one-paragraph summary of
 * camera/framing style from the individual frame descriptions.
 */
async function summarizeVisuals(frameDescriptions: string[]): Promise<string> {
  const body = {
    model: VISION_MODEL,
    prompt: `Based on these frame-by-frame descriptions of a social media video, write ONE concise paragraph summarizing the creator's consistent camera angle preferences, framing style, and visual aesthetic. Be specific — name the dominant angle type, distance, and setting.

${frameDescriptions.join('\n')}

Summary:`,
    stream: false,
  }

  const res = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!res.ok) return frameDescriptions.join(' ')
  const data = await res.json()
  return data.response?.trim() ?? frameDescriptions.join(' ')
}
