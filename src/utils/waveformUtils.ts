/**
 * Waveform utilities for generating fallback waveforms,
 * extracting real audio peaks, caching, and resampling.
 */

const CACHE_PREFIX = 'keplear_wf_'
const MAX_CACHE_ENTRIES = 100

/**
 * Generate a deterministic fake waveform based on video ID.
 * Used as an instant placeholder while real peaks load.
 */
export function generateFallbackWaveform(videoId: string, numBars: number = 150): number[] {
  const seed = videoId.split('').reduce((acc, char, i) => acc + char.charCodeAt(0) * (i + 1), 0)
  const seededRandom = (n: number) => {
    const x = Math.sin(seed + n) * 10000
    return x - Math.floor(x)
  }

  const waveform: number[] = []
  for (let i = 0; i < numBars; i++) {
    const base = 0.35 + seededRandom(i * 3) * 0.15
    const low = Math.sin(i * 0.08 + seed) * 0.12
    const mid = Math.sin(i * 0.25 + seed * 1.5) * 0.18
    const high = seededRandom(i * 2) * 0.2
    const spike = seededRandom(i * 7) > 0.88 ? seededRandom(i * 11) * 0.25 : 0

    const value = Math.max(0.12, Math.min(1, base + low + mid + high + spike))
    waveform.push(value)
  }
  return waveform
}

/**
 * Extract amplitude peaks from a decoded AudioBuffer.
 * Returns `numPeaks` normalized values (0.12–1.0).
 */
export function extractPeaks(audioBuffer: AudioBuffer, numPeaks: number = 200): number[] {
  const channelData = audioBuffer.getChannelData(0)
  const samplesPerPeak = Math.floor(channelData.length / numPeaks)
  const peaks: number[] = []

  let globalMax = 0
  // First pass: collect raw max absolute values
  const rawPeaks: number[] = []
  for (let i = 0; i < numPeaks; i++) {
    const start = i * samplesPerPeak
    const end = Math.min(start + samplesPerPeak, channelData.length)
    let max = 0
    for (let j = start; j < end; j++) {
      const abs = Math.abs(channelData[j])
      if (abs > max) max = abs
    }
    rawPeaks.push(max)
    if (max > globalMax) globalMax = max
  }

  // Second pass: normalize to 0.12–1.0
  for (let i = 0; i < rawPeaks.length; i++) {
    const normalized = globalMax > 0 ? rawPeaks[i] / globalMax : 0
    peaks.push(Math.max(0.12, normalized))
  }

  return peaks
}

/**
 * Resample a peaks array to a different target count using linear interpolation.
 */
export function resamplePeaks(peaks: number[], targetCount: number): number[] {
  if (peaks.length === 0) return []
  if (peaks.length === targetCount) return peaks

  const result: number[] = []
  const ratio = (peaks.length - 1) / (targetCount - 1 || 1)

  for (let i = 0; i < targetCount; i++) {
    const srcIndex = i * ratio
    const lower = Math.floor(srcIndex)
    const upper = Math.min(lower + 1, peaks.length - 1)
    const frac = srcIndex - lower
    result.push(peaks[lower] * (1 - frac) + peaks[upper] * frac)
  }

  return result
}

/**
 * Get cached peaks from localStorage.
 */
export function getCachedPeaks(videoId: string): number[] | null {
  try {
    const key = CACHE_PREFIX + videoId
    const stored = localStorage.getItem(key)
    if (!stored) return null

    const data = JSON.parse(stored)
    if (!Array.isArray(data.peaks)) return null

    // Update access timestamp for LRU
    data.ts = Date.now()
    localStorage.setItem(key, JSON.stringify(data))

    return data.peaks
  } catch {
    return null
  }
}

/**
 * Cache peaks to localStorage with LRU eviction.
 */
export function setCachedPeaks(videoId: string, peaks: number[]): void {
  try {
    const key = CACHE_PREFIX + videoId

    // Evict oldest entries if at capacity
    evictIfNeeded()

    localStorage.setItem(key, JSON.stringify({ peaks, ts: Date.now() }))
  } catch {
    // Storage full or unavailable - silently fail
  }
}

function evictIfNeeded(): void {
  try {
    const entries: { key: string; ts: number }[] = []

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (!key || !key.startsWith(CACHE_PREFIX)) continue

      try {
        const data = JSON.parse(localStorage.getItem(key)!)
        entries.push({ key, ts: data.ts || 0 })
      } catch {
        // Corrupt entry - remove it
        if (key) localStorage.removeItem(key)
      }
    }

    if (entries.length < MAX_CACHE_ENTRIES) return

    // Sort oldest first, remove extras
    entries.sort((a, b) => a.ts - b.ts)
    const toRemove = entries.length - MAX_CACHE_ENTRIES + 1 // +1 to make room for new entry
    for (let i = 0; i < toRemove; i++) {
      localStorage.removeItem(entries[i].key)
    }
  } catch {
    // Ignore eviction errors
  }
}
