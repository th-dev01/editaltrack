import {
  GoogleAuthorizationError,
  getValidGoogleAccessToken,
  googleCalendarRequest,
  serviceRequest,
} from './google-oauth.ts'
import { buildGoogleEventPayload, validateReminderMinutes } from './google-event-payload.ts'

const DEFAULT_TIMEZONE = 'America/Fortaleza'
const DEFAULT_REMINDERS = [10080, 4320, 1440, 0]

interface CalendarRelation {
  titulo: string
  instituicao: string
  link_pagina: string | null
  link_inscricao: string | null
}

interface CalendarEventRow {
  id: string
  user_id: string
  edital_id: string
  titulo: string
  tipo: string
  data_inicio: string
  data_fim: string | null
  dia_inteiro: boolean
  descricao: string | null
  concluido: boolean
  lembrete_modo: 'nenhum' | 'frequencia' | 'datas'
  lembrete_intervalo_dias: number | null
  lembrete_datas: string[]
  google_event_id: string | null
  google_calendar_id: string | null
  google_sync_status: 'not_synced' | 'syncing' | 'synced' | 'error'
  updated_at: string
  editais: CalendarRelation
}

interface UserPreferenceRow {
  timezone: string
  default_reminders: unknown
}

interface GoogleEventResponse {
  id?: string
  htmlLink?: string
}

export interface GoogleSyncResult {
  eventId: string
  synced: boolean
  googleEventId?: string
  htmlLink?: string | null
  errorCode?: string
  message?: string
}

