import * as fs from 'fs'
import * as path from 'path'
import { v4 as uuidv4 } from 'uuid'
import type { Session, TranscriptResult, CreatorFingerprint, BrandBrief, ContentDirection, ChatMessage } from '@/types'

const SESSIONS_DIR = path.join(process.cwd(), 'sessions')

// ─── Ensure sessions directory exists ────────────────────────────────────────

function ensureDir() {
  if (!fs.existsSync(SESSIONS_DIR)) {
    fs.mkdirSync(SESSIONS_DIR, { recursive: true })
  }
}

function sessionPath(sessionId: string): string {
  return path.join(SESSIONS_DIR, `${sessionId}.json`)
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export function createSession(): Session {
  ensureDir()
  const now = new Date().toISOString()
  const session: Session = {
    sessionId: uuidv4(),
    createdAt: now,
    updatedAt: now,
    transcripts: [],
    fingerprint: null,
    brief: null,
    directions: [],
    chatHistory: [],
  }
  fs.writeFileSync(sessionPath(session.sessionId), JSON.stringify(session, null, 2))
  return session
}

export function readSession(sessionId: string): Session {
  ensureDir()
  const filePath = sessionPath(sessionId)
  if (!fs.existsSync(filePath)) {
    throw new Error(`Session not found: ${sessionId}`)
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as Session
}

export function writeSession(session: Session): Session {
  ensureDir()
  session.updatedAt = new Date().toISOString()
  fs.writeFileSync(sessionPath(session.sessionId), JSON.stringify(session, null, 2))
  return session
}

// ─── Targeted Updaters ────────────────────────────────────────────────────────

export function addTranscript(sessionId: string, transcript: TranscriptResult): Session {
  const session = readSession(sessionId)
  // Avoid duplicates by URL
  const exists = session.transcripts.find((t) => t.url === transcript.url)
  if (!exists) {
    session.transcripts.push(transcript)
  }
  return writeSession(session)
}

export function setFingerprint(sessionId: string, fingerprint: CreatorFingerprint): Session {
  const session = readSession(sessionId)
  session.fingerprint = fingerprint
  return writeSession(session)
}

export function setBrief(sessionId: string, brief: BrandBrief): Session {
  const session = readSession(sessionId)
  session.brief = brief
  return writeSession(session)
}

export function setDirections(sessionId: string, directions: ContentDirection[]): Session {
  const session = readSession(sessionId)
  session.directions = directions
  return writeSession(session)
}

export function appendChatMessage(sessionId: string, message: ChatMessage): Session {
  const session = readSession(sessionId)
  session.chatHistory.push(message)
  return writeSession(session)
}
