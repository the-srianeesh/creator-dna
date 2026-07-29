# UGC AI Strategist — Implementation Plan

## Top-Level Overview

Build a full-stack web application that helps UGC creators produce on-brand ad content by:
1. Analyzing a creator's style "fingerprint" from their own TikTok/Instagram videos
2. Ingesting a structured brand brief
3. Generating three distinct content directions (with scripts) that blend the creator's natural style with the brand's requirements
4. Hosting an interactive follow-up chat so the creator can refine scripts and get more clarity

**Stack:**
- **Frontend:** Next.js (App Router) + Tailwind CSS
- **Backend:** Next.js API Routes (Node.js)
- **Video fetching:** `yt-dlp` (CLI tool, called from the server)
- **Transcription:** Auto-captions via `yt-dlp` (Standard) or local OpenAI Whisper (Deep)
- **LLM:** Ollama running Llama 3 locally
- **Storage:** In-memory / local JSON files for session state (no database needed for v1)

**User-selectable analysis mode:**
- **Standard** — uses auto-captions from the platform (fast)
- **Deep** — uses local Whisper to transcribe from audio (accurate)

---

## Sub-Tasks

---

### Sub-Task 1 — Project Scaffold

**Intent:**
Bootstrap the Next.js project with the correct folder structure, dependencies, and config so every subsequent sub-task has a stable foundation to build on.

**Expected Outcomes:**
- `next dev` runs without errors
- Tailwind CSS is functional
- Folder structure matches the architecture used throughout the plan
- `yt-dlp` and `ollama` are confirmed available on the host machine (checked via a startup health check route)
- Whisper Python package is installed and callable from Node via `child_process`

**Todo List:**
1. Run `npx create-next-app@latest` with App Router, TypeScript, and Tailwind CSS
2. Install runtime dependencies: `axios`, `uuid`, `form-data`
3. Confirm `yt-dlp` is installed on the host (`yt-dlp --version`)
4. Confirm `ollama` is running and `llama3` model is pulled (`ollama list`)
5. Confirm `openai-whisper` is installed (`whisper --help`)
6. Create the top-level folder structure:
   ```
   /app               → Next.js pages and layouts
   /app/api           → API route handlers
   /lib               → Shared server-side utilities
   /lib/ytdlp.ts      → yt-dlp wrapper
   /lib/whisper.ts    → Whisper wrapper
   /lib/ollama.ts     → Ollama/LLM client
   /lib/analyzer.ts   → Creator fingerprint analyzer
   /lib/strategist.ts → Content direction generator
   /components        → Reusable UI components
   /types             → Shared TypeScript types
   /sessions          → Local JSON session storage (gitignored)
   ```
7. Create `/app/api/health/route.ts` that checks yt-dlp, ollama, and whisper availability
8. Add a `.env.local` with `OLLAMA_BASE_URL=http://localhost:11434` and `OLLAMA_MODEL=llama3`

**Relevant Context:**
- No existing codebase — greenfield
- `yt-dlp` must be installed on the host OS, not as an npm package
- Whisper is a Python CLI tool; Node calls it via `child_process.exec`
- Ollama exposes a REST API at `localhost:11434`

**Status:** [x] done

---

### Sub-Task 2 — Video Ingestion & Transcription Layer

**Intent:**
Build the server-side utilities that accept a public TikTok or Instagram video URL, download captions or audio via `yt-dlp`, and produce a plain-text transcript. This is the raw data pipeline that feeds all AI analysis.

**Expected Outcomes:**
- Given a public TikTok or Instagram URL, the server returns a transcript string
- Standard mode returns captions pulled directly by `yt-dlp` (no audio download)
- Deep mode downloads audio and passes it to local Whisper, returning the transcript
- Both modes return the same output shape so the rest of the app is mode-agnostic
- Errors (private video, geo-blocked, no captions in standard mode) are handled gracefully with clear messages

