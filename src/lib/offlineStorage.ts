import { Capacitor } from '@capacitor/core'
import { Preferences } from '@capacitor/preferences'

/**
 * Cross-platform storage: uses @capacitor/preferences on native, localStorage on web.
 */
async function setItem(key: string, value: string): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    await Preferences.set({ key, value })
  } else {
    localStorage.setItem(key, value)
  }
}

async function getItem(key: string): Promise<string | null> {
  if (Capacitor.isNativePlatform()) {
    const { value } = await Preferences.get({ key })
    return value
  }
  return localStorage.getItem(key)
}

async function removeItem(key: string): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    await Preferences.remove({ key })
  } else {
    localStorage.removeItem(key)
  }
}

const OFFLINE_PRACTICE_QUEUE_KEY = 'keplear_offline_practice_queue'

interface OfflinePracticeSession {
  userId: string
  instrument: string
  scaleOrChord: string
  score: number
  timestamp: string
}

/**
 * Queue a practice session for later sync when offline.
 */
export async function queuePracticeSession(session: OfflinePracticeSession): Promise<void> {
  const existing = await getItem(OFFLINE_PRACTICE_QUEUE_KEY)
  const queue: OfflinePracticeSession[] = existing ? JSON.parse(existing) : []
  queue.push(session)
  await setItem(OFFLINE_PRACTICE_QUEUE_KEY, JSON.stringify(queue))
}

/**
 * Get all queued offline practice sessions.
 */
export async function getOfflineQueue(): Promise<OfflinePracticeSession[]> {
  const data = await getItem(OFFLINE_PRACTICE_QUEUE_KEY)
  return data ? JSON.parse(data) : []
}

/**
 * Clear the offline practice queue after successful sync.
 */
export async function clearOfflineQueue(): Promise<void> {
  await removeItem(OFFLINE_PRACTICE_QUEUE_KEY)
}

/**
 * Save arbitrary data for offline use.
 */
export async function saveForOffline(key: string, data: unknown): Promise<void> {
  await setItem(`keplear_offline_${key}`, JSON.stringify(data))
}

/**
 * Load offline data.
 */
export async function loadOffline<T>(key: string): Promise<T | null> {
  const data = await getItem(`keplear_offline_${key}`)
  return data ? JSON.parse(data) : null
}
