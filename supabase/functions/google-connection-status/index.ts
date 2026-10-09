import {
  GoogleAuthorizationError,
  assertAllowedOrigin,
  authenticatedUserId,
  getValidGoogleAccessToken,
  handleOptions,
  jsonResponse,
  serviceRequest,
} from '../_shared/google-oauth.ts'

interface PublicConnection {
  google_email: string | null
  connected_at: string
  scopes: string[]
}

Deno.serve(async (request: Request) => {
  const preflight = handleOptions(request)
  if (preflight) return preflight
  if (request.method !== 'POST') return jsonResponse(request, { error: 'method_not_allowed' }, 405)
  try {
    assertAllowedOrigin(request)
    const userId = await authenticatedUserId(request)
    const query = new URLSearchParams({
      select: 'google_email,connected_at,scopes',
      user_id: `eq.${userId}`,
      limit: '1',
    })
    const rows = await serviceRequest<PublicConnection[]>(`google_calendar_connections?${query}`)
    const connection = rows?.[0]
    if (!connection) return jsonResponse(request, { connected: false, email: null, connectedAt: null, scopes: [], reauthRequired: false })

    let reauthRequired = false
    try {
      // Verifica o refresh também quando o access token ainda não expirou, para detectar revogações.
      await getValidGoogleAccessToken(userId, true)
    } catch (error) {
      if (error instanceof GoogleAuthorizationError) reauthRequired = true
      else throw error
    }

    return jsonResponse(request, {
      connected: true,
      email: connection.google_email,
      connectedAt: connection.connected_at,
      scopes: connection.scopes,
      reauthRequired,
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'unauthorized') return jsonResponse(request, { error: 'unauthorized' }, 401)
    if (error instanceof Error && error.message === 'origin_not_allowed') return jsonResponse(request, { error: 'origin_not_allowed' }, 403)
    console.error('google-connection-status failed')
    return jsonResponse(request, { error: 'status_unavailable' }, 500)
  }
})