**Todo List:**
1. Implement `lib/ytdlp.ts`:
   - `fetchCaptions(url): Promise<string>` — runs `yt-dlp --write-auto-sub --skip-download` and reads the `.vtt` file
   - `fetchAudio(url, outputPath): Promise<string>` — runs `yt-dlp -x --audio-format mp3 -o <outputPath>`
   - `fetchVideoMetadata(url): Promise<VideoMetadata>` — runs `yt-dlp --dump-json` and parses title, description, like count, view count, duration
   - Strip VTT markup tags from caption output to get clean text
2. Implement `lib/whisper.ts`:
   - `transcribeAudio(audioPath): Promise<string>` — calls `whisper <audioPath> --model base --output_format txt` via `child_process`
   - Reads the output `.txt` file and returns the transcript
3. Implement `lib/transcription.ts`:
   - `transcribe(url, mode: 'standard' | 'deep'): Promise<TranscriptResult>` — orchestrates the above, returns `{ transcript, metadata, mode }`
4. Write unit-testable helper to clean and normalize raw transcript text (remove filler artifacts, normalize whitespace)
5. Create `/app/api/transcribe/route.ts` (POST) — accepts `{ url, mode }`, returns `TranscriptResult`

**Relevant Context:**
- `yt-dlp` writes caption files to a temp path; use Node's `os.tmpdir()` for temp file management
- Whisper `base` model is fast and sufficient for style analysis; `small` or `medium` can be used for higher accuracy
- VTT files contain timestamps and HTML-like tags that must be stripped before passing to the LLM

**Status:** [ ] pending

---

### Sub-Task 3 — Creator Fingerprint Analyzer

**Intent:**
Build the AI analysis layer that processes multiple video transcripts + metadata for a single creator and produces a structured "fingerprint" — a rich profile of their style across all 11 dimensions specified in the requirements.

**Expected Outcomes:**
- Given an array of `TranscriptResult` objects for a creator, the analyzer returns a `CreatorFingerprint` object
- The fingerprint captures: humor style, pacing, editing style, hook patterns, storytelling structure, camera angle tendencies, energy level, niche, CTA style, vocabulary patterns, and emotional tone + audience interaction style
- The fingerprint is generated by a structured LLM prompt sent to Ollama/Llama 3
- The fingerprint is serializable to JSON for session storage

**Todo List:**
1. Define the `CreatorFingerprint` TypeScript type in `/types/index.ts` with all 11 dimensions as typed fields
2. Implement `lib/ollama.ts`:
   - `chat(systemPrompt: string, userMessage: string): Promise<string>` — calls Ollama REST API (`POST /api/chat`)
   - Support streaming responses for the follow-up chat feature (Sub-Task 6)
3. Implement `lib/analyzer.ts`:
   - `analyzeCreator(transcripts: TranscriptResult[]): Promise<CreatorFingerprint>`
   - Builds a system prompt that instructs the LLM to act as a content strategist
   - Concatenates all transcripts and metadata into the user message
   - Instructs the LLM to return a **JSON object** conforming to the `CreatorFingerprint` shape
   - Parses and validates the JSON response
4. Create `/app/api/analyze/route.ts` (POST) — accepts `{ transcripts, sessionId }`, stores fingerprint in `/sessions/<sessionId>.json`, returns `CreatorFingerprint`

**Relevant Context:**
- Llama 3 handles JSON output well when explicitly instructed with a schema in the prompt
- The system prompt should include example values for each fingerprint dimension to guide output quality
- Session state is stored as a flat JSON file keyed by `sessionId` (generated with `uuid`)

**Status:** [ ] pending

---

### Sub-Task 4 — Brand Brief Intake & Session Management

**Intent:**
Build the structured brand brief form on the frontend and the session management system that ties together the creator fingerprint, brand brief, and all generated content into a single session object persisted locally.

**Expected Outcomes:**
- Users can fill in a structured form with: Brand Name, Product/Service, Target Audience, Tone, Key Messages (multi-line), and Deliverables
- Form data is validated client-side before submission
- A session object is created/updated in `/sessions/<sessionId>.json` containing both the fingerprint and the brand brief
- Sessions survive page refresh (session ID stored in `localStorage`)

