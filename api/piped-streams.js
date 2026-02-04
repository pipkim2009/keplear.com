/**
 * Vercel Serverless Function - Piped Streams API Proxy
 * Proxies YouTube stream info requests through Piped/Invidious instances to avoid CORS
 */

// Piped instances - ordered by reliability
const PIPED_INSTANCES = [
  'https://pipedapi.kavin.rocks',        // Official instance
  'https://api.piped.private.coffee',    // 99.89% uptime
  'https://pipedapi.adminforge.de',      // Germany
  'https://piped-api.garudalinux.org',   // Garuda Linux
  'https://pipedapi.r4fo.com',           // R4FO
  'https://pipedapi.darkness.services',  // Darkness services
  'https://pipedapi.simpleprivacy.fr'    // Simple Privacy
]

// Invidious fallback instances
const INVIDIOUS_INSTANCES = [
  'https://inv.nadeko.net',
  'https://invidious.fdn.fr',
  'https://invidious.nerdvpn.de'
]

async function tryPipedInstance(instance, videoId, controller) {
  const url = `${instance}/streams/${encodeURIComponent(videoId)}`

  const response = await fetch(url, {
    signal: controller.signal,
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }

  const contentType = response.headers.get('content-type')
  if (!contentType || !contentType.includes('application/json')) {
    throw new Error('Non-JSON response')
  }

  const data = await response.json()

  // Validate response has audio streams
  if (!data.audioStreams || !Array.isArray(data.audioStreams) || data.audioStreams.length === 0) {
    throw new Error('No audio streams in response')
  }

  return data
}

async function tryInvidiousInstance(instance, videoId, controller) {
  const url = `${instance}/api/v1/videos/${encodeURIComponent(videoId)}`

  const response = await fetch(url, {
    signal: controller.signal,
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }

  const contentType = response.headers.get('content-type')
  if (!contentType || !contentType.includes('application/json')) {
    throw new Error('Non-JSON response')
  }

  const data = await response.json()

  // Convert Invidious format to Piped format for consistency
  if (!data.adaptiveFormats || !Array.isArray(data.adaptiveFormats)) {
    throw new Error('No adaptive formats in response')
  }

  // Extract audio streams from Invidious format
  const audioStreams = data.adaptiveFormats
    .filter(f => f.type && f.type.startsWith('audio/'))
    .map(f => ({
      url: f.url,
      mimeType: f.type,
      bitrate: f.bitrate || 0,
      quality: f.audioQuality || 'unknown'
    }))

  if (audioStreams.length === 0) {
    throw new Error('No audio streams found')
  }

  return {
    audioStreams,
    title: data.title,
    duration: data.lengthSeconds
  }
}

export default async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { videoId } = req.query

  if (!videoId) {
    return res.status(400).json({ error: 'Missing videoId parameter' })
  }

  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET')
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=7200')

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 15000)

  try {
    // Try Piped instances first
    for (const instance of PIPED_INSTANCES) {
      try {
        const data = await tryPipedInstance(instance, videoId, controller)
        clearTimeout(timeoutId)
        return res.status(200).json(data)
      } catch (error) {
        console.warn(`Piped instance ${instance} failed:`, error.message)
      }
    }

    // Fall back to Invidious instances
    for (const instance of INVIDIOUS_INSTANCES) {
      try {
        const data = await tryInvidiousInstance(instance, videoId, controller)
        clearTimeout(timeoutId)
        return res.status(200).json(data)
      } catch (error) {
        console.warn(`Invidious instance ${instance} failed:`, error.message)
      }
    }

    clearTimeout(timeoutId)

    // All instances failed
    return res.status(503).json({
      error: 'All API instances are currently unavailable',
      audioStreams: []
    })
  } catch (error) {
    clearTimeout(timeoutId)
    return res.status(500).json({
      error: error.message || 'Internal server error',
      audioStreams: []
    })
  }
}
