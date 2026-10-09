import {
  assertAllowedOrigin,
  authenticatedUserId,
  decryptToken,
  handleOptions,
  jsonResponse,
  serviceRequest,
} from '../_shared/google-oauth.ts'

interface RevocationRow {
  refresh_token_encrypted: string
}

Deno.serve(async (request: Request) => {
  const preflight = handleOptions(request)
  if (preflight) return preflight
  if (request.method !== 'POST') return jsonResponse(request, { error: 'method_not_allowed' }, 405)
  try {
    assertAllowedOrigin(request)
    const userId = await authenticatedUserId(request)
    const query = new URLSearchParams({ select: 'refresh_token_encrypted', user_id: `eq.${userId}`, limit: '1' })
    const rows = await serviceRequest<RevocationRow[]>(`google_calendar_connections?${query}`)
    const connection = rows?.[0]
    if (connection) {
      try {
        const refreshToken = await decryptToken(connection.refresh_token_encrypted)
        const form = new URLSearchParams({ token: refreshToken })
        const response = await fetch('https://oauth2.googleapis.com/revoke', {
          method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: form,
        })
        if (!response.ok) console.warn('Google token revocation request was not accepted')
      } catch {
        console.warn('Google token revocation could not be completed; removing local connection')
      }
    }
    const deleteFilter = new URLSearchParams({ user_id: `eq.${userId}` })
    await serviceRequest(`google_calendar_connections?${deleteFilter}`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } })
    return jsonResponse(request, { disconnected: true })
  } catch (error) {
    if (error instanceof Error && error.message === 'unauthorized') return jsonResponse(request, { error: 'unauthorized' }, 401)
    if (error instanceof Error && error.message === 'origin_not_allowed') return jsonResponse(request, { error: 'origin_not_allowed' }, 403)
    console.error('google-disconnect failed')
    return jsonResponse(request, { error: 'disconnect_failed' }, 500)
  }
})
