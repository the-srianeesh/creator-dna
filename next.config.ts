import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Allow longer API responses for Whisper transcription + LLM generation
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  // Increase default response timeout for streaming and LLM calls
  serverExternalPackages: [],
}

export default nextConfig
