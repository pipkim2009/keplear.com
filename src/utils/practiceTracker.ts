/**
 * Practice Session Tracker
 * Tracks sandbox and classroom melody completions in localStorage
 */

export interface PracticeSession {
  id: string
  type: 'sandbox' | 'classroom'
  instrument: string
  melodiesCompleted: number
  timestamp: string
  duration?: number // in seconds
  assignmentId?: string
  assignmentTitle?: string
  classroomTitle?: string
}

export interface PracticeStats {
  totalMelodies: number
  sandboxMelodies: number
  classroomMelodies: number
  byInstrument: {
    keyboard: number
    guitar: number
    bass: number
  }
  // Stats for the last 7 days
  weeklyData: {
    date: string
    sandbox: number
    classroom: number
  }[]
}

const STORAGE_KEY_PREFIX = 'keplear-practice-sessions'
const MAX_SESSIONS = 100 // Keep last 100 sessions

// Current user ID for storage key
let currentUserId: string | null = null

/**
 * Set the current user ID for user-specific storage
 */
export function setCurrentUserId(userId: string | null): void {
  currentUserId = userId
}

/**
 * Get the storage key for the current user
 */
function getStorageKey(): string {
  return currentUserId ? `${STORAGE_KEY_PREFIX}-${currentUserId}` : STORAGE_KEY_PREFIX
}

/**
 * Get all practice sessions from localStorage
 */
export function getPracticeSessions(): PracticeSession[] {
  try {
    const stored = localStorage.getItem(getStorageKey())
    if (!stored) return []
    return JSON.parse(stored) as PracticeSession[]
  } catch {
    return []
  }
}

/**
 * Record a new practice session
 */
export function recordPracticeSession(session: Omit<PracticeSession, 'id' | 'timestamp'>): PracticeSession {
  const sessions = getPracticeSessions()

  const newSession: PracticeSession = {
    ...session,
    id: `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString()
  }

  // Add to beginning of array
  sessions.unshift(newSession)

  // Keep only last MAX_SESSIONS
  const trimmed = sessions.slice(0, MAX_SESSIONS)

  try {
    localStorage.setItem(getStorageKey(), JSON.stringify(trimmed))
  } catch {
    // Handle quota exceeded
    console.warn('Failed to save practice session')
  }

  return newSession
}

/**
 * Get practice statistics
 */
export function getPracticeStats(): PracticeStats {
  const sessions = getPracticeSessions()

  // Calculate totals
  let sandboxMelodies = 0
  let classroomMelodies = 0
  const byInstrument = { keyboard: 0, guitar: 0, bass: 0 }

  sessions.forEach(session => {
    if (session.type === 'sandbox') {
      sandboxMelodies += session.melodiesCompleted
    } else {
      classroomMelodies += session.melodiesCompleted
    }

    if (session.instrument in byInstrument) {
      byInstrument[session.instrument as keyof typeof byInstrument] += session.melodiesCompleted
    }
  })

  // Calculate weekly data (Monday to Sunday of current week)
  const weeklyData: PracticeStats['weeklyData'] = []
  const today = new Date()

  // Find Monday of current week (0 = Sunday, 1 = Monday, etc.)
  const dayOfWeek = today.getDay()
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek // If Sunday, go back 6 days
  const monday = new Date(today)
  monday.setDate(today.getDate() + mondayOffset)

  // Generate data for Mon through Sun
  for (let i = 0; i < 7; i++) {
    const date = new Date(monday)
    date.setDate(monday.getDate() + i)
    const dateStr = date.toISOString().split('T')[0]

    let sandbox = 0
    let classroom = 0

    sessions.forEach(session => {
      const sessionDate = session.timestamp.split('T')[0]
      if (sessionDate === dateStr) {
        if (session.type === 'sandbox') {
          sandbox += session.melodiesCompleted
        } else {
          classroom += session.melodiesCompleted
        }
      }
    })

    weeklyData.push({ date: dateStr, sandbox, classroom })
  }

  return {
    totalMelodies: sandboxMelodies + classroomMelodies,
    sandboxMelodies,
    classroomMelodies,
    byInstrument,
    weeklyData
  }
}

/**
 * Get recent practice sessions (for activity feed)
 */
export function getRecentSessions(limit: number = 10): PracticeSession[] {
  return getPracticeSessions().slice(0, limit)
}

/**
 * Clear all practice sessions (for testing/reset)
 */
export function clearPracticeSessions(): void {
  localStorage.removeItem(getStorageKey())
}
