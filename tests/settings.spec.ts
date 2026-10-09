import { randomBytes, randomUUID } from 'node:crypto'
import { test, expect, type BrowserContext, type Page, type Route } from '@playwright/test'

const restUrl = 'https://auth.editaltrack.test/rest/v1'
const email = 'settings@example.test'
const userId = randomUUID()
const otherUserId = randomUUID()
const user = {
  id: userId, aud: 'authenticated', role: 'authenticated', email,
  email_confirmed_at: new Date().toISOString(),
  app_metadata: { provider: 'email', providers: ['email'] },
  user_metadata: { name: 'Pessoa das Preferências' },
  identities: [{ id: randomUUID(), provider: 'email' }], created_at: new Date().toISOString(),
}

function session() {
  const expiresAt = Math.floor(Date.now() / 1000) + 3600
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url')
  return {
    access_token: `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: user.id, aud: 'authenticated', exp: expiresAt, iat: expiresAt - 3600 })}.${randomBytes(32).toString('base64url')}`,
    refresh_token: randomUUID(), token_type: 'bearer', expires_in: 3600, expires_at: expiresAt, user,
  }
}

function reply(route: Route, body: unknown, status = 200) {
  return route.fulfill({
    status, contentType: 'application/json',
    headers: { 'x-supabase-api-version': '2024-01-01', 'access-control-expose-headers': 'x-supabase-api-version' },
    body: JSON.stringify(body),
  })
}

async function login(page: Page) {
  await page.goto('/login')
  await page.getByLabel('E-mail', { exact: true }).fill(email)
  await page.getByLabel('Senha', { exact: true }).fill(randomBytes(18).toString('base64url'))
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(page).toHaveURL('/dashboard')
}

