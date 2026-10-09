import {
  encryptToken,
  frontendRedirect,
  getOAuthConfig,
  serviceRequest,
  sha256Hex,
} from '../_shared/google-oauth.ts'
import type { StoredGoogleConnection } from '../_shared/google-oauth.ts'

interface TokenResponse {
  access_token?: string
  refresh_token?: string
  expires_in?: number
  scope?: string
}

interface GoogleUserInfo {
  sub?: string
  email?: string
  email_verified?: boolean
}

function redirectWithError(appUrl: string, reason: string): Response {
  const redirect = new URL('/configuracoes', appUrl)
  redirect.searchParams.set('google', 'error')
  redirect.searchParams.set('google_error', reason)
  return Response.redirect(redirect, 302)
}

function safeGoogleTokenError(value: unknown): string {
  const knownErrors = new Set([
    'invalid_client', 'invalid_grant', 'unauthorized_client', 'invalid_request', 'unsupported_grant_type',
  ])
  return typeof value === 'string' && knownErrors.has(value) ? value : 'token_exchange_failed'
}

Deno.serve(async (request: Request) => {
  let appUrl: string
  try {
    appUrl = new URL(Deno.env.get('APP_URL') ?? '').origin
  } catch {
    console.error('google-oauth-callback is missing a valid APP_URL')
    return new Response('OAuth callback unavailable', { status: 500 })
  }

  const callback = new URL(request.url)
  const state = callback.searchParams.get('state')
  if (!state) return redirectWithError(appUrl, 'missing_state')

  let stage = 'load_config'
  try {
    const config = getOAuthConfig()
    stage = 'consume_state'
    const userId = await serviceRequest<string>(
      'rpc/consume_google_oauth_state',
      { method: 'POST', body: JSON.stringify({ p_state_hash: await sha256Hex(state) }) },
    )
    if (!userId) return redirectWithError(appUrl, 'invalid_state')
    if (callback.searchParams.get('error') === 'access_denied') {
      return frontendRedirect(appUrl, 'cancelled')
    }

    const code = callback.searchParams.get('code')
    if (!code) return redirectWithError(appUrl, 'missing_authorization_code')

    stage = 'exchange_code'
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: config.clientId,
        client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET') ?? '',
        redirect_uri: config.redirectUri,
        grant_type: 'authorization_code',
      }),
    })
    if (!tokenResponse.ok) {
      const tokenError = await tokenResponse.json().catch(() => ({})) as { error?: unknown }
      const reason = safeGoogleTokenError(tokenError.error)
      console.error('google-oauth-callback token exchange rejected', { reason, status: tokenResponse.status })
      return redirectWithError(appUrl, reason)
    }
    const tokens = await tokenResponse.json() as TokenResponse
    if (!tokens.access_token) return redirectWithError(appUrl, 'missing_access_token')

    stage = 'fetch_profile'
    const profileResponse = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    })
    if (!profileResponse.ok) return redirectWithError(appUrl, 'userinfo_failed')
    const profile = await profileResponse.json() as GoogleUserInfo
    if (!profile.sub || !profile.email || profile.email_verified === false) {
      return redirectWithError(appUrl, 'profile_incomplete')
    }

    stage = 'load_existing_connection'
    const userFilter = new URLSearchParams({
      select: 'user_id,google_user_id,refresh_token_encrypted,connected_at',
      user_id: `eq.${userId}`,
    })
    const existingRows = await serviceRequest<StoredGoogleConnection[]>(`google_calendar_connections?${userFilter}`)
    const existing = existingRows?.[0]
    const refreshToken = tokens.refresh_token
    if (!refreshToken && (!existing?.refresh_token_encrypted || existing.google_user_id !== profile.sub)) {
      return redirectWithError(appUrl, 'missing_refresh_token')
    }

    const requestedScopes = tokens.scope?.split(' ').filter(Boolean) ?? [
      'openid', 'email', 'https://www.googleapis.com/auth/calendar.events',
    ]
    stage = 'encrypt_tokens'
    const stored: Omit<StoredGoogleConnection, 'id' | 'updated_at'> = {
      user_id: userId,
      google_email: profile.email,
      google_user_id: profile.sub,
      refresh_token_encrypted: refreshToken ? await encryptToken(refreshToken) : existing!.refresh_token_encrypted,
      access_token_encrypted: await encryptToken(tokens.access_token),
      expires_at: typeof tokens.expires_in === 'number'
        ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
        : null,
      scopes: requestedScopes,
      connected_at: existing?.connected_at ?? new Date().toISOString(),
    }
    const conflict = new URLSearchParams({ on_conflict: 'user_id' })
    stage = 'store_connection'
    await serviceRequest(`google_calendar_connections?${conflict}`, {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify(stored),
    })
    return frontendRedirect(appUrl, 'connected')
  } catch (error) {
    // Nunca incluir code, access/refresh token ou secrets em logs ou no redirect.
    const safeCode = error instanceof Error && /^database_\d{3}$/.test(error.message)
      ? error.message
      : error instanceof Error && ['missing_TOKEN_ENCRYPTION_KEY', 'invalid_TOKEN_ENCRYPTION_KEY'].includes(error.message)
        ? 'token_encryption_config'
        : stage === 'encrypt_tokens'
          ? 'token_encryption_failed'
          : stage === 'load_existing_connection'
            ? 'connection_lookup_failed'
            : error instanceof TypeError && stage === 'fetch_profile'
              ? 'profile_network_failed'
              : 'internal_error'
    console.error('google-oauth-callback failed', { stage, code: safeCode })
    return redirectWithError(appUrl, safeCode)
  }
})
