/**
 * Vercel Serverless Function - YouTube Audio Streams
 * Extracts audio stream URLs from YouTube videos.
 *
 * Stream extraction priority:
 * 1. YouTube IOS client (with visitor data, direct URLs)
 * 2. youtube-info-streams library (throttled)
 * 3. Piped API instances (frequently down)
 */

import { info as ytInfo } from 'youtube-info-streams'

const IOS_CLIENT_VERSION = '21.02.3'
const IOS_USER_AGENT = `com.google.ios.youtube/${IOS_CLIENT_VERSION} (iPhone16,2; U; CPU iOS 18_3_2 like Mac OS X;)`

const PIPED_INSTANCES = [
  'https://pipedapi.kavin.rocks',
  'https://api.piped.private.coffee',
  'https://pipedapi.adminforge.de',
  'https://pipedapi.leptons.xyz',
  'https://piped-api.privacy.com.de',
  'https://pipedapi.r4fo.com',
]

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

function extractAudioStreams(adaptiveFormats) {
  return adaptiveFormats
    .filter(f => f.mimeType?.startsWith('audio/') && f.url)
    .map(f => ({
      url: f.url,
      mimeType: f.mimeType,
      bitrate: f.bitrate || 0,
      quality: f.audioQuality || 'unknown',
      contentLength: parseInt(f.contentLength || '0') || 0
    }))
}

/**
 * Fetch visitor data from YouTube. Required for iOS client requests.
 * Extracts visitorData from the YouTube homepage's embedded config.
 */
async function fetchVisitorData() {
  const response = await fetch('https://www.youtube.com/sw.js_data', {
    headers: { 'User-Agent': 'Mozilla/5.0' }
  })
  if (response.ok) {
    const text = await response.text()
    const match = text.match(/"visitorData"\s*:\s*"([^"]+)"/)
    if (match) return match[1]
  }

  // Fallback: extract from YouTube homepage
  const pageRes = await fetch('https://www.youtube.com/', {
    headers: { 'User-Agent': 'Mozilla/5.0', 'Accept-Language': 'en' }
  })
  if (pageRes.ok) {
    const html = await pageRes.text()
    const vdMatch = html.match(/visitorData"\s*:\s*"([^"]+)"/)
    if (vdMatch) return vdMatch[1]
  }

  return null
}

/**
 * iOS client — doesn't require PO tokens for stream downloads.
 * Requires valid visitorData from YouTube.
 */
async function tryIOSClient(videoId) {
  const visitorData = await fetchVisitorData()

  const headers = {
    'Content-Type': 'application/json',
    'User-Agent': IOS_USER_AGENT,
    'X-YouTube-Client-Name': '5',
    'X-YouTube-Client-Version': IOS_CLIENT_VERSION,
  }
  if (visitorData) {
    headers['X-Goog-Visitor-Id'] = visitorData
  }

  const context = {
    client: {
      clientName: 'IOS',
      clientVersion: IOS_CLIENT_VERSION,
      deviceMake: 'Apple',
      deviceModel: 'iPhone16,2',
      osName: 'iPhone',
      osVersion: '18.3.2.22D82',
      hl: 'en',
      gl: 'US',
    }
  }
  if (visitorData) {
    context.client.visitorData = visitorData
  }

  const response = await fetch('https://www.youtube.com/youtubei/v1/player?prettyPrint=false&alt=json', {
    method: 'POST',
    headers,
    body: JSON.stringify({ videoId, context })
  })

  if (!response.ok) throw new Error(`iOS API HTTP ${response.status}`)
  const data = await response.json()

  if (data.playabilityStatus?.status !== 'OK') {
    throw new Error(`iOS: ${data.playabilityStatus?.reason || data.playabilityStatus?.status}`)
  }

  const audioStreams = extractAudioStreams(data.streamingData?.adaptiveFormats || [])
  if (audioStreams.length === 0) throw new Error('iOS: No audio streams with URLs')
  return { audioStreams, source: 'ios' }
}

async function tryYoutubeInfoStreams(videoId) {
  const data = await ytInfo(videoId)
  const formats = data.formats || []
  const audioStreams = formats
    .filter(f => f.mimeType && f.mimeType.startsWith('audio/'))
    .map(f => {
      let contentLength = f.contentLength || 0
      if (!contentLength && f.url) {
        try {
          const clen = new URL(f.url).searchParams.get('clen')
          if (clen) contentLength = parseInt(clen) || 0
        } catch { /* ignore */ }
      }
      return {
        url: f.url,
        mimeType: f.mimeType,
        bitrate: f.bitrate || 0,
        quality: f.audioQuality || 'unknown',
        contentLength
      }
    })

  if (audioStreams.length === 0) throw new Error('No audio streams found')
  return { audioStreams, source: 'youtube-info-streams' }
}

async function tryPipedInstance(instance, videoId, signal) {
  const url = `${instance}/streams/${encodeURIComponent(videoId)}`
  const response = await fetch(url, {
    signal,
    headers: { 'Accept': 'application/json' }
  })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  const data = await response.json()
  if (!data.audioStreams?.length) throw new Error('No audio streams')
  return data
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

  const { videoId } = req.query

  if (!videoId) {
    return res.status(400).json({ error: 'Missing videoId parameter' })
  }

  res.setHeader('Access-Control-Allow-Origin', getCorsOrigin(req))
  res.setHeader('Access-Control-Allow-Methods', 'GET')
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=7200')

  const errors = []

  // 1. iOS client (primary)
  try {
    const data = await tryIOSClient(videoId)
    return res.status(200).json(data)
  } catch (error) {
    errors.push(`ios: ${error.message}`)
  }

  // 2. youtube-info-streams (throttled URLs)
  try {
    const data = await tryYoutubeInfoStreams(videoId)
    return res.status(200).json(data)
  } catch (error) {
    errors.push(`youtube-info-streams: ${error.message}`)
  }

  // 3. Piped instances
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 15000)

  try {
    for (const instance of PIPED_INSTANCES) {
      try {
        const data = await tryPipedInstance(instance, videoId, controller.signal)
        clearTimeout(timeoutId)
        return res.status(200).json(data)
      } catch (error) {
        errors.push(`piped(${instance}): ${error.message}`)
      }
    }
  } finally {
    clearTimeout(timeoutId)
  }

  console.error(`All stream sources failed for ${videoId}:`, errors.join('; '))
  return res.status(503).json({
    error: 'All sources are currently unavailable',
    details: errors,
    audioStreams: []
  })
}
