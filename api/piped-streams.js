/**
 * Vercel Edge Function - YouTube Audio Streams
 * Runs on Cloudflare's edge network (different IPs than serverless).
 *
 * Stream extraction priority:
 * 1. YouTube IOS client (with visitor data, direct URLs)
 * 2. Piped API instances (frequently down)
 */

export const config = { runtime: 'edge' }

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

function getCorsOrigin(request) {
  const origin = request.headers.get('origin') || request.headers.get('referer') || ''
  return ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
}

function corsHeaders(request) {
  return {
    'Access-Control-Allow-Origin': getCorsOrigin(request),
    'Access-Control-Allow-Methods': 'GET',
    'Access-Control-Allow-Headers': 'Content-Type',
  }
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
 */
async function fetchVisitorData() {
  try {
    const response = await fetch('https://www.youtube.com/sw.js_data', {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    })
    if (response.ok) {
      const text = await response.text()
      const match = text.match(/"visitorData"\s*:\s*"([^"]+)"/)
      if (match) return match[1]
    }
  } catch { /* ignore */ }

  try {
    const pageRes = await fetch('https://www.youtube.com/', {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept-Language': 'en' }
    })
    if (pageRes.ok) {
      const html = await pageRes.text()
      const vdMatch = html.match(/visitorData"\s*:\s*"([^"]+)"/)
      if (vdMatch) return vdMatch[1]
    }
  } catch { /* ignore */ }

  return null
}

/**
 * iOS client — doesn't require PO tokens for stream downloads.
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

  const apiKey = 'AIzaSyB-63vPrdThhKuerbB2N_l7Kwwcxj6yUAc'
  const response = await fetch(`https://www.youtube.com/youtubei/v1/player?key=${apiKey}&prettyPrint=false&alt=json`, {
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

export default async function handler(request) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(request) })
  }

  if (request.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', ...corsHeaders(request) }
    })
  }

  const url = new URL(request.url)
  const videoId = url.searchParams.get('videoId')

  if (!videoId) {
    return new Response(JSON.stringify({ error: 'Missing videoId parameter' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders(request) }
    })
  }

  const responseHeaders = {
    'Content-Type': 'application/json',
    'Cache-Control': 's-maxage=3600, stale-while-revalidate=7200',
    ...corsHeaders(request)
  }

  const errors = []

  // 1. iOS client (primary)
  try {
    const data = await tryIOSClient(videoId)
    return new Response(JSON.stringify(data), { status: 200, headers: responseHeaders })
  } catch (error) {
    errors.push(`ios: ${error.message}`)
  }

  // 2. Piped instances
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 15000)

  try {
    for (const instance of PIPED_INSTANCES) {
      try {
        const data = await tryPipedInstance(instance, videoId, controller.signal)
        clearTimeout(timeoutId)
        return new Response(JSON.stringify(data), { status: 200, headers: responseHeaders })
      } catch (error) {
        errors.push(`piped(${instance}): ${error.message}`)
      }
    }
  } finally {
    clearTimeout(timeoutId)
  }

  console.error(`All stream sources failed for ${videoId}:`, errors.join('; '))
  return new Response(JSON.stringify({
    error: 'All sources are currently unavailable',
    details: errors,
    audioStreams: []
  }), { status: 503, headers: responseHeaders })
}
