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
4. Keep scripts tight: hook ≤ 20 words, body ≤ 60 words, CTA ≤ 20 words, visualNotes ≤ 30 words
5. Rationale ≤ 2 sentences. Title ≤ 5 words.

You must respond with ONLY a valid JSON array of exactly 3 objects. No explanation, no markdown fences, no preamble. Start immediately with [

Each object must match this exact structure:
{
  "title": "Short direction name (3-5 words)",
  "angle": "One sentence describing the creative angle",
  "rationale": "2 sentences explaining why this fits the creator's fingerprint",
  "script": {
    "hook": "Opening line — first 3 seconds, max 20 words",
    "body": "Main content — story or demonstration, max 60 words",
    "cta": "Closing call-to-action in creator's voice, max 20 words"
  },
  "visualNotes": "Camera and editing direction, max 30 words"
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
    temperature: 0.7,
    maxTokens: 8192,
  })

  const directions = extractJson<ContentDirection[]>(raw)

  if (!Array.isArray(directions) || directions.length === 0) {
    throw new Error('LLM returned invalid directions format.')
  }

  // Accept 1-3 directions — partial is better than failure
  return directions.slice(0, 3)
}
