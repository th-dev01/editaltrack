import {
  assertAllowedOrigin,
  authenticatedUserId,
  handleOptions,
  jsonResponse,
} from '../_shared/google-oauth.ts'
import { removeGoogleEvent, safeGoogleError } from '../_shared/calendar-sync.ts'

interface DeleteRequestBody {
  eventId?: unknown
}

Deno.serve(async (request: Request) => {
  const preflight = handleOptions(request)
  if (preflight) return preflight
  if (request.method !== 'POST') return jsonResponse(request, { error: 'method_not_allowed' }, 405)
  try {
    assertAllowedOrigin(request)
    const userId = await authenticatedUserId(request)
    const body = await request.json() as DeleteRequestBody
    if (typeof body.eventId !== 'string') return jsonResponse(request, { error: 'invalid_event_id' }, 400)
    await removeGoogleEvent(body.eventId, userId)
    return jsonResponse(request, { removed: true })
  } catch (error) {
    if (error instanceof Error && error.message === 'unauthorized') return jsonResponse(request, { error: 'unauthorized' }, 401)
    if (error instanceof Error && error.message === 'origin_not_allowed') return jsonResponse(request, { error: 'origin_not_allowed' }, 403)
    const safeError = safeGoogleError(error)
    return jsonResponse(request, { removed: false, errorCode: safeError.code, message: safeError.message })
  }
})
