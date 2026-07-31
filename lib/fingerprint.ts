import type { CreatorFingerprint } from '@/types'

/**
 * Guarantees every field in a CreatorFingerprint is a plain string.
 * Safe to call on data from any source — LLM response, session JSON, or user edits.
 *
 * Handles cases where Llama returns nested objects or arrays instead of strings:
 *   { "Video 1": "handheld", "Video 2": "tripod" } → "Video 1: handheld, Video 2: tripod"
 *   ["dry", "sarcastic"]                           → "dry, sarcastic"
 */
export function flattenFingerprint(raw: Partial<CreatorFingerprint>): CreatorFingerprint {
  const FINGERPRINT_KEYS: (keyof CreatorFingerprint)[] = [
    'humor', 'pacing', 'editingStyle', 'hookPatterns', 'storytellingStructure',
    'cameraAngles', 'energyLevel', 'niche', 'ctaStyle', 'vocabulary',
    'emotionalTone', 'audienceInteraction',
  ]

  const result = {} as CreatorFingerprint

  for (const key of FINGERPRINT_KEYS) {
    const val = (raw as Record<string, unknown>)[key]

    if (typeof val === 'string') {
      result[key] = val
    } else if (Array.isArray(val)) {
      result[key] = val
        .map((v: unknown) => (typeof v === 'object' && v !== null ? JSON.stringify(v) : String(v)))
        .join(', ')
    } else if (typeof val === 'object' && val !== null) {
      result[key] = Object.entries(val as Record<string, unknown>)
        .map(([k, v]) => `${k}: ${v}`)
        .join(', ')
    } else {
      result[key] = String(val ?? '')
    }
  }

  return result
}
