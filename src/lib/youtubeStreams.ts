/**
 * YouTube audio stream extraction with multi-source fallback.
 *
 * 1. Primary: our own /api/piped-streams Edge Function
 * 2. Fallback: external CORS proxy (Cloudflare Worker) for client-side
 *    InnerTube calls from a different IP range
 */

import { apiUrl } from './api'

/** Configure fallback proxy URL — deploy the Cloudflare Worker from /workers/yt-proxy/ */
const EXTERNAL_PROXY_URL = import.meta.env.VITE_YT_PROXY_URL || ''

const IOS_CLIENT_VERSION = '21.02.3'
const IOS_USER_AGENT = `com.google.ios.youtube/${IOS_CLIENT_VERSION} (iPhone16,2; U; CPU iOS 18_3_2 like Mac OS X;)`

export interface AudioStream {
  url: string
  mimeType?: string
  bitrate?: number
  quality?: string
  contentLength?: number
}

interface StreamResult {
  audioStreams: AudioStream[]
  source: string
}

/**
 * Fetch audio streams for a YouTube video ID.
 * Tries the Vercel endpoint first, then the external proxy.
 */
export async function fetchAudioStreams(
  videoId: string,
  signal?: AbortSignal
): Promise<StreamResult | null> {
  // 1. Try our Vercel Edge Function
  try {
    const res = await fetch(apiUrl(`/api/piped-streams?videoId=${encodeURIComponent(videoId)}`), {
      signal,
    })
    if (res.ok) {
      const data = await res.json()
      if (data.audioStreams?.length > 0) return data
    }
  } catch {
    // Vercel endpoint failed, continue to fallback
  }

  // 2. Try external proxy (Cloudflare Worker or similar)
  if (EXTERNAL_PROXY_URL) {
    try {
      const data = await fetchViaExternalProxy(videoId, signal)
      if (data) return data
    } catch {
      // External proxy failed too
    }
  }

  // 3. Try direct InnerTube call (works if user's network isn't blocked)
  try {
    const data = await fetchViaDirectInnerTube(videoId, signal)
    if (data) return data
  } catch {
    // Direct call failed
  }

  return null
}

/**
 * Fetch via external CORS proxy (e.g. Cloudflare Worker).
 * The proxy forwards InnerTube requests from its own IP range.
 */
async function fetchViaExternalProxy(
  videoId: string,
  signal?: AbortSignal
): Promise<StreamResult | null> {
  const res = await fetch(`${EXTERNAL_PROXY_URL}?videoId=${encodeURIComponent(videoId)}`, {
    signal,
  })
  if (!res.ok) return null
  const data = await res.json()
  if (!data.audioStreams?.length) return null
  return data
}

/**
 * Direct InnerTube iOS client call from the browser.
 * This works when the user's IP isn't blocked by YouTube (residential IPs).
 * May fail due to CORS — YouTube doesn't set Access-Control-Allow-Origin
 * for third-party origins. Included as a last resort.
 */
async function fetchViaDirectInnerTube(
  videoId: string,
  signal?: AbortSignal
): Promise<StreamResult | null> {
  const res = await fetch(
    'https://www.youtube.com/youtubei/v1/player?prettyPrint=false&alt=json&key=AIzaSyB-63vPrdThhKuerbB2N_l7Kwwcxj6yUAc',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': IOS_USER_AGENT,
      },
      body: JSON.stringify({
        videoId,
        context: {
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
        },
      }),
      signal,
      mode: 'cors',
    }
  )

  if (!res.ok) return null
  const data = await res.json()

  if (data.playabilityStatus?.status !== 'OK') return null

  const audioStreams = (data.streamingData?.adaptiveFormats || [])
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

  if (audioStreams.length === 0) return null
  return { audioStreams, source: 'direct-innertube' }
}
