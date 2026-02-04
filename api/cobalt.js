/**
 * Vercel Serverless Function - Cobalt API Proxy
 * Proxies requests to Cobalt API to bypass CORS restrictions
 * Returns direct audio URL for waveform analysis
 */

const COBALT_INSTANCES = [
  'https://cobalt-api.meowing.de',  // 96% reliability
  'https://capi.3kh0.net'           // 72% reliability (backup)
]

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

  const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`

  // Try each Cobalt instance
  for (const instance of COBALT_INSTANCES) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 15000)

      const response = await fetch(instance, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        body: JSON.stringify({
          url: youtubeUrl,
          downloadMode: 'audio',
          audioFormat: 'mp3',
          audioBitrate: '64'  // Lowest quality = fastest download for waveform
        })
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        console.warn(`Cobalt instance ${instance} returned ${response.status}`)
        continue
      }

      const data = await response.json()

      // Cobalt returns { status: "tunnel"|"redirect", url: "..." }
      if (data.url) {
        return res.status(200).json({
          url: data.url,
          status: data.status
        })
      }

      // Handle picker response (multiple options)
      if (data.picker && data.picker.length > 0) {
        // Find audio option
        const audioOption = data.picker.find(p => p.type === 'audio') || data.picker[0]
        if (audioOption?.url) {
          return res.status(200).json({
            url: audioOption.url,
            status: 'picker'
          })
        }
      }

      console.warn(`Cobalt instance ${instance} returned no URL`)
    } catch (error) {
      console.warn(`Cobalt instance ${instance} failed:`, error.message)
    }
  }

  // All instances failed
  return res.status(503).json({
    error: 'All Cobalt instances are currently unavailable',
    url: null
  })
}
