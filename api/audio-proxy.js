/**
 * Vercel Serverless Function - Audio Proxy
 * Proxies audio data from YouTube to avoid CORS restrictions.
 * Uses IOS User-Agent for googlevideo.com URLs (matches the client used in piped-streams.js).
 *
 * Streams the response to avoid buffering large files in memory,
 * supporting songs of any length (no hard size cap).
 */

const IOS_UA =
  'com.google.ios.youtube/20.03.2 (iPhone16,2; U; CPU iOS 18_3_0 like Mac OS X;)'
const BROWSER_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

const ALLOWED_HOST_SUFFIXES = [
  '.kavin.rocks',
  '.private.coffee',
  '.adminforge.de',
  '.garudalinux.org',
  '.r4fo.com',
  '.darkness.services',
  '.simpleprivacy.fr',
  '.googlevideo.com',
  '.youtube.com',
  '.nadeko.net',
  '.fdn.fr',
  '.nerdvpn.de'
]

function isAllowedUrl(urlStr) {
  try {
    const host = new URL(urlStr).hostname
    return ALLOWED_HOST_SUFFIXES.some(suffix => host.endsWith(suffix))
  } catch {
    return false
  }
}

function isGoogleVideoUrl(urlStr) {
  try {
    return new URL(urlStr).hostname.endsWith('.googlevideo.com')
  } catch {
    return false
  }
}

const ALLOWED_ORIGINS = [
  'https://keplear.com',
  'https://www.keplear.com',
  'http://localhost:5173',
  'capacitor://localhost',
  'http://localhost'
]

function getCorsOrigin(req) {
  const origin = req.headers.origin || req.headers.referer || ''
  return ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
}

/**
 * Fetch upstream audio and stream the response body back to the client.
 * For googlevideo.com URLs, uses a Range request covering the full file
 * to avoid YouTube's throttling, with a chunked fallback.
 */
async function streamAudio(url, res, signal) {
  const isGV = isGoogleVideoUrl(url)
  const ua = isGV ? IOS_UA : BROWSER_UA

  if (isGV) {
    // Parse actual file size from clen URL parameter
    const clen = parseInt(new URL(url).searchParams.get('clen') || '0') || 0
    const downloadSize = clen || undefined // undefined = no cap

    // Single Range request for full file
    const rangeEnd = downloadSize ? downloadSize - 1 : ''
    const response = await fetch(url, {
      signal,
      headers: { 'User-Agent': ua, 'Range': `bytes=0-${rangeEnd}` }
    })

    if (response.status === 200 || response.status === 206) {
      const contentType = response.headers.get('content-type') || 'audio/mp4'
      const contentLength = response.headers.get('content-length')
      res.setHeader('Content-Type', contentType)
      if (contentLength) res.setHeader('Content-Length', contentLength)

      // Stream the response body
      const reader = response.body.getReader()
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          res.write(Buffer.from(value))
        }
        res.end()
      } catch (err) {
        if (!res.headersSent) throw err
        res.end()
      }
      return
    }

    // Fallback: chunked 256KB downloads (for throttled URLs)
    const CHUNK_SIZE = 256 * 1024
    const maxSize = downloadSize || 100 * 1024 * 1024 // fallback cap: 100MB
    let offset = 0
    let headersSent = false

    while (offset < maxSize) {
      const end = Math.min(offset + CHUNK_SIZE - 1, maxSize - 1)
      const chunkRes = await fetch(url, {
        signal,
        headers: { 'User-Agent': ua, 'Range': `bytes=${offset}-${end}` }
      })

      if (chunkRes.status !== 206 && chunkRes.status !== 200) break

      const chunk = Buffer.from(await chunkRes.arrayBuffer())
      if (chunk.byteLength === 0) break

      if (!headersSent) {
        res.setHeader('Content-Type', chunkRes.headers.get('content-type') || 'audio/mp4')
        headersSent = true
      }

      res.write(chunk)
      offset += chunk.byteLength

      if (chunk.byteLength < CHUNK_SIZE) break
    }

    if (!headersSent) throw new Error('No data received')
    res.end()
    return
  }

  // Non-googlevideo URLs - stream directly
  const response = await fetch(url, {
    signal,
    headers: { 'User-Agent': ua }
  })
  if (!response.ok) throw new Error(`Upstream returned ${response.status}`)

  const contentType = response.headers.get('content-type') || 'audio/mp4'
  const contentLength = response.headers.get('content-length')
  res.setHeader('Content-Type', contentType)
  if (contentLength) res.setHeader('Content-Length', contentLength)

  const reader = response.body.getReader()
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      res.write(Buffer.from(value))
    }
    res.end()
  } catch (err) {
    if (!res.headersSent) throw err
    res.end()
  }
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', getCorsOrigin(req))
    res.setHeader('Access-Control-Allow-Methods', 'GET')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    return res.status(204).end()
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { url } = req.query

  if (!url) {
    return res.status(400).json({ error: 'Missing url parameter' })
  }

  if (!isAllowedUrl(url)) {
    return res.status(403).json({ error: 'URL not allowed' })
  }

  res.setHeader('Access-Control-Allow-Origin', getCorsOrigin(req))
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=7200')

  const controller = new AbortController()
  // 3 minutes — generous timeout for long songs
  const timeoutId = setTimeout(() => controller.abort(), 180000)

  try {
    await streamAudio(url, res, controller.signal)
    clearTimeout(timeoutId)
  } catch (error) {
    clearTimeout(timeoutId)
    if (!res.headersSent) {
      return res.status(502).json({ error: error.message || 'Failed to fetch audio' })
    }
    res.end()
  }
}
