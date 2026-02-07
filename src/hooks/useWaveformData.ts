/**
 * useWaveformData - React hook for fetching and caching real audio waveform peaks.
 *
 * Flow:
 * 1. Check localStorage cache → return immediately if found
 * 2. Fetch audio stream URL via /api/piped-streams (ANDROID InnerTube API → un-throttled URLs)
 * 3. Download audio via /api/audio-proxy (server-side proxy for CORS) → decode → extract peaks
 * 4. Cache result in localStorage for future instant loads
 * 5. On any error → peaks stays null, component shows fallback waveform
 */

import { useState, useEffect, useRef } from 'react'
import { extractPeaks, getCachedPeaks, setCachedPeaks } from '../utils/waveformUtils'

interface UseWaveformDataResult {
  peaks: number[] | null
  isLoading: boolean
}

interface AudioStream {
  url: string
  mimeType?: string
  bitrate?: number
  quality?: string
  contentLength?: number
}

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
  // Step 1: Get audio stream info
  const streamsRes = await fetch(`/api/piped-streams?videoId=${encodeURIComponent(videoId)}`, {
    signal,
  })
  if (!streamsRes.ok) return null

  const data = await streamsRes.json()
  const stream = pickStream(data.audioStreams)
  if (!stream?.url) return null

  // Step 2: Download audio data through server-side proxy
  // Direct browser fetch won't work - YouTube doesn't set CORS headers on googlevideo.com
  const audioRes = await fetch(`/api/audio-proxy?url=${encodeURIComponent(stream.url)}`, { signal })
  if (!audioRes.ok) return null

  const arrayBuffer = await audioRes.arrayBuffer()

  // Step 3: Decode and extract peaks
  const audioContext = new AudioContext()
  try {
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
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
