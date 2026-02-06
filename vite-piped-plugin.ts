/**
 * Vite dev server middleware plugin for YouTube audio stream extraction.
 * Handles /api/piped-streams and /api/audio-proxy requests server-side in dev.
 *
 * Stream extraction priority:
 * 1. YouTube ANDROID InnerTube API (direct un-throttled URLs)
 * 2. youtube-info-streams (throttled - 127KB limit)
 * 3. Piped API instances (frequently down)
 */

import type { Plugin } from 'vite'
import type { ServerResponse } from 'http'

const ANDROID_UA = 'com.google.android.youtube/19.02.39 (Linux; U; Android 14) gzip'
const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

const PIPED_INSTANCES = [
  'https://pipedapi.kavin.rocks',
  'https://api.piped.private.coffee',
  'https://pipedapi.adminforge.de',
  'https://pipedapi.leptons.xyz',
  'https://piped-api.privacy.com.de',
  'https://pipedapi.r4fo.com',
]

function jsonResponse(res: ServerResponse, status: number, data: unknown) {
  res.writeHead(status, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(data))
}

/**
 * Primary: YouTube ANDROID InnerTube API.
 * Returns direct URLs with no n-sig throttle.
 */
async function tryAndroidClient(videoId: string) {
  const apiUrl = 'https://www.youtube.com/youtubei/v1/player?prettyPrint=false&alt=json'
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': ANDROID_UA,
      'X-YouTube-Client-Name': '3',
      'X-YouTube-Client-Version': '19.02.39',
    },
    body: JSON.stringify({
      videoId,
      context: {
        client: {
          clientName: 'ANDROID',
          clientVersion: '19.02.39',
          androidSdkVersion: 34,
          hl: 'en',
          gl: 'US',
        },
      },
    }),
  })

  if (!response.ok) throw new Error(`InnerTube API HTTP ${response.status}`)
  const data = await response.json()

  if (data.playabilityStatus?.status !== 'OK') {
    throw new Error(
      `Video not playable: ${data.playabilityStatus?.reason || data.playabilityStatus?.status}`
    )
  }

  const adaptiveFormats = data.streamingData?.adaptiveFormats || []
  const audioStreams = adaptiveFormats
    .filter((f: { mimeType?: string; url?: string }) => f.mimeType?.startsWith('audio/') && f.url)
    .map(
      (f: {
        url: string
        mimeType: string
        bitrate?: number
        audioQuality?: string
        contentLength?: string
      }) => ({
        url: f.url,
        mimeType: f.mimeType,
        bitrate: f.bitrate || 0,
        quality: f.audioQuality || 'unknown',
        contentLength: parseInt(f.contentLength || '0') || 0,
      })
    )

  if (audioStreams.length === 0) throw new Error('No audio streams with URLs')
  return { audioStreams, source: 'android' }
}

/**
 * Fallback: youtube-info-streams (URLs are n-sig throttled to ~127KB).
 */
async function tryYoutubeInfoStreams(videoId: string) {
  const { info } = await import('youtube-info-streams')
  const data = await info(videoId)
  const formats = data.formats || []
  const audioStreams = formats
    .filter((f: { mimeType?: string }) => f.mimeType?.startsWith('audio/'))
    .map(
      (f: {
        url?: string
        mimeType?: string
        bitrate?: number
        audioQuality?: string
        contentLength?: number
      }) => {
        let contentLength = f.contentLength || 0
        if (!contentLength && f.url) {
          try {
            const clen = new URL(f.url).searchParams.get('clen')
            if (clen) contentLength = parseInt(clen) || 0
          } catch {
            /* ignore */
          }
        }
        return {
          url: f.url,
          mimeType: f.mimeType,
          bitrate: f.bitrate || 0,
          quality: f.audioQuality || 'unknown',
          contentLength,
        }
      }
    )

  if (audioStreams.length === 0) throw new Error('No audio streams found')
  return { audioStreams, source: 'youtube-info-streams' }
}

async function tryPipedInstance(instance: string, videoId: string, signal: AbortSignal) {
  const url = `${instance}/streams/${encodeURIComponent(videoId)}`
  const response = await fetch(url, {
    signal,
    headers: { Accept: 'application/json', 'User-Agent': BROWSER_UA },
  })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  const data = await response.json()
  if (!data.audioStreams?.length) throw new Error('No audio streams')
  return data
}

const ALLOWED_AUDIO_HOSTS = [
  '.googlevideo.com',
  '.youtube.com',
  '.kavin.rocks',
  '.private.coffee',
  '.adminforge.de',
]

function isAllowedAudioUrl(urlStr: string): boolean {
  try {
    const host = new URL(urlStr).hostname
    return ALLOWED_AUDIO_HOSTS.some(suffix => host.endsWith(suffix))
  } catch {
    return false
  }
}

