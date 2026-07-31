'use client'

import { useState } from 'react'
import type { BrandBrief } from '@/types'

interface Props {
  onSubmit: (brief: BrandBrief) => void
  isLoading?: boolean
  initialValues?: Partial<BrandBrief>
  submitLabel?: string
}

const EMPTY: BrandBrief = {
  brandName: '',
  product: '',
  targetAudience: '',
  tone: '',
  keyMessages: '',
  deliverables: '',
}

export default function BrandBriefForm({ onSubmit, isLoading = false, initialValues, submitLabel }: Props) {
  const [form, setForm] = useState<BrandBrief>({ ...EMPTY, ...initialValues })
  const [errors, setErrors] = useState<Partial<Record<keyof BrandBrief, string>>>({})

  function validate(): boolean {
    const newErrors: Partial<Record<keyof BrandBrief, string>> = {}
    if (!form.brandName.trim()) newErrors.brandName = 'Brand name is required.'
    if (!form.product.trim()) newErrors.product = 'Product or service is required.'
    if (!form.targetAudience.trim()) newErrors.targetAudience = 'Target audience is required.'
    if (!form.tone.trim()) newErrors.tone = 'Tone is required.'
    if (!form.keyMessages.trim()) newErrors.keyMessages = 'At least one key message is required.'
    if (!form.deliverables.trim()) newErrors.deliverables = 'Deliverables are required.'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  function handleChange(field: keyof BrandBrief, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (validate()) onSubmit(form)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Brand Name */}
      <Field
        label="Brand Name"
        hint="e.g. Glossier, LMNT, Stanley"
        error={errors.brandName}
      >
        <input
          type="text"
          value={form.brandName}
          onChange={(e) => handleChange('brandName', e.target.value)}
          placeholder="e.g. LMNT"
          className={inputClass(!!errors.brandName)}
          disabled={isLoading}
        />
      </Field>

      {/* Product */}
      <Field
        label="Product / Service"
        hint="What exactly is being advertised?"
        error={errors.product}
      >
        <input
          type="text"
          value={form.product}
          onChange={(e) => handleChange('product', e.target.value)}
          placeholder="e.g. Electrolyte drink packets — watermelon salt flavor"
          className={inputClass(!!errors.product)}
          disabled={isLoading}
        />
      </Field>

      {/* Target Audience */}
      <Field
        label="Target Audience"
        hint="Who should this content resonate with?"
        error={errors.targetAudience}
      >
        <input
          type="text"
          value={form.targetAudience}
          onChange={(e) => handleChange('targetAudience', e.target.value)}
          placeholder="e.g. Women 25–35, fitness-focused, follow wellness creators"
          className={inputClass(!!errors.targetAudience)}
          disabled={isLoading}
        />
      </Field>

      {/* Tone */}
      <Field
        label="Content Tone"
        hint="How should this feel? e.g. fun and energetic, calm and educational, raw and honest"
        error={errors.tone}
      >
        <input
          type="text"
          value={form.tone}
          onChange={(e) => handleChange('tone', e.target.value)}
          placeholder="e.g. Authentic, conversational, slightly humorous"
          className={inputClass(!!errors.tone)}
          disabled={isLoading}
        />
      </Field>

      {/* Key Messages */}
      <Field
        label="Key Messages"
        hint="One message per line. What must the viewer walk away knowing or feeling?"
        error={errors.keyMessages}
      >
        <textarea
          rows={4}
          value={form.keyMessages}
          onChange={(e) => handleChange('keyMessages', e.target.value)}
          placeholder={`e.g.\nNo sugar, no artificial ingredients\nReplaces morning coffee ritual\nComes in 8 flavors`}
          className={inputClass(!!errors.keyMessages)}
          disabled={isLoading}
        />
      </Field>

      {/* Deliverables */}
      <Field
        label="Deliverables"
        hint="What format, length, and platform? Any specific requirements?"
        error={errors.deliverables}
      >
        <textarea
          rows={2}
          value={form.deliverables}
          onChange={(e) => handleChange('deliverables', e.target.value)}
          placeholder="e.g. 1x 30-second TikTok video, raw/authentic feel, no heavy editing"
          className={inputClass(!!errors.deliverables)}
          disabled={isLoading}
        />
      </Field>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full py-3 px-6 bg-violet-600 hover:bg-violet-500 disabled:bg-violet-900 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors"
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            {submitLabel ?? 'Saving…'}
          </span>
        ) : (
          submitLabel ?? 'Save Brand Brief →'
        )}
      </button>
    </form>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string
  hint?: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-zinc-300">{label}</label>
      {hint && <p className="text-xs text-zinc-500">{hint}</p>}
      {children}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}

function inputClass(hasError: boolean): string {
  return [
    'w-full bg-zinc-800 border rounded-lg px-3 py-2 text-sm text-zinc-100',
    'placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-violet-500',
    'disabled:opacity-50 disabled:cursor-not-allowed resize-none',
    hasError ? 'border-red-500' : 'border-zinc-700',
  ].join(' ')
}
