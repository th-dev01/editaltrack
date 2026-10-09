import { supabase } from '../lib/supabase'
import { DISCONNECTED_GOOGLE_STATUS, type BatchSyncResult, type GoogleConnectionStatus, type GoogleSyncResult } from '../types/google-calendar'

function client() {
  if (!supabase) throw new Error('Supabase não configurado')
  return supabase
}

export async function startGoogleOAuth(): Promise<string> {
  const { data, error } = await client().functions.invoke<{ authorizationUrl: string }>('google-oauth-start', { body: {} })
  if (error || !data || typeof data.authorizationUrl !== 'string') throw new Error('google_oauth_start_failed')
  const authorizationUrl = new URL(data.authorizationUrl)
  if (authorizationUrl.protocol !== 'https:' || authorizationUrl.hostname !== 'accounts.google.com') {
    throw new Error('invalid_google_authorization_url')
  }
  return authorizationUrl.toString()
}

export async function getGoogleConnectionStatus(): Promise<GoogleConnectionStatus> {
  const { data, error } = await client().functions.invoke<GoogleConnectionStatus>('google-connection-status', { body: {} })
  if (error || !data || typeof data.connected !== 'boolean') throw new Error('google_connection_status_failed')
  return {
    connected: data.connected,
    email: typeof data.email === 'string' ? data.email : null,
    connectedAt: typeof data.connectedAt === 'string' ? data.connectedAt : null,
    scopes: Array.isArray(data.scopes) ? data.scopes.filter((scope): scope is string => typeof scope === 'string') : [],
    reauthRequired: data.reauthRequired === true,
  }
}

export async function disconnectGoogle(): Promise<void> {
  const { data, error } = await client().functions.invoke<{ disconnected: boolean }>('google-disconnect', { body: {} })
  if (error || data?.disconnected !== true) throw new Error('google_disconnect_failed')
}

export async function syncEventosBatch(eventIds: string[]): Promise<BatchSyncResult> {
  if (!eventIds.length || eventIds.length > 25) throw new Error('Selecione de 1 a 25 eventos para sincronizar.')
  const { data, error } = await client().functions.invoke<BatchSyncResult>('google-calendar-sync-events', { body: { eventIds } })
  if (error || !data || !Array.isArray(data.results)) throw new Error('Não foi possível iniciar a sincronização com o Google Calendar.')
  return data
}

export async function syncEvento(eventId: string): Promise<GoogleSyncResult> {
  const result = await syncEventosBatch([eventId])
  const item = result.results[0]
  if (!item) throw new Error('Não foi possível sincronizar o evento.')
  return item
}

export async function deleteGoogleEvent(eventId: string): Promise<void> {
  const { data, error } = await client().functions.invoke<{
    removed: boolean
    errorCode?: string
    message?: string
  }>('google-calendar-delete-event', { body: { eventId } })
  if (error || !data) throw new Error('Não foi possível remover o evento do Google Calendar.')
  if (!data.removed) throw new Error(data.message ?? 'Não foi possível remover o evento do Google Calendar.')
}

export async function markGoogleEventPending(eventId: string): Promise<void> {
  const { data, error } = await client().functions.invoke<{ marked: boolean }>('google-calendar-mark-pending', { body: { eventId } })
  if (error || data?.marked !== true) throw new Error('Não foi possível registrar as alterações pendentes no Google Calendar.')
}

export { DISCONNECTED_GOOGLE_STATUS }
