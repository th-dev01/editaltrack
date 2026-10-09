import {
  assertAllowedOrigin,
  authenticatedUserId,
  corsHeaders,
  getOAuthConfig,
  handleOptions,
  jsonResponse,
  randomState,
  serviceRequest,
  sha256Hex,
} from '../_shared/google-oauth.ts'

Deno.serve(async (request: Request) => {
  const preflight = handleOptions(request)
  if (preflight) return preflight
  if (request.method !== 'POST') return jsonResponse(request, { error: 'method_not_allowed' }, 405)

  try {
    assertAllowedOrigin(request)
    const userId = await authenticatedUserId(request)
    const config = getOAuthConfig()
    const state = randomState()
    const stateHash = await sha256Hex(state)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()
    const parameters = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      response_type: 'code',
      scope: 'openid email https://www.googleapis.com/auth/calendar.events',
      access_type: 'offline',
      // Ensure Google returns a refresh token even if this account authorized the client in an earlier failed attempt.
      prompt: 'consent',
      include_granted_scopes: 'true',
      state,
    })

    await serviceRequest('google_oauth_states', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ user_id: userId, state_hash: stateHash, expires_at: expiresAt }),
    })

    // Remove tentativas antigas; o state atual permanece válido por dez minutos.
    const cleanup = new URLSearchParams({ expires_at: `lt.${new Date().toISOString()}` })
    await serviceRequest(`google_oauth_states?${cleanup}`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } })

    const authorizationUrl = `https://accounts.google.com/o/oauth2/v2/auth?${parameters}`
    return new Response(JSON.stringify({ authorizationUrl }), { headers: corsHeaders(request) })
  } catch (error) {
    if (error instanceof Error && error.message === 'origin_not_allowed') {
      return jsonResponse(request, { error: 'origin_not_allowed' }, 403)
    }
    if (error instanceof Error && error.message === 'unauthorized') {
      return jsonResponse(request, { error: 'unauthorized' }, 401)
    }
    console.error('google-oauth-start failed')
    return jsonResponse(request, { error: 'oauth_start_failed' }, 500)
  }
})
