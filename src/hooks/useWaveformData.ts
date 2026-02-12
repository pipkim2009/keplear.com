/**
 * useWaveformData - React hook for fetching and caching real audio waveform peaks.
 *
 * Flow:
 * 1. Check localStorage cache → return immediately if found
 * 2. Fetch audio stream URL via /api/piped-streams (IOS InnerTube API → stream metadata)
 * 3. Download audio via /api/audio-proxy (yt-dlp in dev, server proxy in prod) → decode → extract peaks
 * 4. Cache result in localStorage for future instant loads
 * 5. On any error → peaks stays null, component shows fallback waveform
 */

import { useState, useEffect, useRef } from 'react'
import { extractPeaks, getCachedPeaks, setCachedPeaks } from '../utils/waveformUtils'
import { apiUrl } from '../lib/api'
import { fetchAudioStreams, type AudioStream } from '../lib/youtubeStreams'

// Module-level cache for raw audio ArrayBuffers (reused by stem separation)
const audioBufferCache = new Map<string, ArrayBuffer>()

/** Get a cached raw audio ArrayBuffer for a video ID, if available. */
export function getCachedAudioBuffer(videoId: string): ArrayBuffer | null {
  return audioBufferCache.get(videoId) ?? null
}

/** Download raw audio for a video ID via the proxy pipeline. Returns ArrayBuffer or null. */
export async function downloadAudioBuffer(
  videoId: string,
  signal?: AbortSignal
): Promise<ArrayBuffer | null> {
  // Return cached if available
  const cached = audioBufferCache.get(videoId)
  if (cached) return cached

  // Step 1: Get audio stream info (tries Vercel, external proxy, direct)
  const data = await fetchAudioStreams(videoId, signal)
  const stream = pickStream(data?.audioStreams ?? [])
  if (!stream?.url) return null

  // Step 2: Download audio data through server-side proxy (pass videoId for yt-dlp)
  const audioRes = await fetch(
    apiUrl(
      `/api/audio-proxy?url=${encodeURIComponent(stream.url)}&videoId=${encodeURIComponent(videoId)}`
    ),
    {
      signal,
    }
  )
  if (!audioRes.ok) return null

  const arrayBuffer = await audioRes.arrayBuffer()

  // Cache for reuse by stem separation
  audioBufferCache.set(videoId, arrayBuffer)

  // Limit cache to 3 entries to avoid memory pressure
  if (audioBufferCache.size > 3) {
    const firstKey = audioBufferCache.keys().next().value
    if (firstKey) audioBufferCache.delete(firstKey)
  }

  return arrayBuffer
}

/**
 * Pick the best quality audio stream for stem separation.
 * Prefers highest bitrate for best separation results.
 */
function pickBestStream(audioStreams: AudioStream[]): AudioStream | null {
  if (!audioStreams || audioStreams.length === 0) return null

  const seen = new Set<string>()
  const unique = audioStreams.filter(s => {
    if (!s.url || seen.has(s.url)) return false
    seen.add(s.url)
    return true
  })

  // Sort by bitrate descending — highest quality first
  const candidates = [...unique]
  candidates.sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))
  return candidates[0]
}

// Separate cache for full-quality audio (stem separation)
const fullAudioCache = new Map<string, ArrayBuffer>()

/** Download full-quality audio for stem separation (picks highest bitrate, no size cap). */
export async function downloadFullAudioBuffer(
  videoId: string,
  signal?: AbortSignal
): Promise<ArrayBuffer | null> {
  const cached = fullAudioCache.get(videoId)
  if (cached) return cached

  const data = await fetchAudioStreams(videoId, signal)
  const stream = pickBestStream(data?.audioStreams ?? [])
  if (!stream?.url) return null

  const audioRes = await fetch(
    apiUrl(
      `/api/audio-proxy?url=${encodeURIComponent(stream.url)}&videoId=${encodeURIComponent(videoId)}`
    ),
    {
      signal,
    }
  )
  if (!audioRes.ok) return null

  const arrayBuffer = await audioRes.arrayBuffer()

  fullAudioCache.set(videoId, arrayBuffer)

  // Limit cache to 2 entries (these are larger files)
  if (fullAudioCache.size > 2) {
    const firstKey = fullAudioCache.keys().next().value
    if (firstKey) fullAudioCache.delete(firstKey)
  }

  return arrayBuffer
}

interface UseWaveformDataResult {
  peaks: number[] | null
  isLoading: boolean
}

// AudioStream type imported from youtubeStreams.ts

/**
 * Pick the smallest audio stream for waveform extraction.
 * Prefers streams with known contentLength, falls back to lowest bitrate.
 * We don't prefer mp4 over webm here since waveform decoding failure
 * (e.g. Safari + Opus) gracefully falls back to the fake waveform.
 */
function pickStream(audioStreams: AudioStream[]): AudioStream | null {
  if (!audioStreams || audioStreams.length === 0) return null

  // Deduplicate by URL to avoid picking same stream twice
  const seen = new Set<string>()
  const unique = audioStreams.filter(s => {
    if (!s.url || seen.has(s.url)) return false
    seen.add(s.url)
    return true
  })

  // If we have content length info, sort by size (smallest first)
  const withSize = unique.filter(s => s.contentLength && s.contentLength > 0)
  if (withSize.length > 0) {
    withSize.sort((a, b) => (a.contentLength || 0) - (b.contentLength || 0))
    return withSize[0]
  }

  // Fallback: sort by bitrate ascending
  const candidates = [...unique]
  candidates.sort((a, b) => (a.bitrate || 0) - (b.bitrate || 0))
  return candidates[0]
}

async function fetchAndDecodePeaks(videoId: string, signal: AbortSignal): Promise<number[] | null> {
  const arrayBuffer = await downloadAudioBuffer(videoId, signal)
  if (!arrayBuffer) return null

  // Decode and extract peaks (use a copy since decodeAudioData detaches the buffer)
  const bufferCopy = arrayBuffer.slice(0)
  const audioContext = new AudioContext()
  try {
    const audioBuffer = await audioContext.decodeAudioData(bufferCopy)
    return extractPeaks(audioBuffer, 800)
  } finally {
    await audioContext.close()
  }
}

export function useWaveformData(videoId: string | null): UseWaveformDataResult {
  const [peaks, setPeaks] = useState<number[] | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const currentVideoIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (!videoId) {
      currentVideoIdRef.current = null
      setPeaks(null)
      setIsLoading(false)
      return
    }

    currentVideoIdRef.current = videoId

    // Check cache first
    const cached = getCachedPeaks(videoId)
    if (cached) {
      setPeaks(cached)
      setIsLoading(false)
      return
    }

    // Start background fetch
    const abortController = new AbortController()
    setIsLoading(true)

    fetchAndDecodePeaks(videoId, abortController.signal)
      .then(result => {
        // Guard against stale resolution
        if (currentVideoIdRef.current !== videoId) return

        if (result) {
          setCachedPeaks(videoId, result)
          setPeaks(result)
        }
      })
      .catch(() => {
        // Silently fail - component will show fallback waveform
      })
      .finally(() => {
        if (currentVideoIdRef.current === videoId) {
          setIsLoading(false)
        }
      })

    return () => {
      abortController.abort()
    }
  }, [videoId])

  return { peaks, isLoading }
}
