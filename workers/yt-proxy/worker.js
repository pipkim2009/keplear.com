/**
 * Cloudflare Worker — YouTube InnerTube Proxy
 *
 * Proxies iOS InnerTube API calls to YouTube from Cloudflare's IP range.
 * Deploy with: npx wrangler deploy
 *
 * Set VITE_YT_PROXY_URL in your .env to the deployed worker URL.
 *
 * Free tier: 100,000 requests/day
 */

const IOS_CLIENT_VERSION = '21.02.3'
const IOS_USER_AGENT = `com.google.ios.youtube/${IOS_CLIENT_VERSION} (iPhone16,2; U; CPU iOS 18_3_2 like Mac OS X;)`

const ALLOWED_ORIGINS = [
  'https://keplear.com',
  'https://www.keplear.com',
  'http://localhost:5173',
  'http://localhost',
]

function getCorsOrigin(request) {
  const origin = request.headers.get('origin') || ''
  return ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
}

function corsHeaders(request) {
  return {
    'Access-Control-Allow-Origin': getCorsOrigin(request),
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  }
}

async function fetchVisitorData() {
  try {
    const res = await fetch('https://www.youtube.com/sw.js_data', {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    })
    if (res.ok) {
      const text = await res.text()
      const match = text.match(/"visitorData"\s*:\s*"([^"]+)"/)
      if (match) return match[1]
    }
  } catch {}
  try {
    const res = await fetch('https://www.youtube.com/', {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept-Language': 'en' },
    })
    if (res.ok) {
      const html = await res.text()
      const match = html.match(/visitorData"\s*:\s*"([^"]+)"/)
      if (match) return match[1]
    }
  } catch {}
  return null
}

export default {
  async fetch(request) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(request) })
    }

    const url = new URL(request.url)
    const videoId = url.searchParams.get('videoId')

    if (!videoId) {
      return new Response(JSON.stringify({ error: 'Missing videoId' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders(request) },
      })
    }

    const visitorData = await fetchVisitorData()

    const headers = {
      'Content-Type': 'application/json',
      'User-Agent': IOS_USER_AGENT,
      'X-YouTube-Client-Name': '5',
      'X-YouTube-Client-Version': IOS_CLIENT_VERSION,
    }
    if (visitorData) headers['X-Goog-Visitor-Id'] = visitorData

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
      },
    }
    if (visitorData) context.client.visitorData = visitorData

    const apiKey = 'AIzaSyB-63vPrdThhKuerbB2N_l7Kwwcxj6yUAc'
    const ytRes = await fetch(
      `https://www.youtube.com/youtubei/v1/player?key=${apiKey}&prettyPrint=false&alt=json`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({ videoId, context }),
      }
    )

    const data = await ytRes.json()

    if (data.playabilityStatus?.status !== 'OK') {
      return new Response(
        JSON.stringify({
          error: data.playabilityStatus?.reason || 'Playback failed',
          audioStreams: [],
        }),
        {
          status: 503,
          headers: { 'Content-Type': 'application/json', ...corsHeaders(request) },
        }
      )
    }

    const audioStreams = (data.streamingData?.adaptiveFormats || [])
      .filter((f) => f.mimeType?.startsWith('audio/') && f.url)
      .map((f) => ({
        url: f.url,
        mimeType: f.mimeType,
        bitrate: f.bitrate || 0,
        quality: f.audioQuality || 'unknown',
        contentLength: parseInt(f.contentLength || '0') || 0,
      }))

    if (audioStreams.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No audio streams', audioStreams: [] }),
        {
          status: 503,
          headers: { 'Content-Type': 'application/json', ...corsHeaders(request) },
        }
      )
    }

    return new Response(
      JSON.stringify({ audioStreams, source: 'cloudflare-worker' }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 's-maxage=3600, stale-while-revalidate=7200',
          ...corsHeaders(request),
        },
      }
    )
  },
}
