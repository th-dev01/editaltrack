import {
  assertAllowedOrigin,
  authenticatedUserId,
  handleOptions,
  jsonResponse,
  serviceRequest,
} from '../_shared/google-oauth.ts'

interface MarkPendingBody {
  eventId?: unknown
}

Deno.serve(async (request: Request) => {
  const preflight = handleOptions(request)
  if (preflight) return preflight
  if (request.method !== 'POST') return jsonResponse(request, { error: 'method_not_allowed' }, 405)
  try {
    assertAllowedOrigin(request)
    const userId = await authenticatedUserId(request)
    const body = await request.json() as MarkPendingBody
    if (typeof body.eventId !== 'string') return jsonResponse(request, { error: 'invalid_event_id' }, 400)
    const query = new URLSearchParams({ select: 'id,google_event_id', id: `eq.${body.eventId}`, user_id: `eq.${userId}`, limit: '1' })
    const events = await serviceRequest<Array<{ id: string; google_event_id: string | null }>>(`eventos_edital?${query}`)
    const event = events?.[0]
    if (!event) return jsonResponse(request, { error: 'event_not_found' }, 404)
    if (event.google_event_id) {
      const update = new URLSearchParams({ id: `eq.${event.id}`, user_id: `eq.${userId}` })
      await serviceRequest(`eventos_edital?${update}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({
          google_sync_status: 'error',
          google_sync_error: 'Alterações ainda não sincronizadas com o Google Calendar.',
        }),
      })
    }
    return jsonResponse(request, { marked: true })
  } catch (error) {
    if (error instanceof Error && error.message === 'unauthorized') return jsonResponse(request, { error: 'unauthorized' }, 401)
    if (error instanceof Error && error.message === 'origin_not_allowed') return jsonResponse(request, { error: 'origin_not_allowed' }, 403)
    console.error('google-calendar-mark-pending failed')
    return jsonResponse(request, { error: 'mark_pending_failed' }, 500)
  }
})