**Todo List:**
1. Define `BrandBrief` and `Session` TypeScript types in `/types/index.ts`
2. Build `/components/BrandBriefForm.tsx` — a controlled form with fields for all 6 brand brief dimensions, with basic required-field validation
3. Create `/app/api/session/route.ts`:
   - `POST` — creates a new session, returns `sessionId`
   - `PUT` — updates an existing session with new data (fingerprint, brief, directions)
   - `GET` — retrieves a session by `?sessionId=`
4. Implement `lib/session.ts` — thin file I/O wrapper: `readSession`, `writeSession`, `updateSession`
5. Wire the brand brief form to call `PUT /api/session` on submit, storing the brief in the active session

**Relevant Context:**
- Session files live in `/sessions/` (gitignored)
- `sessionId` is a UUID generated when the user first loads the app and stored in `localStorage`
- Keep session schema flat and simple — no nested normalization needed for v1

**Status:** [ ] pending

---

### Sub-Task 5 — Content Direction Generator

**Intent:**
Build the core AI generation feature: given a creator's fingerprint, their brand brief, and a selection of their most relevant past videos, produce three distinct content directions — each with a creative angle, rationale, and a full script.

**Expected Outcomes:**
- The system selects the most relevant past videos from the creator's analyzed content based on the brand brief's tone and niche
- Three content directions are generated, each containing: a direction title, creative angle, why-it-fits-the-creator rationale, a full script with hooks/body/CTA, and suggested visual/editing notes
- Each direction is meaningfully different (different hook style, storytelling structure, or energy level)
- Results are stored in the session and displayed in the UI

**Todo List:**
1. Implement `lib/strategist.ts`:
   - `selectRelevantVideos(transcripts: TranscriptResult[], brief: BrandBrief): TranscriptResult[]` — uses the LLM to rank and pick the top 3–5 most stylistically relevant videos given the brief's tone and product
   - `generateDirections(fingerprint: CreatorFingerprint, brief: BrandBrief, relevantTranscripts: TranscriptResult[]): Promise<ContentDirection[]>` — sends a structured prompt to Ollama instructing it to generate exactly 3 directions as a JSON array
2. Define `ContentDirection` type: `{ title, angle, rationale, script: { hook, body, cta }, visualNotes }`
3. Design the LLM prompt carefully:
   - System: "You are a UGC content strategist. You write in the creator's exact voice."
   - Include the full fingerprint as context
   - Include excerpts from relevant past transcripts as style examples
   - Include the brand brief
   - Instruct output as a JSON array of 3 `ContentDirection` objects
4. Create `/app/api/generate/route.ts` (POST) — accepts `{ sessionId }`, reads session, calls `generateDirections`, stores results in session, returns `ContentDirection[]`
5. Build `/components/ContentDirections.tsx` — displays all 3 directions in expandable cards, showing angle, rationale, script sections, and visual notes

**Relevant Context:**
- Llama 3 8B may truncate long outputs; keep individual direction scripts under ~400 words each
- The "relevant video selection" step can be done with a shorter LLM call or simple keyword matching against the brief's key messages — start simple
- Visual/editing notes should reference the creator's own editing patterns from the fingerprint

**Status:** [ ] pending

---

### Sub-Task 6 — Interactive Follow-Up Chat

**Intent:**
Build the conversational refinement layer where the creator can ask the AI follow-up questions about any of the three directions — getting clarification, alternative hooks, line rewrites, or additional scripting guidance — all grounded in their fingerprint and the brand brief.

**Expected Outcomes:**
- A chat interface appears after directions are generated
- The creator can type free-form questions or requests (e.g. "Give me 3 alternative hooks for direction 2", "Rewrite the CTA to sound less salesy")
- The AI responds in the context of the session (fingerprint + brief + directions all included in the system prompt)
- Chat history is maintained within the session
- Responses stream to the UI in real time

