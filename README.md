### CreatorDNA - IBM Bob Hackathon July Creative Industries Challenge

Problem: UGC content works with companies writing brand briefs that outline what a UGC ad must include, and UGC creators then create and sell the
social media advertisement to these companies. However, these brand briefs are often extremely specific with many details, and UGC creators often 
have a hard time creating scripts and videos that meet the entire brand brief's criteria while maintaining their own voice.

Solution: To solve this, I created CreatorDNA, an AI creative director that helps provide directions for UGC creators to take when writing scripts. 
This is a multi-agent system that analyzes video data, crafts a "creator fingerprint", and suggests different advertising moves for UGC creators 
based on the fingerprint and the brand brief. 

The following were used:
Ollama: Serves as the central LLM engine and API abstraction layer used to orchestrate analysis pipelines, synthesize multi-modal data, construct 
Creator DNA Profiles, and generate UGC scripts/strategies.

Whisper (OpenAI CLI): Processes downloaded audio tracks to transcribe spoken content and perform transcript normalization/cleaning.

LLaVA (via Ollama): Analyzes extracted keyframes to evaluate visual telemetry, including camera angles, shot distances, composition, and 
environmental settings.

ffmpeg / ffprobe: Handles underlying video/audio media operations, including keyframe sampling and audio stream extraction.

REST API: Handles local model inference for both textual analysis (analyzer.ts, fingerprint.ts, strategist.ts) and multi-modal keyframe vision 
analysis using the llava model.

How IBM Bob was used: I used IBM Bob as my primary developer. I was responsible for ideation, feature implementation, and testing, while IBM Bob coded the frontend and backend.

### Architecture:
```
                       ┌─────────────────────────┐
                       │  Target Media URL       │
                       │ (TikTok / Instagram)    │
                       └────────────┬────────────┘
                                    │
                                    ▼
                       ┌─────────────────────────┐
                       │       ytdlp.ts          │
                       │ (Download Video/Audio)  │
                       └────────────┬────────────┘
                                    │
           ┌────────────────────────┴────────────────────────┐
           │                                                 │
           ▼                                                 ▼
┌───────────────────────┐                         ┌───────────────────────┐
│      whisper.ts       │                         │    transcription.ts   │
│  (Audio Extraction &  │                         │(Transcription cleanup │
│   Speech-to-Text)     │                         │   and normalization)  │
└──────────┬────────────┘                         └──────────┬────────────┘
           │                                                 │
           └────────────────────────┬────────────────────────┘
                                    │
                                    ▼
                       ┌─────────────────────────┐
                       │       vision.ts         │
                       │ (Frame extraction using |
                       │  ffmpeg / ffprobe and   |
                       │  Frame analysis using   |
                       │    LLaVA Vision Model   |
                       └────────────┬────────────┘
                                    │
                                    ▼
                       ┌─────────────────────────┐
                       │       ollama.ts         │
                       │ (Ollama LLM REST API)   │
                       └────────────┬────────────┘
                                    │
                                    ▼
                       ┌─────────────────────────┐
                       │       analyzer.ts       │
                       │  (Multi-Modal Analysis) │
                       └────────────┬────────────┘
                                    │
                                    ▼
                       ┌─────────────────────────┐
                       │      fingerprint.ts     │
                       │ (Creator DNA Profile)   │
                       └────────────┬────────────┘
                                    │
                                    ▼
                       ┌─────────────────────────┐
                       │      strategist.ts      │
                       │ (UGC Scripts & Strategy)│
                       └─────────────────────────┘

```

### Prerequisites & Setup

Because this application relies on local AI models and CLI tools rather than third-party cloud APIs, you must install the required system dependencies before running the app.

Install System Dependencies (macOS)

```bash
# Install core CLI tools & OpenAI Whisper
brew install ffmpeg yt-dlp openai-whisper ollama

# Pull required local multi-modal LLM
ollama run llava
```

Optional: Override the default whisper binary path (/opt/homebrew/bin/whisper)
```bash
WHISPER_PYTHON=/path/to/your/whisper
```

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
