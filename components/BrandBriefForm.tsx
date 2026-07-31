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

const FIELDS: {
  key: keyof BrandBrief
  label: string
  placeholder: string
  hint: string
  multiline?: boolean
  rows?: number
}[] = [
  {
    key: 'brandName',
    label: 'Brand Name',
    placeholder: 'e.g. LMNT, Glossier, Stanley',
    hint: 'The brand you\'re creating content for',
  },
  {
    key: 'product',
    label: 'Product / Service',
    placeholder: 'e.g. Electrolyte drink packets — watermelon salt flavor',
    hint: 'Be specific — what exactly is being advertised?',
  },
  {
    key: 'targetAudience',
    label: 'Target Audience',
    placeholder: 'e.g. Women 25–35, fitness-focused, follow wellness creators',
    hint: 'Who should this content resonate with?',
  },
  {
    key: 'tone',
    label: 'Content Tone',
    placeholder: 'e.g. Authentic, conversational, slightly humorous',
    hint: 'How should this feel?',
  },
  {
    key: 'keyMessages',
    label: 'Key Messages',
    placeholder: 'No sugar, no artificial ingredients\nReplaces morning coffee ritual\nComes in 8 flavors',
    hint: 'One message per line — what must the viewer walk away knowing?',
    multiline: true,
    rows: 4,
  },
  {
    key: 'deliverables',
    label: 'Deliverables',
    placeholder: '1x 30-second TikTok, raw/authentic feel, no heavy editing',
    hint: 'Format, length, platform, and any constraints',
    multiline: true,
    rows: 2,
  },
]

export default function BrandBriefForm({ onSubmit, isLoading = false, initialValues, submitLabel }: Props) {
  const [form, setForm] = useState<BrandBrief>({ ...EMPTY, ...initialValues })
  const [errors, setErrors] = useState<Partial<Record<keyof BrandBrief, string>>>({})

  function validate(): boolean {
    const newErrors: Partial<Record<keyof BrandBrief, string>> = {}
    if (!form.brandName.trim()) newErrors.brandName = 'Required'
    if (!form.product.trim()) newErrors.product = 'Required'
    if (!form.targetAudience.trim()) newErrors.targetAudience = 'Required'
    if (!form.tone.trim()) newErrors.tone = 'Required'
    if (!form.keyMessages.trim()) newErrors.keyMessages = 'Add at least one key message'
    if (!form.deliverables.trim()) newErrors.deliverables = 'Required'
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

  const completedFields = Object.values(form).filter((v) => v.trim().length > 0).length
  const progress = Math.round((completedFields / 6) * 100)

  return (
    <form onSubmit={handleSubmit} className="space-y-5 animate-fade-in">

      {/* Progress indicator */}
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs text-[#8A99B3] font-medium">{completedFields} of 6 fields complete</p>
        <p className="text-xs font-semibold text-[#1B2B4B]">{progress}%</p>
      </div>
      <div className="h-1.5 rounded-full bg-[#E4E8F0] overflow-hidden">
        <div
          className="h-full rounded-full dna-gradient transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Fields */}
      <div className="space-y-4 pt-2">
        {FIELDS.map(({ key, label, placeholder, hint, multiline, rows }) => (
          <div key={key} className="space-y-1.5 animate-slide-up">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-[#1B2B4B]">{label}</label>
              {errors[key] && (
                <span className="text-xs text-[#E8365D] font-medium">{errors[key]}</span>
              )}
            </div>
            <p className="text-xs text-[#8A99B3]">{hint}</p>
            {multiline ? (
              <textarea
                rows={rows}
                value={form[key]}
                onChange={(e) => handleChange(key, e.target.value)}
                placeholder={placeholder}
                disabled={isLoading}
                className={[
                  'w-full border rounded-xl px-4 py-3 text-sm text-[#1B2B4B] placeholder:text-[#C8D0E0] bg-white',
                  'focus:outline-none focus:ring-2 focus:ring-[#00C8D4] focus:border-transparent',
                  'disabled:opacity-50 disabled:cursor-not-allowed resize-none transition-smooth',
                  errors[key] ? 'border-[#E8365D]' : 'border-[#E4E8F0] hover:border-[#C8D0E0]',
                ].join(' ')}
              />
            ) : (
              <input
                type="text"
                value={form[key]}
                onChange={(e) => handleChange(key, e.target.value)}
                placeholder={placeholder}
                disabled={isLoading}
                className={[
                  'w-full border rounded-xl px-4 py-3 text-sm text-[#1B2B4B] placeholder:text-[#C8D0E0] bg-white',
                  'focus:outline-none focus:ring-2 focus:ring-[#00C8D4] focus:border-transparent',
                  'disabled:opacity-50 disabled:cursor-not-allowed transition-smooth',
                  errors[key] ? 'border-[#E8365D]' : 'border-[#E4E8F0] hover:border-[#C8D0E0]',
                ].join(' ')}
              />
            )}
          </div>
        ))}
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={isLoading}
        className="w-full py-4 rounded-2xl text-sm font-bold text-white transition-smooth disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden group mt-2"
        style={{ background: 'linear-gradient(135deg, #1B2B4B 0%, #2D4169 100%)' }}
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            {submitLabel ?? 'Working…'}
          </span>
        ) : (
          <span className="relative z-10">{submitLabel ?? 'Save Brand Brief →'}</span>
        )}
        <div className="absolute inset-0 dna-gradient opacity-0 group-hover:opacity-20 transition-smooth" />
      </button>
    </form>
  )
}