**Todo List:**
1. Build `/components/ChatInterface.tsx` — a scrollable message thread with a text input and send button
2. Create `/app/api/chat/route.ts` (POST, streaming):
   - Loads the session (fingerprint + brief + all 3 directions)
   - Constructs a system prompt: "You are a UGC content strategist helping this creator. Here is their style fingerprint: [...]. Here is the brand brief: [...]. Here are the 3 content directions already generated: [...]."
   - Appends the user's message to chat history
   - Streams the Ollama response back using `ReadableStream` / Next.js streaming response
   - Saves the updated chat history to the session
3. Update `lib/ollama.ts` to support streaming: `chatStream(systemPrompt, messages): ReadableStream`
4. Wire the frontend to consume the streaming response and append tokens to the UI as they arrive
5. Display which direction the creator is currently discussing (optional direction context selector)

**Relevant Context:**
- Next.js App Router supports streaming responses via `new Response(readableStream)`
- Ollama's `/api/chat` endpoint supports streaming with `"stream": true`
- Keep system prompt length in check — summarize directions rather than including full scripts if context window is tight

**Status:** [ ] pending

---

### Sub-Task 7 — Full UI Assembly & User Flow

**Intent:**
Wire all components together into a cohesive, polished single-page experience with clear step-by-step flow: video input → analysis mode selection → fingerprint display → brand brief → content directions → follow-up chat.

**Expected Outcomes:**
- The app has a clear multi-step flow with visual progress indication
- Each step is gated (can't proceed to brand brief until analysis is complete, etc.)
- Loading states, error messages, and empty states are handled throughout
- The UI is clean and responsive on desktop

**Todo List:**
1. Build the main page layout in `/app/page.tsx` with a stepper component showing: Step 1: Add Videos → Step 2: Analyze → Step 3: Brand Brief → Step 4: Generate → Step 5: Refine
2. Build `/components/VideoUrlInput.tsx` — allows adding multiple URLs one by one, shows a list of added URLs, allows removal, includes the Standard/Deep mode toggle
3. Build `/components/FingerprintDisplay.tsx` — shows the 11 fingerprint dimensions in a readable card/grid layout after analysis completes
4. Assemble the full page flow in `/app/page.tsx`, connecting all components and API calls with React state
5. Add loading spinners and progress indicators for: transcription (per video), analysis, and generation steps
6. Add error boundaries and user-friendly error messages for failed video fetches, LLM timeouts, etc.
7. Style with Tailwind: dark background, clean typography, card-based layout consistent with a modern creator tool aesthetic

**Relevant Context:**
- Session ID is initialized in a `useEffect` on first load and stored in `localStorage`
- All API calls pass `sessionId` in the request body
- The stepper should allow going back to previous steps to add more videos or edit the brief

**Status:** [ ] pending

---

## Architecture Diagram

```
User Browser
    │
    ▼
Next.js Frontend (App Router)
    │  VideoUrlInput + Mode Toggle
    │  FingerprintDisplay
    │  BrandBriefForm
    │  ContentDirections
    │  ChatInterface
    │
    ▼
Next.js API Routes
    ├── POST /api/transcribe   → yt-dlp + Whisper/Captions
    ├── POST /api/analyze      → Ollama (fingerprint)
    ├── POST /api/session      → Session CRUD
    ├── POST /api/generate     → Ollama (3 directions)
    └── POST /api/chat         → Ollama streaming (follow-up)
    │
    ├── yt-dlp (CLI, host OS)
    ├── Whisper (Python CLI, host OS)
    └── Ollama (localhost:11434, llama3)
```

---

## Key Dependencies Summary

| Tool | Purpose | Install |
|---|---|---|
| Next.js + Tailwind | Frontend + API | `npx create-next-app` |
| yt-dlp | Video/caption/audio fetch | `brew install yt-dlp` |
| openai-whisper | Local audio transcription | `pip install openai-whisper` |
| Ollama + Llama 3 | LLM inference | `brew install ollama` + `ollama pull llama3` |
| uuid | Session ID generation | `npm install uuid` |

---

## Non-Goals (v1)

- No user authentication or multi-user support
- No database — sessions are local JSON files
- No video preview or playback in the UI
- No profile URL bulk-fetching (user pastes individual URLs)
- No support for private/restricted videos
