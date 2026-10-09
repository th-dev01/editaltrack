export const GOOGLE_SCOPES = [
  'openid',
  'email',
  'https://www.googleapis.com/auth/calendar.events',
] as const

const LOCAL_ORIGINS = new Set(['http://localhost:5173', 'http://127.0.0.1:5173'])

export function allowedOrigin(request: Request): string | null {
  const origin = request.headers.get('Origin')
  if (!origin) return null
  const appUrl = Deno.env.get('APP_URL')
  const configuredOrigin = appUrl ? new URL(appUrl).origin : null
  return origin === configuredOrigin || LOCAL_ORIGINS.has(origin) ? origin : null
}

export function corsHeaders(request: Request): HeadersInit {
  const origin = allowedOrigin(request)
  return {
    ...(origin ? { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' } : {}),
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  }
}

export function handleOptions(request: Request): Response | null {
  if (request.method !== 'OPTIONS') return null
  return new Response('ok', { headers: corsHeaders(request) })
}

export function jsonResponse(request: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders(request) })
}

export function assertAllowedOrigin(request: Request): void {
  const origin = request.headers.get('Origin')
  if (origin && !allowedOrigin(request)) throw new Error('origin_not_allowed')
}

function requiredEnv(name: string): string {
  const value = Deno.env.get(name)?.trim()
  if (!value) throw new Error(`missing_${name}`)
  return value
}

export function getOAuthConfig() {
  return {
    clientId: requiredEnv('GOOGLE_CLIENT_ID'),
    clientSecret: requiredEnv('GOOGLE_CLIENT_SECRET'),
    redirectUri: requiredEnv('GOOGLE_REDIRECT_URI'),
    appUrl: new URL(requiredEnv('APP_URL')).origin,
  }
}

export function getSupabaseConfig() {
  return {
    url: requiredEnv('SUPABASE_URL').replace(/\/$/, ''),
    anonKey: requiredEnv('SUPABASE_ANON_KEY'),
    serviceRoleKey: requiredEnv('SUPABASE_SERVICE_ROLE_KEY'),
  }
}