export class GoogleCalendarApiError extends Error {
  constructor(readonly status: number) {
    super('google_calendar_api_error')
    this.name = 'GoogleCalendarApiError'
  }
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function apiErrorMessage(error: unknown): { code: string; message: string } {
  if (error instanceof GoogleAuthorizationError) return {
    code: 'connection_expired',
    message: 'Sua conexão com o Google expirou ou foi revogada. Reconecte sua conta.',
  }
  if (error instanceof GoogleCalendarApiError && error.status === 403) return {
    code: 'google_permission_denied',
    message: 'O Google recusou a operação. Verifique a conexão e as permissões da conta.',
  }
  if (error instanceof GoogleCalendarApiError && error.status === 401) return {
    code: 'connection_expired',
    message: 'Sua conexão com o Google expirou ou foi revogada. Reconecte sua conta.',
  }
  if (error instanceof Error && error.message === 'google_not_connected') return {
    code: 'google_not_connected',
    message: 'Conecte sua conta Google primeiro.',
  }
  if (error instanceof Error && error.message === 'reminder_limit_exceeded') return {
    code: 'reminder_limit_exceeded',
    message: 'O Google Calendar aceita no máximo cinco lembretes por evento.',
  }
  if (error instanceof Error && error.message === 'invalid_event_period') return {
    code: 'invalid_event_period',
    message: 'A data final do evento deve ser posterior à data inicial.',
  }
  if (error instanceof Error && error.message === 'sync_in_progress') return {
    code: 'sync_in_progress',
    message: 'Este evento já está sendo sincronizado. Tente novamente em instantes.',
  }
  return { code: 'google_sync_failed', message: 'Não foi possível sincronizar este evento com o Google Calendar.' }
}

async function loadEvent(eventId: string, userId: string): Promise<CalendarEventRow> {
  if (!UUID_PATTERN.test(eventId)) throw new Error('invalid_event_id')
  const query = new URLSearchParams({
    select: 'id,user_id,edital_id,titulo,tipo,data_inicio,data_fim,dia_inteiro,descricao,concluido,lembrete_modo,lembrete_intervalo_dias,lembrete_datas,google_event_id,google_calendar_id,google_sync_status,updated_at,editais!inner(titulo,instituicao,link_pagina,link_inscricao)',
    id: `eq.${eventId}`,
    user_id: `eq.${userId}`,
    limit: '1',
  })
  const events = await serviceRequest<CalendarEventRow[]>(`eventos_edital?${query}`)
  const event = events?.[0]
  if (!event) throw new Error('event_not_found')
  return event
}

async function updateEventMetadata(eventId: string, userId: string, values: Record<string, unknown>): Promise<void> {
  const query = new URLSearchParams({ id: `eq.${eventId}`, user_id: `eq.${userId}` })
  await serviceRequest(`eventos_edital?${query}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify(values),
  })
}

async function claimEvent(event: CalendarEventRow, userId: string): Promise<boolean> {
  if (event.google_sync_status === 'syncing') {
    const staleThreshold = new Date(Date.now() - 5 * 60_000).toISOString()
    if (event.updated_at > staleThreshold) return false
    const staleQuery = new URLSearchParams({
      id: `eq.${event.id}`,
      user_id: `eq.${userId}`,
      google_sync_status: 'eq.syncing',
      updated_at: `lt.${staleThreshold}`,
      select: 'id',
    })
    const reclaimed = await serviceRequest<Array<{ id: string }>>(`eventos_edital?${staleQuery}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ google_sync_error: null }),
    })
    return Boolean(reclaimed?.length)
  }

  const query = new URLSearchParams({
    id: `eq.${event.id}`,
    user_id: `eq.${userId}`,
    google_sync_status: `eq.${event.google_sync_status}`,
    select: 'id',
  })
  const claimed = await serviceRequest<Array<{ id: string }>>(`eventos_edital?${query}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ google_sync_status: 'syncing', google_sync_error: null }),
  })
  return Boolean(claimed?.length)
}

async function loadCalendarPreferences(userId: string): Promise<{ timezone: string; reminders: number[] }> {
  const query = new URLSearchParams({ select: 'timezone,default_reminders', user_id: `eq.${userId}`, limit: '1' })
  const rows = await serviceRequest<UserPreferenceRow[]>(`user_preferences?${query}`)
  const timezone = rows?.[0]?.timezone ?? DEFAULT_TIMEZONE
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone })
  } catch {
    throw new Error('invalid_timezone')
  }

  const configured = rows?.[0]?.default_reminders
  const reminders = validateReminderMinutes(configured === undefined ? DEFAULT_REMINDERS : configured)
  return { timezone, reminders }
}

function createGoogleEventId(): string {
  // Persist the generated, Google-valid ID before events.insert; retries can then PATCH instead of duplicating.
  return `edital${crypto.randomUUID().replaceAll('-', '')}`
}

async function apiJson(response: Response): Promise<GoogleEventResponse> {
  if (!response.ok) throw new GoogleCalendarApiError(response.status)
  if (response.status === 204) return {}
  return await response.json() as GoogleEventResponse
}

export async function syncOneEvent(eventId: string, userId: string): Promise<GoogleSyncResult> {
  let event: CalendarEventRow | null = null
  try {
    event = await loadEvent(eventId, userId)
    if (event.google_sync_status === 'syncing' && Date.now() - new Date(event.updated_at).getTime() < 5 * 60_000) {
      return { eventId, synced: false, errorCode: 'sync_in_progress', message: 'Este evento já está sendo sincronizado.' }
    }
    if (!await claimEvent(event, userId)) {
      return { eventId, synced: false, errorCode: 'sync_in_progress', message: 'Este evento já está sendo sincronizado.' }
    }

    const { timezone, reminders } = await loadCalendarPreferences(userId)
    const payload = buildGoogleEventPayload(event, timezone, reminders)
    await getValidGoogleAccessToken(userId)
    const calendarId = event.google_calendar_id || 'primary'
    const calendarPath = `calendars/${encodeURIComponent(calendarId)}/events`
    const isExisting = Boolean(event.google_event_id)
    if (isExisting && event.lembrete_modo === 'nenhum') {
      // Explicitly clear an older recurring series when a user turns period reminders off.
      payload.recurrence = []
    }
    const googleEventId = event.google_event_id ?? createGoogleEventId()
    const body = JSON.stringify(isExisting ? payload : { ...payload, id: googleEventId })

    if (!isExisting) {
      await updateEventMetadata(event.id, userId, {
        google_event_id: googleEventId,
        google_calendar_id: calendarId,
      })
    }

    let response = await googleCalendarRequest(
      userId,
      isExisting ? `${calendarPath}/${encodeURIComponent(googleEventId)}` : calendarPath,
      { method: isExisting ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body },
    )

    // If a prior insert succeeded but its response was lost, retry the persisted ID via PATCH, never a second insert.
    if (!isExisting && response.status === 409) {
      response = await googleCalendarRequest(
        userId,
        `${calendarPath}/${encodeURIComponent(googleEventId)}`,
        { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body },
      )
    }

    if (isExisting && response.status === 404) {
      await updateEventMetadata(event.id, userId, {
        google_event_id: null,
        google_calendar_id: null,
        google_event_html_link: null,
        google_synced_at: null,
        google_sync_status: 'error',
        google_sync_error: 'O evento não existe mais no Google Calendar. Sincronize novamente.',
      })
      return { eventId, synced: false, errorCode: 'google_event_missing', message: 'O evento não existe mais no Google Calendar. Sincronize novamente.' }
    }

    if (!isExisting && response.status === 404) {
      await updateEventMetadata(event.id, userId, {
        google_event_id: null,
        google_calendar_id: null,
        google_sync_status: 'error',
        google_sync_error: 'A sincronização não foi concluída. Tente novamente.',
      })
      return { eventId, synced: false, errorCode: 'google_event_missing', message: 'A sincronização não foi concluída. Tente novamente.' }
    }

    const remote = await apiJson(response)
    const persistedId = remote.id ?? googleEventId
    await updateEventMetadata(event.id, userId, {
      google_event_id: persistedId,
      google_calendar_id: calendarId,
      google_event_html_link: remote.htmlLink ?? null,
      google_synced_at: new Date().toISOString(),
      google_sync_status: 'synced',
      google_sync_error: null,
    })
    return { eventId, synced: true, googleEventId: persistedId, htmlLink: remote.htmlLink ?? null }
  } catch (error) {
    const safeError = apiErrorMessage(error)
    if (event) {
      await updateEventMetadata(event.id, userId, {
        google_sync_status: 'error',
        google_sync_error: safeError.message,
      }).catch(() => undefined)
    }
    if (error instanceof Error && error.message === 'event_not_found') {
      return { eventId, synced: false, errorCode: 'event_not_found', message: 'Evento não encontrado.' }
    }
    if (error instanceof Error && error.message === 'invalid_event_id') {
      return { eventId, synced: false, errorCode: 'invalid_event_id', message: 'Identificador de evento inválido.' }
    }
    return { eventId, synced: false, ...safeError }
  }
}

export async function syncEvents(eventIds: string[], userId: string): Promise<GoogleSyncResult[]> {
  const uniqueIds = [...new Set(eventIds)]
  if (!uniqueIds.length || uniqueIds.length > 25) throw new Error('invalid_batch_size')
  const results: GoogleSyncResult[] = []
  for (const eventId of uniqueIds) results.push(await syncOneEvent(eventId, userId))
  return results
}

export async function removeGoogleEvent(eventId: string, userId: string): Promise<void> {
  const event = await loadEvent(eventId, userId)
  if (!event.google_event_id) {
    await updateEventMetadata(event.id, userId, {
      google_calendar_id: null,
      google_event_html_link: null,
      google_synced_at: null,
      google_sync_status: 'not_synced',
      google_sync_error: null,
    })
    return
  }

  if (!await claimEvent(event, userId)) throw new Error('sync_in_progress')

  const calendarId = event.google_calendar_id || 'primary'
  const path = `calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(event.google_event_id)}`
  try {
    const response = await googleCalendarRequest(userId, path, { method: 'DELETE' })
    if (!response.ok && response.status !== 404 && response.status !== 410) {
      if (response.status === 401) throw new GoogleAuthorizationError()
      throw new GoogleCalendarApiError(response.status)
    }
  } catch (error) {
    const safeError = apiErrorMessage(error)
    await updateEventMetadata(event.id, userId, {
      google_sync_status: 'error',
      google_sync_error: safeError.message,
    })
    throw error
  }
  await updateEventMetadata(event.id, userId, {
    google_event_id: null,
    google_calendar_id: null,
    google_event_html_link: null,
    google_synced_at: null,
    google_sync_status: 'not_synced',
    google_sync_error: null,
  })
}

export function safeGoogleError(error: unknown): { code: string; message: string } {
  return apiErrorMessage(error)
}
