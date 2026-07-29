import { chat, extractJson } from './ollama'
import type { TranscriptResult, CreatorFingerprint, BrandBrief, ContentDirection } from '@/types'

// ─── Relevant Video Selection ─────────────────────────────────────────────────

/**
 * Selects the most stylistically relevant videos from the creator's library
 * based on the brand brief's tone and product. Uses simple keyword scoring
 * first; falls back to LLM ranking if no clear winner emerges.
 */
export function selectRelevantVideos(
  transcripts: TranscriptResult[],
  brief: BrandBrief,
  maxVideos = 5
): TranscriptResult[] {
  if (transcripts.length <= maxVideos) return transcripts

  // Build keyword set from brief
  const keywords = [
    ...brief.tone.toLowerCase().split(/\s+/),
    ...brief.targetAudience.toLowerCase().split(/\s+/),
    ...brief.keyMessages.toLowerCase().split(/[\s\n,]+/),
    brief.brandName.toLowerCase(),
    brief.product.toLowerCase(),
  ].filter((k) => k.length > 3)

  // Score each transcript by keyword overlap
  const scored = transcripts.map((t) => {
    const text = (t.transcript + ' ' + t.metadata.title + ' ' + t.metadata.description).toLowerCase()
    const score = keywords.reduce((acc, kw) => acc + (text.includes(kw) ? 1 : 0), 0)
    return { transcript: t, score }
  })

  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, maxVideos).map((s) => s.transcript)
}

// ─── System Prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an elite UGC content strategist. Your job is to generate three distinct content directions for a UGC creator based on their unique style fingerprint and a brand brief.

CRITICAL RULES:
1. Each direction must feel like it was written BY the creator, not at them
2. The hook, body, and CTA must use the creator's actual vocabulary and patterns
3. All three directions must be meaningfully different — different hook style, energy level, or storytelling structure
4. Scripts should be natural spoken word (30–45 seconds when read aloud at a natural pace)
5. Visual notes should reference the creator's own camera/editing patterns

You must respond with ONLY a valid JSON array of exactly 3 objects. No explanation, no markdown fences, no preamble.

Each object must match this exact structure:
{
  "title": "Short direction name (3-5 words)",
  "angle": "One sentence describing the creative angle",
  "rationale": "2-3 sentences explaining why this fits the creator's fingerprint",
  "script": {
    "hook": "Opening line(s) — first 3 seconds",
    "body": "The main content — story, demonstration, or information",
    "cta": "Closing call-to-action in the creator's voice"
  },
  "visualNotes": "Specific direction for camera, editing, and on-screen elements"
}`

// ─── Context Builders ─────────────────────────────────────────────────────────

function fingerprintToText(fp: CreatorFingerprint): string {
  return [
    `Humor: ${fp.humor}`,
    `Pacing: ${fp.pacing}`,
    `Editing style: ${fp.editingStyle}`,
    `Hook patterns: ${fp.hookPatterns}`,
    `Storytelling structure: ${fp.storytellingStructure}`,
    `Camera angles: ${fp.cameraAngles}`,
    `Energy level: ${fp.energyLevel}`,
    `Niche: ${fp.niche}`,
    `CTA style: ${fp.ctaStyle}`,
    `Vocabulary: ${fp.vocabulary}`,
    `Emotional tone: ${fp.emotionalTone}`,
    `Audience interaction: ${fp.audienceInteraction}`,
  ].join('\n')
}

function briefToText(brief: BrandBrief): string {
  return [
    `Brand: ${brief.brandName}`,
    `Product: ${brief.product}`,
    `Target audience: ${brief.targetAudience}`,
    `Desired tone: ${brief.tone}`,
    `Key messages:\n${brief.keyMessages}`,
    `Deliverables: ${brief.deliverables}`,
  ].join('\n')
}

function transcriptExcerpts(transcripts: TranscriptResult[]): string {
  return transcripts
    .slice(0, 3) // use up to 3 as style examples
    .map((t, i) => {
      const excerpt = t.transcript.slice(0, 300)
      return `Example ${i + 1} — "${t.metadata.title}":\n"${excerpt}${t.transcript.length > 300 ? '...' : ''}"`
    })
    .join('\n\n')
}

// ─── Main Generator ───────────────────────────────────────────────────────────

/**
 * Generates exactly three content directions for a creator × brand brief pair.
 * Pulls relevant videos as style examples.
 */
export async function generateDirections(
  fingerprint: CreatorFingerprint,
  brief: BrandBrief,
  transcripts: TranscriptResult[]
): Promise<ContentDirection[]> {
  const relevant = selectRelevantVideos(transcripts, brief)

  const userMessage = `
CREATOR FINGERPRINT:
${fingerprintToText(fingerprint)}

BRAND BRIEF:
${briefToText(brief)}

STYLE EXAMPLES FROM CREATOR'S PAST CONTENT:
${transcriptExcerpts(relevant)}

Generate 3 distinct content directions as a JSON array. Remember: write IN the creator's voice, not about them.`.trim()

  const raw = await chat(SYSTEM_PROMPT, userMessage, {
    temperature: 0.85, // higher temp for creative variety
    maxTokens: 4096,
  })

  const directions = extractJson<ContentDirection[]>(raw)

  if (!Array.isArray(directions) || directions.length === 0) {
    throw new Error('LLM returned invalid directions format.')
  }

  // Ensure exactly 3 directions
  return directions.slice(0, 3)
}
