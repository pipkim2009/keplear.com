/**
 * Vercel Serverless Function - Audio Proxy
 * Proxies audio data from YouTube to avoid CORS restrictions.
 * Uses ANDROID User-Agent for googlevideo.com URLs.
 */

const ANDROID_UA = 'com.google.android.youtube/19.02.39 (Linux; U; Android 14) gzip'
const BROWSER_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
const MAX_SIZE = 25 * 1024 * 1024 // 25MB - supports ~8-10min songs for stem separation

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
 * Download audio, using Range header and ANDROID UA for googlevideo.com.
 */
async function downloadAudio(url, signal) {
  const isGV = isGoogleVideoUrl(url)
  const ua = isGV ? ANDROID_UA : BROWSER_UA

  if (isGV) {
    // Parse actual file size from clen URL parameter - YouTube rejects oversized ranges
    const clen = parseInt(new URL(url).searchParams.get('clen') || '0') || 0
    const downloadSize = clen > 0 ? Math.min(clen, MAX_SIZE) : MAX_SIZE

    // Single Range request sized to actual file
    const response = await fetch(url, {
      signal,
      headers: { 'User-Agent': ua, 'Range': `bytes=0-${downloadSize - 1}` }
    })

    if (response.status === 200 || response.status === 206) {
      return Buffer.from(await response.arrayBuffer())
    }

    // Fallback: chunked 256KB downloads (for throttled URLs)
    const CHUNK_SIZE = 256 * 1024
    const chunks = []
    let offset = 0

    while (offset < downloadSize) {
      const end = Math.min(offset + CHUNK_SIZE - 1, downloadSize - 1)
      const chunkRes = await fetch(url, {
        signal,
        headers: { 'User-Agent': ua, 'Range': `bytes=${offset}-${end}` }
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
  const response = await fetch(url, {
    signal,
    headers: { 'User-Agent': ua }
  })
  if (!response.ok) throw new Error(`Upstream returned ${response.status}`)
  return Buffer.from(await response.arrayBuffer())
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
  const timeoutId = setTimeout(() => controller.abort(), 60000)

  try {
    const buffer = await downloadAudio(url, controller.signal)
    clearTimeout(timeoutId)
    res.setHeader('Content-Type', 'audio/mp4')
    res.send(buffer)
  } catch (error) {
    clearTimeout(timeoutId)
    return res.status(502).json({ error: error.message || 'Failed to fetch audio' })
  }
}
