/**
 * Vite dev server middleware plugin for YouTube audio stream extraction.
 * Handles /api/piped-streams and /api/audio-proxy requests server-side in dev.
 *
 * Audio download strategy:
 * 1. yt-dlp subprocess (handles PO tokens, most reliable)
 * 2. Direct fetch with IOS client UA (for non-googlevideo URLs)
 *
 * Stream info extraction (for waveform preview):
 * 1. YouTube IOS InnerTube API
 * 2. youtube-info-streams
 * 3. Piped API instances
 */

import type { Plugin } from 'vite'
import type { ServerResponse } from 'http'
import { execFile } from 'child_process'
import { readFile, unlink, mkdtemp } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'

// IOS client for stream metadata (stream URLs used for waveform preview sizing/picking)
const IOS_UA = 'com.google.ios.youtube/19.45.4 (iPhone16,2; U; CPU iOS 18_1_0 like Mac OS X;)'
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
 * Primary: YouTube IOS InnerTube API.
 * Returns stream metadata (URLs, bitrates, sizes) for the frontend to pick a stream.
 * Note: The stream URLs themselves may return 403 for large downloads due to PO token
 * requirements. The actual audio download is handled by yt-dlp in the audio-proxy.
 */
async function tryIOSClient(videoId: string) {
  const apiUrl = 'https://www.youtube.com/youtubei/v1/player?prettyPrint=false&alt=json'
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': IOS_UA,
      'X-YouTube-Client-Name': '5',
      'X-YouTube-Client-Version': '19.45.4',
    },
    body: JSON.stringify({
      videoId,
      context: {
        client: {
          clientName: 'IOS',
          clientVersion: '19.45.4',
          deviceMake: 'Apple',
          deviceModel: 'iPhone16,2',
          osName: 'iPhone',
          osVersion: '18.1.0.22B83',
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
  return { audioStreams, source: 'ios' }
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

// ─── yt-dlp Audio Download ──────────────────────────────────────────────────

/**
 * Find yt-dlp executable path.
 * Checks common install locations on Windows and PATH.
 */
let ytdlpPath: string | null = null

async function findYtdlp(): Promise<string> {
  if (ytdlpPath) return ytdlpPath

  // Try common paths
  const candidates = [
    'yt-dlp', // PATH
    'yt-dlp.exe', // PATH (Windows)
  ]

  for (const candidate of candidates) {
    try {
      await new Promise<void>((resolve, reject) => {
        execFile(candidate, ['--version'], err => {
          if (err) reject(err)
          else resolve()
        })
      })
      ytdlpPath = candidate
      return candidate
    } catch {
      // try next
    }
  }

  // Try WinGet default location
  const { homedir } = await import('os')
  const wingetPath = join(
    homedir(),
    'AppData/Local/Microsoft/WinGet/Packages',
    'yt-dlp.yt-dlp_Microsoft.Winget.Source_8wekyb3d8bbwe',
    'yt-dlp.exe'
  )

  try {
    await new Promise<void>((resolve, reject) => {
      execFile(wingetPath, ['--version'], err => {
        if (err) reject(err)
        else resolve()
      })
    })
    ytdlpPath = wingetPath
    return wingetPath
  } catch {
    // not found
  }

  throw new Error('yt-dlp not found. Install it: winget install yt-dlp.yt-dlp')
}

/**
 * Download audio using yt-dlp subprocess.
 * Returns the audio file as a Buffer.
 */
async function downloadWithYtdlp(videoId: string): Promise<Buffer> {
  const ytdlp = await findYtdlp()

  // Create temp directory for the download
  const tempDir = await mkdtemp(join(tmpdir(), 'keplear-audio-'))
  const outputPath = join(tempDir, '%(id)s.%(ext)s')

  try {
    // Download best audio only, no post-processing (no ffmpeg needed)
    const args = [
      '-f',
      'bestaudio',
      '--no-playlist',
      '--no-part',
      '--no-mtime',
      '-o',
      outputPath,
      `https://www.youtube.com/watch?v=${videoId}`,
    ]

    console.log(`[audio-proxy] Running yt-dlp for ${videoId}...`)

    await new Promise<void>((resolve, reject) => {
      const proc = execFile(ytdlp, args, { timeout: 60000 }, err => {
        if (err) reject(new Error(`yt-dlp failed: ${err.message}`))
        else resolve()
      })

      // Log stderr for debugging
      proc.stderr?.on('data', (data: Buffer) => {
        const msg = data.toString().trim()
        if (msg) console.log(`[yt-dlp] ${msg}`)
      })
    })

    // Find the downloaded file (extension varies: webm, m4a, opus, etc.)
    const { readdirSync } = await import('fs')
    const files = readdirSync(tempDir)
    const audioFile = files.find(f => f.startsWith(videoId))

    if (!audioFile) throw new Error('yt-dlp produced no output file')

    const filePath = join(tempDir, audioFile)
    const buffer = await readFile(filePath)
    console.log(
      `[audio-proxy] yt-dlp downloaded ${(buffer.byteLength / 1024 / 1024).toFixed(2)} MB`
    )

    // Clean up
    try {
      await unlink(filePath)
      const { rmdirSync } = await import('fs')
      rmdirSync(tempDir)
    } catch {
      // cleanup failure is non-fatal
    }

    return buffer
  } catch (e) {
    // Clean up temp dir on error
    try {
      const { rmSync } = await import('fs')
      rmSync(tempDir, { recursive: true, force: true })
    } catch {
      // ignore
    }
    throw e
  }
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

        // Primary: IOS InnerTube API
        try {
          const data = await tryIOSClient(videoId)
          console.log(
            `[piped-streams] ${videoId}: got ${data.audioStreams.length} streams via iOS client`
          )
          jsonResponse(res, 200, data)
          return
        } catch (e) {
          console.warn('[piped-streams] iOS client failed:', (e as Error).message)
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

      // /api/spleeter-model - serve ONNX model files (local first, then HuggingFace)
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/spleeter-model')) return next()

        const url = new URL(req.url, 'http://localhost')
        const model = url.searchParams.get('model') || '2stems'
        const stem = url.searchParams.get('stem') || 'vocals'

        const validModels = ['2stems', '4stems', '5stems']
        if (!validModels.includes(model)) {
          res.writeHead(400)
          res.end('Invalid model parameter')
          return
        }

        // Try local file first (from conversion script output)
        const localPath = join(process.cwd(), 'spleeter-onnx', model, `${stem}.onnx`)
        try {
          const localBuffer = await readFile(localPath)
          console.log(
            `[spleeter-model] Serving local ${model}/${stem}.onnx (${(localBuffer.byteLength / 1024 / 1024).toFixed(1)} MB)`
          )
          res.setHeader('Content-Type', 'application/octet-stream')
          res.setHeader('Content-Length', localBuffer.byteLength.toString())
          res.writeHead(200)
          res.end(localBuffer)
          return
        } catch {
          // No local file, fall through to HuggingFace
        }

        // Fall back to HuggingFace
        const modelUrl = `https://huggingface.co/csukuangfj/sherpa-onnx-spleeter-${model}/resolve/main/${stem}.onnx`

        try {
          console.log(`[spleeter-model] Fetching ${stem}.onnx from HuggingFace...`)
          const response = await fetch(modelUrl)
          if (!response.ok) {
            res.writeHead(response.status)
            res.end(`Failed to fetch model: HTTP ${response.status}`)
            return
          }

          res.setHeader('Content-Type', 'application/octet-stream')
          res.setHeader('Access-Control-Allow-Origin', '*')
          const contentLength = response.headers.get('content-length')
          if (contentLength) res.setHeader('Content-Length', contentLength)
          res.writeHead(200)

          const reader = (response.body as ReadableStream<Uint8Array>).getReader()
          let totalBytes = 0
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            res.write(value)
            totalBytes += value.byteLength
          }
          console.log(
            `[spleeter-model] Streamed ${stem}.onnx: ${(totalBytes / 1024 / 1024).toFixed(1)} MB`
          )
          res.end()
        } catch (e) {
          console.error('[spleeter-model] Failed:', (e as Error).message)
          if (!res.headersSent) res.writeHead(502)
          res.end()
        }
      })

      // /api/audio-proxy - download audio via yt-dlp (primary) or direct fetch (fallback)
      // Accepts: ?url=<googlevideo URL>&videoId=<YouTube video ID>
      // When videoId is provided, uses yt-dlp for reliable download.
      // When only url is provided, falls back to direct fetch.
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/audio-proxy')) return next()

        const url = new URL(req.url, 'http://localhost')
        const audioUrl = url.searchParams.get('url')
        const videoId = url.searchParams.get('videoId')

        if (!audioUrl && !videoId) {
          jsonResponse(res, 400, { error: 'Missing url or videoId parameter' })
          return
        }

        try {
          let buffer: Buffer

          // Primary: yt-dlp download (handles PO tokens, most reliable)
          if (videoId) {
            console.log(`[audio-proxy] Using yt-dlp for ${videoId}`)
            buffer = await downloadWithYtdlp(videoId)
          } else if (audioUrl) {
            // Fallback: direct fetch (for non-YouTube URLs or if yt-dlp unavailable)
            const parsedAudioUrl = new URL(audioUrl)
            console.log(`[audio-proxy] Direct download: host=${parsedAudioUrl.hostname}`)

            const controller = new AbortController()
            const timeout = setTimeout(() => controller.abort(), 60000)
            const ua = parsedAudioUrl.hostname.endsWith('.googlevideo.com') ? IOS_UA : BROWSER_UA

            const response = await fetch(audioUrl, {
              signal: controller.signal,
              headers: { 'User-Agent': ua },
            })
            clearTimeout(timeout)

            if (!response.ok) throw new Error(`HTTP ${response.status}`)
            buffer = Buffer.from(await response.arrayBuffer())
          } else {
            throw new Error('No download source')
          }

          console.log(`[audio-proxy] Success: ${(buffer.byteLength / 1024 / 1024).toFixed(2)} MB`)
          res.setHeader('Content-Type', 'audio/webm')
          res.writeHead(200)
          res.end(buffer)
        } catch (e) {
          console.warn('[audio-proxy] Download failed:', (e as Error).message)
          if (!res.headersSent) res.writeHead(502)
          res.end()
        }
      })
    },
  }
}
