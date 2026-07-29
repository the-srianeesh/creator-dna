// ─── Transcription ────────────────────────────────────────────────────────────

export type AnalysisMode = 'standard' | 'deep'

export interface VideoMetadata {
  url: string
  title: string
  description: string
  duration: number       // seconds
  viewCount: number
  likeCount: number
  platform: 'tiktok' | 'instagram' | 'unknown'
}

export interface TranscriptResult {
  url: string
  transcript: string
  metadata: VideoMetadata
  mode: AnalysisMode
}

// ─── Creator Fingerprint ──────────────────────────────────────────────────────

export interface CreatorFingerprint {
  humor: string            // e.g. "dry, self-deprecating, uses unexpected callbacks"
  pacing: string           // e.g. "fast cuts every 2-3s, rarely pauses mid-sentence"
  editingStyle: string     // e.g. "jump cuts, text overlays, trending sounds"
  hookPatterns: string     // e.g. "always opens with a bold claim or relatable pain point"
  storytellingStructure: string  // e.g. "problem → personal story → solution → CTA"
  cameraAngles: string     // e.g. "mostly handheld close-up, occasional POV shots"
  energyLevel: string      // e.g. "high energy, animated facial expressions"
  niche: string            // e.g. "skincare, beauty routines, budget-friendly finds"
  ctaStyle: string         // e.g. "soft sell, ends with 'link in bio' after a story payoff"
  vocabulary: string       // e.g. "casual Gen Z slang, emojis in captions, short sentences"
  emotionalTone: string    // e.g. "warm, relatable, occasionally vulnerable"
  audienceInteraction: string // e.g. "directly addresses viewer as 'you', asks questions"
}

// ─── Brand Brief ──────────────────────────────────────────────────────────────

export interface BrandBrief {
  brandName: string
  product: string
  targetAudience: string
  tone: string
  keyMessages: string      // newline-separated bullet points
  deliverables: string     // e.g. "1x 30-second TikTok, raw/authentic feel"
}

// ─── Content Directions ───────────────────────────────────────────────────────

export interface ContentScript {
  hook: string
  body: string
  cta: string
}

export interface ContentDirection {
  title: string
  angle: string
  rationale: string
  script: ContentScript
  visualNotes: string
}

// ─── Chat ─────────────────────────────────────────────────────────────────────

export type ChatRole = 'user' | 'assistant'

export interface ChatMessage {
  role: ChatRole
  content: string
  timestamp: string
}

// ─── Session ──────────────────────────────────────────────────────────────────

export interface Session {
  sessionId: string
  createdAt: string
  updatedAt: string
  transcripts: TranscriptResult[]
  fingerprint: CreatorFingerprint | null
  brief: BrandBrief | null
  directions: ContentDirection[]
  chatHistory: ChatMessage[]
}