export async function authenticatedUserId(request: Request): Promise<string> {
  const authorization = request.headers.get('Authorization')
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1]
  if (!token) throw new Error('unauthorized')

  const { url, anonKey } = getSupabaseConfig()
  const response = await fetch(`${url}/auth/v1/user`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${token}` },
  })
  if (!response.ok) throw new Error('unauthorized')
  const user = await response.json() as { id?: unknown }
  if (typeof user.id !== 'string') throw new Error('unauthorized')
  return user.id
}

export async function serviceRequest<T>(path: string, init: RequestInit = {}): Promise<T | null> {
  const { url, serviceRoleKey } = getSupabaseConfig()
  const headers = new Headers({
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    'Content-Type': 'application/json',
  })
  new Headers(init.headers).forEach((value, key) => headers.set(key, value))
  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers,
  })
  if (!response.ok) throw new Error(`database_${response.status}`)
  if (response.status === 204 || response.headers.get('Content-Length') === '0') return null
  const text = await response.text()
  return text ? JSON.parse(text) as T : null
}

function encodeBase64(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

function decodeBase64(value: string): Uint8Array {
  return Uint8Array.from(atob(value), (char) => char.charCodeAt(0))
}

function asArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes.byteLength)
  new Uint8Array(buffer).set(bytes)
  return buffer
}

export async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

export function randomState(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  return encodeBase64(bytes).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')
}

export async function encryptToken(token: string): Promise<string> {
  const rawKey = Deno.env.get('TOKEN_ENCRYPTION_KEY')
  if (!rawKey) throw new Error('missing_TOKEN_ENCRYPTION_KEY')
  const keyBytes = decodeBase64(rawKey)
  if (keyBytes.byteLength !== 32) throw new Error('invalid_TOKEN_ENCRYPTION_KEY')
  const key = await crypto.subtle.importKey('raw', asArrayBuffer(keyBytes), 'AES-GCM', false, ['encrypt'])
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: asArrayBuffer(iv) }, key, asArrayBuffer(new TextEncoder().encode(token)))
  return `v1.${encodeBase64(iv)}.${encodeBase64(new Uint8Array(encrypted))}`
}

export async function decryptToken(envelope: string): Promise<string> {
  const [version, ivValue, encryptedValue] = envelope.split('.')
  const rawKey = Deno.env.get('TOKEN_ENCRYPTION_KEY')
  if (version !== 'v1' || !ivValue || !encryptedValue || !rawKey) throw new Error('invalid_encrypted_token')
  const keyBytes = decodeBase64(rawKey)
  if (keyBytes.byteLength !== 32) throw new Error('invalid_TOKEN_ENCRYPTION_KEY')
  const key = await crypto.subtle.importKey('raw', asArrayBuffer(keyBytes), 'AES-GCM', false, ['decrypt'])
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: asArrayBuffer(decodeBase64(ivValue)) }, key, asArrayBuffer(decodeBase64(encryptedValue)),
  )
  return new TextDecoder().decode(decrypted)
}

export function frontendRedirect(appUrl: string, result: 'connected' | 'error' | 'cancelled'): Response {
  const url = new URL('/configuracoes', appUrl)
  url.searchParams.set('google', result)
  return Response.redirect(url, 302)
}

export interface StoredGoogleConnection {
  user_id: string
  google_email: string | null
  google_user_id: string | null
  refresh_token_encrypted: string
  access_token_encrypted: string | null
  expires_at: string | null
  scopes: string[]
  connected_at: string
}

interface AccessTokenRow {
  user_id: string
  refresh_token_encrypted: string
  access_token_encrypted: string | null
  expires_at: string | null
}

interface RefreshedAccessToken {
  access_token?: string
  expires_in?: number
  error?: string
}

export class GoogleAuthorizationError extends Error {
  constructor() {
    super('google_reauthorization_required')
    this.name = 'GoogleAuthorizationError'
  }
}

export async function getValidGoogleAccessToken(userId: string, forceRefresh = false): Promise<string> {
  const filter = new URLSearchParams({
    select: 'user_id,refresh_token_encrypted,access_token_encrypted,expires_at',
    user_id: `eq.${userId}`,
    limit: '1',
  })
  const rows = await serviceRequest<AccessTokenRow[]>(`google_calendar_connections?${filter}`)
  const connection = rows?.[0]
  if (!connection) throw new Error('google_not_connected')

  const expiresSoon = !connection.expires_at || new Date(connection.expires_at).getTime() <= Date.now() + 60_000
  if (!forceRefresh && !expiresSoon && connection.access_token_encrypted) {
    try {
      return await decryptToken(connection.access_token_encrypted)
    } catch {
      // A damaged/old ciphertext is treated as unavailable and attempts a refresh below.
    }
  }

  const config = getOAuthConfig()
  const refreshToken = await decryptToken(connection.refresh_token_encrypted)
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })
  const refreshed = await response.json().catch(() => ({})) as RefreshedAccessToken
  if (!response.ok) {
    if (refreshed.error === 'invalid_grant' || refreshed.error === 'invalid_token') throw new GoogleAuthorizationError()
    throw new Error('google_token_refresh_failed')
  }
  if (!refreshed.access_token) throw new Error('google_token_refresh_failed')

  const expiresAt = typeof refreshed.expires_in === 'number'
    ? new Date(Date.now() + refreshed.expires_in * 1000).toISOString()
    : null
  await serviceRequest(`google_calendar_connections?${new URLSearchParams({ user_id: `eq.${userId}` })}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ access_token_encrypted: await encryptToken(refreshed.access_token), expires_at: expiresAt }),
  })
  return refreshed.access_token
}

export async function googleCalendarRequest(
  userId: string,
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  let accessToken = await getValidGoogleAccessToken(userId)
  const execute = (token: string) => {
    const headers = new Headers(init.headers)
    headers.set('Authorization', `Bearer ${token}`)
    return fetch(`https://www.googleapis.com/calendar/v3/${path}`, { ...init, headers })
  }
  let response = await execute(accessToken)
  if (response.status === 401) {
    accessToken = await getValidGoogleAccessToken(userId, true)
    response = await execute(accessToken)
  }
  return response
}
