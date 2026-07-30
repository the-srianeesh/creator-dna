import { chat, extractJson } from './ollama'
import type { TranscriptResult, CreatorFingerprint } from '@/types'

// ─── System Prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an expert UGC content strategist and creative director with deep knowledge of TikTok and Instagram creator culture.

Your job is to analyze a set of video transcripts, metadata, and visual descriptions from a single creator and extract their unique content "fingerprint" — the repeatable stylistic patterns that make their content feel distinctly like them.

Be specific and observational. Do not be generic. If a creator uses specific phrases, opening formats, or structural patterns, name them explicitly.

For camera angles and editing style: use the provided visual frame analysis when available — this is based on actual video frames, not inference.

You must respond with ONLY a valid JSON object — no explanation, no markdown, no preamble. The JSON must match this exact structure:

{
  "humor": "description of their humor style",
  "pacing": "description of their pacing and rhythm",
  "editingStyle": "description of their editing patterns",
  "hookPatterns": "description of how they open videos",
  "storytellingStructure": "description of their narrative arc",
  "cameraAngles": "description of their visual framing tendencies — based on actual frame analysis if provided",
  "energyLevel": "description of their energy and delivery style",
  "niche": "their content niche and topic focus",
  "ctaStyle": "how they close videos and prompt action",
  "vocabulary": "their word choices, phrases, slang, sentence length",
  "emotionalTone": "the emotional register and feeling of their content",
  "audienceInteraction": "how they address and engage their viewers"
}`

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Formats transcripts + metadata + optional visual analysis into a context block.
 * Caps each transcript at 600 chars to stay within context limits.
 */
function buildTranscriptContext(
  transcripts: TranscriptResult[],
  visualSummaries: Map<string, string>
): string {
  return transcripts
    .map((t, i) => {
      const meta = t.metadata
      const excerpt = t.transcript.slice(0, 600)
      const truncated = t.transcript.length > 600 ? '...[truncated]' : ''
      const visual = visualSummaries.get(t.url)

      return [
        `--- Video ${i + 1} ---`,
        `Platform: ${meta.platform}`,
        `Title: ${meta.title}`,
        `Duration: ${meta.duration}s`,
        `Views: ${meta.viewCount.toLocaleString()} | Likes: ${meta.likeCount.toLocaleString()}`,
        `Transcript: ${excerpt}${truncated}`,
        visual ? `Visual Analysis (from actual frames): ${visual}` : '',
      ]
        .filter(Boolean)
        .join('\n')
    })
    .join('\n\n')
}

// ─── Main Analyzer ────────────────────────────────────────────────────────────

/**
 * Analyzes an array of transcripts from a single creator and returns
 * their style fingerprint as a structured CreatorFingerprint object.
 *
 * @param transcripts     - Array of transcript results
 * @param visualSummaries - Optional map of videoUrl → visual analysis summary from LLaVA
 */
export async function analyzeCreator(
  transcripts: TranscriptResult[],
  visualSummaries: Map<string, string> = new Map()
): Promise<CreatorFingerprint> {
  if (transcripts.length === 0) {
    throw new Error('At least one video transcript is required for analysis.')
  }

  const context = buildTranscriptContext(transcripts, visualSummaries)
  const hasVisuals = visualSummaries.size > 0

  const userMessage = `Here are ${transcripts.length} video transcript(s) from a single creator${hasVisuals ? `, with visual frame analysis for ${visualSummaries.size} video(s)` : ''}. Analyze their style and return their content fingerprint as JSON.

${context}

Remember: Return ONLY the JSON object. No explanation or additional text.`

  const raw = await chat(SYSTEM_PROMPT, userMessage, {
    temperature: 0.4,
    maxTokens: 4096,
  })

  return extractJson<CreatorFingerprint>(raw)
}
