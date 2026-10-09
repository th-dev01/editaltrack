import {
  assertAllowedOrigin,
  authenticatedUserId,
  handleOptions,
  jsonResponse,
} from '../_shared/google-oauth.ts'
import { syncEvents } from '../_shared/calendar-sync.ts'

interface SyncRequestBody {
  eventIds?: unknown
}

Deno.serve(async (request: Request) => {
  const preflight = handleOptions(request)
  if (preflight) return preflight
  if (request.method !== 'POST') return jsonResponse(request, { error: 'method_not_allowed' }, 405)
  try {
    assertAllowedOrigin(request)
    const userId = await authenticatedUserId(request)
    const body = await request.json() as SyncRequestBody
    if (!Array.isArray(body.eventIds) || body.eventIds.length === 0 || body.eventIds.length > 25 ||
      body.eventIds.some((id) => typeof id !== 'string')) {
      return jsonResponse(request, { error: 'invalid_batch_size' }, 400)
    }
    const results = await syncEvents(body.eventIds as string[], userId)
    return jsonResponse(request, {
      results,
      syncedCount: results.filter((result) => result.synced).length,
      failedCount: results.filter((result) => !result.synced).length,
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'unauthorized') return jsonResponse(request, { error: 'unauthorized' }, 401)
    if (error instanceof Error && error.message === 'origin_not_allowed') return jsonResponse(request, { error: 'origin_not_allowed' }, 403)
    console.error('google-calendar-sync-events failed')
    return jsonResponse(request, { error: 'google_sync_failed' }, 500)
  }
})
