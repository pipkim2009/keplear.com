/**
 * Vercel Serverless Function - Piped API Proxy
 * Proxies YouTube search requests through Piped instances to avoid CORS in production
 */

const PIPED_INSTANCES = [
  'https://api.piped.private.coffee',  // Most reliable - 99.89% uptime
  'https://pipedapi.kavin.rocks',       // Official instance
  'https://pipedapi.adminforge.de',     // Germany
  'https://watchapi.whatever.social'    // Community
]

const ALLOWED_ORIGINS = [
  'https://keplear.com',
  'https://www.keplear.com',
  'http://localhost:5173'
]

function getCorsOrigin(req) {
  const origin = req.headers.origin || req.headers.referer || ''
  return ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
}

export default async function handler(req, res) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', getCorsOrigin(req))
    res.setHeader('Access-Control-Allow-Methods', 'GET')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    return res.status(204).end()
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { q, filter = 'videos' } = req.query

  if (!q) {
    return res.status(400).json({ error: 'Missing search query parameter "q"' })
  }

  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', getCorsOrigin(req))
  res.setHeader('Access-Control-Allow-Methods', 'GET')
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600')

  // Try each instance until one works
  for (const instance of PIPED_INSTANCES) {
    try {
      const url = `${instance}/search?q=${encodeURIComponent(q)}&filter=${encodeURIComponent(filter)}`

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 12000)

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Keplear/1.0'
        }
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        console.warn(`Piped instance ${instance} returned ${response.status}`)
        continue
      }

      // Verify JSON response
      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        console.warn(`Piped instance ${instance} returned non-JSON response`)
        continue
      }

      const data = await response.json()

      // Validate response has expected structure
      if (!data.items && !Array.isArray(data)) {
        console.warn(`Piped instance ${instance} returned unexpected format`)
        continue
      }

      return res.status(200).json(data)
    } catch (error) {
      console.warn(`Piped instance ${instance} failed:`, error.message)
      // Continue to next instance
    }
  }

  // All instances failed
  return res.status(503).json({
    error: 'All Piped instances are currently unavailable. Please try again later.',
    items: []
  })
}
