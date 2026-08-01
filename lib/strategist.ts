import { chat, extractJson } from './ollama'
import type { TranscriptResult, CreatorFingerprint, BrandBrief, ContentDirection } from '@/types'

// ─── Relevant Video Selection ─────────────────────────────────────────────────

export function selectRelevantVideos(
  transcripts: TranscriptResult[],
  brief: BrandBrief,
  maxVideos = 5
): TranscriptResult[] {
  if (transcripts.length <= maxVideos) return transcripts

  const keywords = [
    ...brief.tone.toLowerCase().split(/\s+/),
    ...brief.targetAudience.toLowerCase().split(/\s+/),
    ...brief.keyMessages.toLowerCase().split(/[\s\n,]+/),
    brief.brandName.toLowerCase(),
    brief.product.toLowerCase(),
  ].filter((k) => k.length > 3)

  const scored = transcripts.map((t) => {
    const text = (t.transcript + ' ' + t.metadata.title + ' ' + t.metadata.description).toLowerCase()
    const score = keywords.reduce((acc, kw) => acc + (text.includes(kw) ? 1 : 0), 0)
    return { transcript: t, score }
  })

  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, maxVideos).map((s) => s.transcript)
}

// ─── System Prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an elite UGC content strategist. Generate ONE content direction for a UGC creator based on their style fingerprint and a brand brief.

CRITICAL RULES:
1. Write IN the creator's voice using their actual vocabulary and patterns
2. Keep scripts tight: hook ≤ 20 words, body ≤ 60 words, CTA ≤ 15 words
3. Rationale ≤ 2 sentences. Title ≤ 5 words. visualNotes ≤ 25 words.

Respond with ONLY a single valid JSON object. No explanation, no markdown. Start immediately with {

{
  "title": "Short direction name",
  "angle": "One sentence describing the creative angle",
  "rationale": "2 sentences explaining why this fits the creator",
  "script": {
    "hook": "Opening line, max 20 words",
    "body": "Main content, max 60 words",
    "cta": "Call-to-action, max 15 words"
  },
  "visualNotes": "Camera and editing notes, max 25 words"
}`

// ─── Angle definitions — ensures 3 meaningfully different directions ──────────

const DIRECTION_ANGLES = [
  'A relatable personal story hook that leads into the product as the solution',
  'A bold attention-grabbing claim or surprising fact as the opener',
  'A day-in-the-life or "I tried this so you don\'t have to" demonstration angle',
]

// ─── Context Builders ─────────────────────────────────────────────────────────

function fingerprintToText(fp: CreatorFingerprint): string {
  return [
    `Humor: ${fp.humor}`,
    `Pacing: ${fp.pacing}`,
    `Hook patterns: ${fp.hookPatterns}`,
    `Storytelling: ${fp.storytellingStructure}`,
    `Energy: ${fp.energyLevel}`,
    `Vocabulary: ${fp.vocabulary}`,
    `CTA style: ${fp.ctaStyle}`,
    `Emotional tone: ${fp.emotionalTone}`,
    `Camera angles: ${fp.cameraAngles}`,
  ].join('\n')
}

function briefToText(brief: BrandBrief): string {
  return [
    `Brand: ${brief.brandName}`,
    `Product: ${brief.product}`,
    `Audience: ${brief.targetAudience}`,
    `Tone: ${brief.tone}`,
    `Key messages: ${brief.keyMessages.replace(/\n/g, ' | ')}`,
    `Deliverables: ${brief.deliverables}`,
  ].join('\n')
}

function transcriptExcerpt(transcripts: TranscriptResult[]): string {
  return transcripts
    .slice(0, 2)
    .map((t, i) => {
      const excerpt = t.transcript.slice(0, 250)
      return `Example ${i + 1}: "${excerpt}${t.transcript.length > 250 ? '...' : ''}"`
    })
    .join('\n\n')
}

// ─── Single Direction Generator ───────────────────────────────────────────────

async function generateOneDirection(
  fingerprint: CreatorFingerprint,
  brief: BrandBrief,
  transcripts: TranscriptResult[],
  angle: string,
  directionNumber: number
): Promise<ContentDirection> {
  const userMessage = `
CREATOR FINGERPRINT:
${fingerprintToText(fingerprint)}

BRAND BRIEF:
${briefToText(brief)}

STYLE EXAMPLES:
${transcriptExcerpt(transcripts)}

DIRECTION ${directionNumber} — USE THIS ANGLE:
${angle}

Generate exactly one content direction using the angle above. Write IN the creator's voice. Return only the JSON object.`.trim()

  const raw = await chat(SYSTEM_PROMPT, userMessage, {
    temperature: 0.75,
    maxTokens: 1024,
  })

  return extractJson<ContentDirection>(raw)
}

// ─── Main Generator ───────────────────────────────────────────────────────────

/**
 * Generates 3 content directions by making 3 separate LLM calls.
 * Each call generates one direction with a pre-defined angle to ensure variety.
 * This avoids context-window truncation issues with large single responses.
 */
export async function generateDirections(
  fingerprint: CreatorFingerprint,
  brief: BrandBrief,
  transcripts: TranscriptResult[]
): Promise<ContentDirection[]> {
  const relevant = selectRelevantVideos(transcripts, brief)

  // Run all 3 in parallel — faster than sequential
  const results = await Promise.allSettled(
    DIRECTION_ANGLES.map((angle, i) =>
      generateOneDirection(fingerprint, brief, relevant, angle, i + 1)
    )
  )

  const directions: ContentDirection[] = []

  for (const result of results) {
    if (result.status === 'fulfilled') {
      directions.push(result.value)
    } else {
      console.warn('[strategist] one direction failed:', result.reason)
    }
  }

  if (directions.length === 0) {
    throw new Error('All direction generation attempts failed. Please try again.')
  }

  return directions
}