/**
 * Download audio from a URL. Uses Range header for googlevideo.com
 * (required even for un-throttled ANDROID URLs).
 */
async function downloadAudio(audioUrl: string, signal: AbortSignal): Promise<Buffer> {
  const MAX_SIZE = 10 * 1024 * 1024 // 10MB safety cap

  // For googlevideo.com, use Range header (YouTube requires it)
  const isGV = new URL(audioUrl).hostname.endsWith('.googlevideo.com')
  const ua = isGV ? ANDROID_UA : BROWSER_UA

  if (isGV) {
    // Try a single large Range request first (works with ANDROID client URLs)
    const response = await fetch(audioUrl, {
      signal,
      headers: { 'User-Agent': ua, Range: `bytes=0-${MAX_SIZE - 1}` },
    })

    if (response.status === 200 || response.status === 206) {
      const buffer = Buffer.from(await response.arrayBuffer())
      return buffer
    }

    // If large range fails, fall back to chunked 256KB downloads
    const CHUNK_SIZE = 256 * 1024
    const chunks: Buffer[] = []
    let offset = 0

    while (offset < MAX_SIZE) {
      const end = Math.min(offset + CHUNK_SIZE - 1, MAX_SIZE - 1)
      const chunkRes = await fetch(audioUrl, {
        signal,
        headers: { 'User-Agent': ua, Range: `bytes=${offset}-${end}` },
      })

      if (chunkRes.status !== 206 && chunkRes.status !== 200) break

      const chunk = Buffer.from(await chunkRes.arrayBuffer())
      chunks.push(chunk)
      offset += chunk.byteLength

      if (chunk.byteLength === 0) break
      if (chunk.byteLength < CHUNK_SIZE) break
    }

    if (chunks.length === 0) throw new Error('No data received')
    return Buffer.concat(chunks)
  }

  // Non-googlevideo URLs - direct fetch
  const response = await fetch(audioUrl, {
    signal,
    headers: { 'User-Agent': ua },
  })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  const buffer = Buffer.from(await response.arrayBuffer())
  if (buffer.byteLength > MAX_SIZE) throw new Error('Audio too large')
  return buffer
}

export function pipedDevPlugin(): Plugin {
  return {
    name: 'piped-dev-middleware',
    configureServer(server) {
      // /api/piped-streams - YouTube audio stream info
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/piped-streams')) return next()

        const url = new URL(req.url, 'http://localhost')
        const videoId = url.searchParams.get('videoId')
        if (!videoId) {
          jsonResponse(res, 400, { error: 'Missing videoId' })
          return
        }

        // Primary: ANDROID InnerTube API (un-throttled URLs)
        try {
          const data = await tryAndroidClient(videoId)
          console.log(
            `[piped-streams] ${videoId}: got ${data.audioStreams.length} streams via Android client`
          )
          jsonResponse(res, 200, data)
          return
        } catch (e) {
          console.warn('[piped-streams] Android client failed:', (e as Error).message)
        }

        // Fallback 1: youtube-info-streams (throttled URLs)
        try {
          const data = await tryYoutubeInfoStreams(videoId)
          console.log(
            `[piped-streams] ${videoId}: got ${data.audioStreams.length} streams via youtube-info-streams`
          )
          jsonResponse(res, 200, data)
          return
        } catch (e) {
          console.warn('[piped-streams] youtube-info-streams failed:', (e as Error).message)
        }

        // Fallback 2: Piped instances
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 15000)

        try {
          for (const instance of PIPED_INSTANCES) {
            try {
              const data = await tryPipedInstance(instance, videoId, controller.signal)
              clearTimeout(timeout)
              jsonResponse(res, 200, data)
              return
            } catch {
              // try next
            }
          }

          clearTimeout(timeout)
          jsonResponse(res, 503, { error: 'All sources unavailable', audioStreams: [] })
        } catch {
          clearTimeout(timeout)
          jsonResponse(res, 500, { error: 'Internal error', audioStreams: [] })
        }
      })

      // /api/audio-proxy - proxy audio data to avoid CORS issues
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/audio-proxy')) return next()

        const url = new URL(req.url, 'http://localhost')
        const audioUrl = url.searchParams.get('url')
        if (!audioUrl) {
          jsonResponse(res, 400, { error: 'Missing url parameter' })
          return
        }

        if (!isAllowedAudioUrl(audioUrl)) {
          jsonResponse(res, 403, { error: 'URL not allowed' })
          return
        }

        try {
          const controller = new AbortController()
          const timeout = setTimeout(() => controller.abort(), 60000)

          const buffer = await downloadAudio(audioUrl, controller.signal)
          clearTimeout(timeout)

          res.setHeader('Content-Type', 'audio/mp4')
          res.writeHead(200)
          res.end(buffer)
        } catch (e) {
          console.warn('[audio-proxy] Download failed:', (e as Error).message)
          res.writeHead(502)
          res.end()
        }
      })
    },
  }
}