async function mockSettings(context: BrowserContext, initialConnection: Record<string, unknown> | null = null) {
  let stored: Record<string, unknown> | null = null
  let connection = initialConnection
  const preferenceRequests: URL[] = []
  const googleActions: string[] = []
  await context.route('https://auth.editaltrack.test/**', async (route) => {
    const url = new URL(route.request().url())
    if (url.pathname.endsWith('/token')) return reply(route, session())
    if (url.pathname.endsWith('/user')) return reply(route, user)
    if (url.pathname.endsWith('/logout')) return route.fulfill({ status: 204 })
    return route.abort('blockedbyclient')
  })
  await context.route(`${restUrl}/user_preferences**`, async (route) => {
    const url = new URL(route.request().url())
    preferenceRequests.push(url)
    if (route.request().method() === 'GET') {
      if (url.searchParams.get('user_id') !== `eq.${userId}`) return reply(route, { message: 'RLS denied' }, 403)
      return reply(route, stored)
    }
    if (route.request().method() === 'POST') {
      const payload = route.request().postDataJSON() as Record<string, unknown>
      if (payload.user_id !== userId || payload.user_id === otherUserId) return reply(route, { message: 'RLS denied' }, 403)
      stored = { ...payload, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
      return reply(route, stored)
    }
    return route.abort('blockedbyclient')
  })
  await context.route('https://auth.editaltrack.test/functions/v1/**', async (route) => {
    const name = new URL(route.request().url()).pathname.split('/').pop() ?? ''
    googleActions.push(name)
    if (name === 'google-connection-status') {
      return reply(route, connection ? {
        connected: true, email: connection.google_email, connectedAt: connection.connected_at,
        scopes: ['openid', 'email', 'https://www.googleapis.com/auth/calendar.events'], reauthRequired: connection.reauthRequired === true,
      } : { connected: false, email: null, connectedAt: null, scopes: [], reauthRequired: false })
    }
    if (name === 'google-oauth-start') return reply(route, { authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth?client_id=test-client&scope=openid%20email%20https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fcalendar.events&access_type=offline&prompt=consent&state=test-random-state' })
    if (name === 'google-disconnect') {
      connection = null
      return reply(route, { disconnected: true })
    }
    return reply(route, { error: 'not_found' }, 404)
  })
  return { preferenceRequests, readStored: () => stored, googleActions, readConnection: () => connection }
}

test('exibe a conta, defaults sem registro e Google Calendar indisponível', async ({ page, context }) => {
  const mock = await mockSettings(context)
  await login(page)
  await page.goto('/configuracoes')

  await expect(page.getByRole('heading', { name: 'Configurações' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Conta' })).toBeVisible()
  await expect(page.getByText('Pessoa das Preferências')).toBeVisible()
  await expect(page.getByText(email)).toBeVisible()
  await expect(page.getByLabel('Fuso horário')).toHaveValue('America/Fortaleza')
  for (const reminder of ['7 dias antes', '3 dias antes', '1 dia antes', 'No momento do evento']) {
    await expect(page.getByLabel(reminder)).toBeChecked()
  }
  await expect(page.getByText('Não conectado')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Conectar Google Calendar' })).toBeEnabled()
  expect(mock.readStored()).toBeNull()
})

test('inicia OAuth pelo backend e o botão nunca recebe tokens', async ({ page, context }) => {
  const mock = await mockSettings(context)
  const googleAuthorizations: URL[] = []
  await context.route('https://accounts.google.com/**', async (route) => {
    googleAuthorizations.push(new URL(route.request().url()))
    return route.fulfill({ contentType: 'text/html', body: '<title>Google OAuth mock</title>' })
  })
  await login(page)
  await page.goto('/configuracoes')
  await page.getByRole('button', { name: 'Conectar Google Calendar' }).click()
  await expect(page).toHaveTitle('Google OAuth mock')
  expect(mock.googleActions).toContain('google-oauth-start')
  expect(googleAuthorizations[0]?.hostname).toBe('accounts.google.com')
  expect(googleAuthorizations[0]?.searchParams.get('access_type')).toBe('offline')
  expect(googleAuthorizations[0]?.searchParams.get('prompt')).toBe('consent')
  expect(googleAuthorizations[0]?.searchParams.get('state')).toBe('test-random-state')
  expect(googleAuthorizations[0]?.searchParams.get('scope')).toContain('calendar.events')
  expect(page.url()).not.toContain('access_token')
  expect(page.url()).not.toContain('refresh_token')
})

test('mostra status conectado e desconecta somente após confirmação', async ({ page, context }) => {
  const mock = await mockSettings(context, {
    google_email: 'calendar.user@gmail.com',
    connected_at: '2026-10-03T12:00:00.000Z',
  })
  await login(page)
  await page.goto('/configuracoes')
  await expect(page.getByText('Conectado como:')).toContainText('calendar.user@gmail.com')
  await page.getByRole('button', { name: 'Desconectar' }).click()
  const dialog = page.getByRole('dialog', { name: 'Desconectar Google Calendar?' })
  await expect(dialog).toContainText('permanecerão intactos')
  await dialog.getByRole('button', { name: 'Confirmar desconexão' }).click()
  await expect(page.getByText('Não conectado')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Conectar Google Calendar' })).toBeVisible()
  expect(mock.googleActions).toContain('google-disconnect')
})

test('informa conexão expirada/revogada e oferece reautorização', async ({ page, context }) => {
  await mockSettings(context, {
    google_email: 'calendar.user@gmail.com',
    connected_at: '2026-10-03T12:00:00.000Z',
    reauthRequired: true,
  })
  await login(page)
  await page.goto('/configuracoes')
  await expect(page.getByText('Conexão expirada ou revogada.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Reconectar' })).toBeEnabled()
})

for (const [result, message] of [
  ['connected', 'Conta Google conectada com sucesso.'],
  ['error', 'Não foi possível conectar sua conta Google.'],
  ['cancelled', 'Você cancelou a autorização.'],
] as const) {
  test(`trata retorno OAuth ${result} sem expor informações técnicas`, async ({ page, context }) => {
    await mockSettings(context, result === 'connected' ? {
      google_email: 'calendar.user@gmail.com',
      connected_at: '2026-10-03T12:00:00.000Z',
    } : null)
    await login(page)
    await page.goto(`/configuracoes?google=${result}`)
    await expect(page.getByRole('status')).toContainText(message)
    if (result === 'connected') await expect(page.getByText('calendar.user@gmail.com')).toBeVisible()
    expect(page.url()).toContain('/configuracoes')
    expect(page.url()).not.toContain('google=')
  })
}

test('explica erro de credencial OAuth sem expor secrets', async ({ page, context }) => {
  await mockSettings(context)
  await login(page)
  await page.goto('/configuracoes?google=error&google_error=invalid_client')
  await expect(page.getByRole('status')).toContainText('Client ID e o Client Secret da mesma credencial Web')
  expect(page.url()).not.toContain('google_error=')
})

test('mostra diagnóstico seguro para erro de criptografia OAuth', async ({ page, context }) => {
  await mockSettings(context)
  await login(page)
  await page.goto('/configuracoes?google=error&google_error=token_encryption_config')
  await expect(page.getByRole('status')).toContainText('TOKEN_ENCRYPTION_KEY')
  expect(page.url()).not.toContain('google_error=')
})

test('salva timezone e lembretes e os mantém após recarregar', async ({ page, context }) => {
  const mock = await mockSettings(context)
  await login(page)
  await page.goto('/configuracoes')

  await page.getByLabel('Fuso horário').selectOption('America/Manaus')
  await page.getByLabel('7 dias antes').uncheck()
  await page.getByLabel('No momento do evento').uncheck()
  await page.getByRole('button', { name: 'Salvar preferências' }).click()
  await expect(page.getByRole('status')).toContainText('Preferências salvas.')
  expect(mock.readStored()).toMatchObject({
    user_id: userId,
    timezone: 'America/Manaus',
    default_reminders: [4320, 1440],
  })

  await page.reload()
  await expect(page.getByLabel('Fuso horário')).toHaveValue('America/Manaus')
  await expect(page.getByLabel('7 dias antes')).not.toBeChecked()
  await expect(page.getByLabel('3 dias antes')).toBeChecked()
  await expect(page.getByLabel('1 dia antes')).toBeChecked()
  await expect(page.getByLabel('No momento do evento')).not.toBeChecked()
})

test('consulta preferências sempre escopadas ao usuário autenticado', async ({ page, context }) => {
  const mock = await mockSettings(context)
  await login(page)
  await page.goto('/configuracoes')
  await expect(page.getByLabel('Fuso horário')).toBeEnabled()
  expect(mock.preferenceRequests.length).toBeGreaterThan(0)
  for (const request of mock.preferenceRequests.filter((item) => item.searchParams.has('user_id'))) {
    expect(request.searchParams.get('user_id')).toBe(`eq.${userId}`)
    expect(request.searchParams.get('user_id')).not.toBe(`eq.${otherUserId}`)
  }
})
