/**
 * Supabase Edge Function - Send Push Notifications via FCM
 *
 * Runs on Deno inside Supabase, with direct database access.
 * FCM handles both Android (native) and iOS (via APNs bridge).
 *
 * Invoke manually:
 *   curl -X POST https://<project>.supabase.co/functions/v1/send-push \
 *     -H "Authorization: Bearer <SUPABASE_ANON_KEY>" \
 *     -H "Content-Type: application/json" \
 *     -d '{"userId": "...", "title": "...", "body": "..."}'
 *
 * Or triggered automatically by database webhooks (see migration).
 *
 * Required Supabase secrets (set via `supabase secrets set`):
 *   FCM_PROJECT_ID      - Firebase project ID
 *   FCM_SERVICE_ACCOUNT  - Base64-encoded Firebase service account JSON
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * Get an OAuth2 access token for FCM using the service account.
 */
async function getFcmAccessToken(): Promise<string> {
  const serviceAccountB64 = Deno.env.get('FCM_SERVICE_ACCOUNT')
  if (!serviceAccountB64) throw new Error('FCM_SERVICE_ACCOUNT not configured')

  const serviceAccount = JSON.parse(atob(serviceAccountB64))

  // Create JWT for Google OAuth2
  const now = Math.floor(Date.now() / 1000)
  const header = { alg: 'RS256', typ: 'JWT' }
  const payload = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }

  const encode = (obj: unknown) =>
    btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

  const unsigned = `${encode(header)}.${encode(payload)}`

  // Import the private key and sign the JWT
  const pemContent = serviceAccount.private_key
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\n/g, '')

  const keyData = Uint8Array.from(atob(pemContent), c => c.charCodeAt(0))

  const key = await crypto.subtle.importKey(
    'pkcs8',
    keyData,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const signatureBuffer = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    new TextEncoder().encode(unsigned)
  )

  const signature = btoa(String.fromCharCode(...new Uint8Array(signatureBuffer)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')

  const jwt = `${unsigned}.${signature}`

  // Exchange JWT for access token
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  })

  if (!tokenRes.ok) {
    const err = await tokenRes.text()
    throw new Error(`Failed to get FCM token: ${err}`)
  }

  const { access_token } = await tokenRes.json()
  return access_token
}

interface SendResult {
  token: string
  success: boolean
  reason?: string
}

/**
 * Send a push notification to a single FCM token.
 */
async function sendToToken(
  accessToken: string,
  projectId: string,
  token: string,
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<SendResult> {
  const message: Record<string, unknown> = {
    message: {
      token,
      notification: { title, body },
      android: {
        notification: { sound: 'default', channel_id: 'keplear_default' },
      },
      apns: {
        payload: { aps: { sound: 'default', badge: 1 } },
      },
      ...(data ? { data } : {}),
    },
  }

  const res = await fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(message),
  })

  if (!res.ok) {
    const err = await res.text()
    if (res.status === 404 || err.includes('UNREGISTERED')) {
      return { token, success: false, reason: 'unregistered' }
    }
    return { token, success: false, reason: err }
  }

  return { token, success: true }
}

serve(async req => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { userId, title, body, data, record } = await req.json()

    // Support being called by a database webhook (passes `record`)
    const notifTitle = title || record?.title || 'Keplear'
    const notifBody = body || record?.body || 'You have a new notification'
    const targetUserId = userId || record?.user_id

    if (!notifTitle || !notifBody) {
      return new Response(JSON.stringify({ error: 'Missing title or body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const projectId = Deno.env.get('FCM_PROJECT_ID')
    if (!projectId) {
      return new Response(JSON.stringify({ error: 'FCM_PROJECT_ID not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Create Supabase client with service role (bypasses RLS)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Fetch push tokens
    let query = supabase.from('push_tokens').select('token, user_id')
    if (targetUserId) {
      query = query.eq('user_id', targetUserId)
    }

    const { data: tokens, error: dbError } = await query
    if (dbError) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch tokens', detail: dbError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!tokens || tokens.length === 0) {
      return new Response(JSON.stringify({ sent: 0, message: 'No push tokens found' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Get FCM access token
    const accessToken = await getFcmAccessToken()

    // Convert data values to strings (FCM requirement)
    const stringData = data
      ? Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)]))
      : undefined

    // Send to all tokens
    const results = await Promise.allSettled(
      tokens.map((t: { token: string }) =>
        sendToToken(accessToken, projectId, t.token, notifTitle, notifBody, stringData)
      )
    )

    // Clean up unregistered tokens
    const unregistered = results
      .filter(
        (r): r is PromiseFulfilledResult<SendResult> =>
          r.status === 'fulfilled' && r.value.reason === 'unregistered'
      )
      .map(r => r.value.token)

    if (unregistered.length > 0) {
      await supabase.from('push_tokens').delete().in('token', unregistered)
    }

    const sent = results.filter(
      (r): r is PromiseFulfilledResult<SendResult> => r.status === 'fulfilled' && r.value.success
    ).length

    return new Response(
      JSON.stringify({ sent, total: tokens.length, cleaned: unregistered.length }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to send push notifications' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
