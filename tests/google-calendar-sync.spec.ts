import { randomBytes, randomUUID } from 'node:crypto'
import { test, expect, type BrowserContext, type Page, type Route } from '@playwright/test'

const restUrl = 'https://auth.editaltrack.test/rest/v1'
const email = 'google-sync@example.test'
const userId = randomUUID()
const editalId = randomUUID()
const user = {
  id: userId, aud: 'authenticated', role: 'authenticated', email,
  email_confirmed_at: new Date().toISOString(),
  app_metadata: { provider: 'email', providers: ['email'] },
  user_metadata: { name: 'Teste de sincronização' },
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

function event(overrides: Record<string, unknown> = {}) {
  return {
    id: randomUUID(), user_id: userId, edital_id: editalId, titulo: 'Fim das inscrições', tipo: 'inscricao',
    data_inicio: '2026-10-25T03:00:00.000Z', data_fim: null, dia_inteiro: true,
    descricao: null, concluido: false, google_event_id: null, google_calendar_id: null,
    google_sync_status: 'not_synced', google_synced_at: null, google_sync_error: null,
    google_event_html_link: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    editais: { titulo: 'PPGCC UEMA', numero_edital: '01/2026', categoria: 'Mestrado', instituicao: 'UEMA' },
    ...overrides,
  }
}

async function login(page: Page) {
  await page.goto('/login')
  await page.getByLabel('E-mail', { exact: true }).fill(email)
  await page.getByLabel('Senha', { exact: true }).fill(randomBytes(18).toString('base64url'))
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(page).toHaveURL('/dashboard')
}

async function mockEventDetails(context: BrowserContext, seedEvents: Array<Record<string, unknown>>, connected: boolean) {
  const events = seedEvents
  const syncRequests: string[][] = []
  const deletedEvents: string[] = []
  let syncFailures = new Map<string, { code: string; message: string }>()
  let requiresReauth = false
  let deleteFails = false

  await context.route('https://auth.editaltrack.test/**', async (route) => {
    const url = new URL(route.request().url())
    if (url.pathname.endsWith('/token')) return reply(route, session())
    if (url.pathname.endsWith('/user')) return reply(route, user)
    if (url.pathname.endsWith('/logout')) return route.fulfill({ status: 204 })
    return route.abort('blockedbyclient')
  })
  await context.route(`${restUrl}/editais**`, (route) => reply(route, [{
    id: editalId, user_id: userId, titulo: 'PPGCC UEMA', numero_edital: '01/2026', instituicao: 'UEMA',
    categoria: 'Mestrado', cargo_curso: null, descricao: null, cidade: null, estado: 'MA', modalidade: null,
    link_pagina: 'https://uema.br/edital', link_inscricao: 'https://uema.br/inscricao', link_pdf: null,
    valor_inscricao: null, possui_isencao: false, status: 'inscricao_aberta', favorito: false,
    observacoes: null, inscricao_realizada: false, data_inscricao_realizada: null,
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  }]))
  await context.route(`${restUrl}/eventos_edital**`, async (route) => {
    const method = route.request().method()
    const url = new URL(route.request().url())
    const id = url.searchParams.get('id')?.replace('eq.', '')
    if (method === 'GET') return reply(route, events.filter((item) => !id || item.id === id))
    if (method === 'PATCH') {
      const body = route.request().postDataJSON() as Record<string, unknown>
      const current = events.find((item) => item.id === id)
      if (!current) return reply(route, [], 404)
      Object.assign(current, body)
      return reply(route, [current])
    }
    if (method === 'DELETE') {
      const index = events.findIndex((item) => item.id === id)
      if (index >= 0) events.splice(index, 1)
      return reply(route, [{ id }])
    }
    return route.abort('blockedbyclient')
  })
  await context.route('https://auth.editaltrack.test/functions/v1/**', async (route) => {
    const name = new URL(route.request().url()).pathname.split('/').pop()
    if (name === 'google-connection-status') return reply(route, connected ? {
      connected: true, email: 'calendar.user@gmail.com', connectedAt: '2026-10-03T12:00:00.000Z',
      scopes: ['openid', 'email', 'https://www.googleapis.com/auth/calendar.events'], reauthRequired: requiresReauth,
    } : { connected: false, email: null, connectedAt: null, scopes: [], reauthRequired: false })
    if (name === 'google-calendar-mark-pending') return reply(route, { marked: true })
    if (name === 'google-calendar-sync-events') {
      const body = route.request().postDataJSON() as { eventIds: string[] }
      syncRequests.push(body.eventIds)
      const results = body.eventIds.map((eventId) => {
        const target = events.find((item) => item.id === eventId)
        const failure = syncFailures.get(eventId)
        if (failure) {
          if (target) Object.assign(target, {
            ...(failure.code === 'google_event_missing' ? { google_event_id: null, google_calendar_id: null, google_event_html_link: null } : {}),
            google_sync_status: 'error', google_sync_error: failure.message,
          })
          if (failure.code === 'connection_expired') requiresReauth = true
          return { eventId, synced: false, errorCode: failure.code, message: failure.message }
        }
        const googleEventId = String(target?.google_event_id ?? `remote-${eventId}`)
        if (target) Object.assign(target, {
          google_event_id: googleEventId, google_calendar_id: 'primary', google_sync_status: 'synced',
          google_sync_error: null, google_event_html_link: `https://calendar.google.com/calendar/event?eid=${googleEventId}`,
        })
        return { eventId, synced: true, googleEventId, htmlLink: `https://calendar.google.com/calendar/event?eid=${googleEventId}` }
      })
      return reply(route, { results, syncedCount: results.filter((item) => item.synced).length, failedCount: results.filter((item) => !item.synced).length })
    }
    if (name === 'google-calendar-delete-event') {
      const body = route.request().postDataJSON() as { eventId: string }
      deletedEvents.push(body.eventId)
      if (deleteFails) return reply(route, { removed: false, errorCode: 'google_sync_failed', message: 'Falha simulada ao remover do Google.' })
      const target = events.find((item) => item.id === body.eventId)
      if (target) Object.assign(target, {
        google_event_id: null, google_calendar_id: null, google_event_html_link: null,
        google_sync_status: 'not_synced', google_sync_error: null, google_synced_at: null,
      })
      return reply(route, { removed: true })
    }
    return reply(route, { error: 'not_found' }, 404)
  })
  return {
    events,
    syncRequests,
    deletedEvents,
    setFailedIds: (ids: string[]) => { syncFailures = new Map(ids.map((id) => [id, { code: 'google_sync_failed', message: 'Mock failure' }])) },
    setError: (id: string, code: string, message: string) => { syncFailures.set(id, { code, message }) },
    setDeleteFails: () => { deleteFails = true },
  }
}

async function openDetails(page: Page) {
  await login(page)
  await page.goto(`/editais/${editalId}`)
  await expect(page.getByRole('heading', { name: 'Cronograma' })).toBeVisible()
}

test('sem conexão, sincronizar orienta para Configurações sem chamar a função de sync', async ({ page, context }) => {
  const mock = await mockEventDetails(context, [event()], false)
  await openDetails(page)
  await page.getByRole('button', { name: 'Adicionar ao Google Calendar' }).click()
  await expect(page.getByRole('status')).toContainText('Conecte sua conta Google primeiro.')
  await expect(page.getByRole('link', { name: 'Ir para Configurações' })).toHaveAttribute('href', '/configuracoes')
  expect(mock.syncRequests).toHaveLength(0)
})

test('sincroniza evento e oferece link seguro para abri-lo no Google', async ({ page, context }) => {
  const fixture = event()
  const mock = await mockEventDetails(context, [fixture], true)
  await openDetails(page)
  await expect(page.getByRole('button', { name: 'Sincronizar cronograma' })).toBeVisible()
  await page.getByRole('button', { name: 'Adicionar ao Google Calendar' }).click()
  await expect(page.getByText('Google Calendar', { exact: true }).first()).toBeVisible()
  await expect(page.getByRole('link', { name: 'Abrir no Google Calendar' })).toHaveAttribute('rel', 'noopener noreferrer')
  expect(mock.syncRequests).toEqual([[fixture.id]])
  expect(mock.events[0]?.google_event_id).toBeTruthy()
})

test('detalhes rápidos do calendário também permitem adicionar evento ao Google', async ({ page, context }) => {
  const fixture = event()
  const mock = await mockEventDetails(context, [fixture], true)
  await login(page)
  await page.goto('/calendario')
  const item = page.getByRole('button', { name: /Fim das inscrições.*PPGCC UEMA/ })
  await expect(item).toBeVisible()
  await item.click()
  const dialog = page.getByRole('dialog', { name: 'Detalhes do evento' })
  await dialog.getByRole('button', { name: 'Adicionar ao Google Calendar' }).click()
  await expect(dialog.getByText('Google Calendar', { exact: true })).toBeVisible()
  expect(mock.syncRequests).toEqual([[fixture.id]])
})

test('atualizar evento já vinculado envia o mesmo id e não cria uma segunda vinculação', async ({ page, context }) => {
  const googleId = `remote-${randomUUID()}`
  const fixture = event({ google_event_id: googleId, google_calendar_id: 'primary', google_sync_status: 'synced', google_event_html_link: `https://calendar.google.com/calendar/event?eid=${googleId}` })
  const mock = await mockEventDetails(context, [fixture], true)
  await openDetails(page)
  await expect(page.getByRole('button', { name: 'Sincronizar cronograma' })).toBeVisible()
  await page.getByRole('button', { name: 'Atualizar no Google' }).click()
  await expect(page.getByRole('link', { name: 'Abrir no Google Calendar' })).toBeVisible()
  expect(mock.syncRequests).toEqual([[fixture.id]])
  expect(mock.events[0]?.google_event_id).toBe(googleId)
})

test('editar evento vinculado salva internamente e tenta sincronizar a alteração', async ({ page, context }) => {
  const googleId = `remote-${randomUUID()}`
  const fixture = event({ google_event_id: googleId, google_calendar_id: 'primary', google_sync_status: 'synced' })
  const mock = await mockEventDetails(context, [fixture], true)
  await openDetails(page)
  await page.getByRole('article').getByRole('button', { name: 'Editar', exact: true }).click()
  await page.getByLabel('Data de início *').fill('2026-10-26')
  await page.getByRole('button', { name: 'Salvar alterações' }).click()
  await expect(page.getByRole('button', { name: 'Atualizar no Google' })).toBeVisible()
  expect(mock.events[0]?.google_event_id).toBe(googleId)
  expect(mock.events[0]?.data_inicio).toContain('2026-10-26')
  expect(mock.syncRequests).toEqual([[fixture.id]])
})

test('remover do Google mantém o evento interno e limpa apenas o vínculo remoto', async ({ page, context }) => {
  const googleId = `remote-${randomUUID()}`
  const fixture = event({ google_event_id: googleId, google_calendar_id: 'primary', google_sync_status: 'synced' })
  const mock = await mockEventDetails(context, [fixture], true)
  await openDetails(page)
  await expect(page.getByRole('button', { name: 'Sincronizar cronograma' })).toBeVisible()
  await page.getByRole('button', { name: 'Remover do Google' }).click()
  await expect(page.getByRole('heading', { name: 'Fim das inscrições' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Adicionar ao Google Calendar' })).toBeVisible()
  expect(mock.deletedEvents).toEqual([fixture.id])
  expect(mock.events).toHaveLength(1)
  expect(mock.events[0]?.google_event_id).toBeNull()
})

test('refresh inválido informa reconexão sem falhar os dados internos do evento', async ({ page, context }) => {
  const googleId = `remote-${randomUUID()}`
  const fixture = event({ google_event_id: googleId, google_calendar_id: 'primary', google_sync_status: 'synced' })
  const mock = await mockEventDetails(context, [fixture], true)
  mock.setError(fixture.id, 'connection_expired', 'Sua conexão com o Google expirou ou foi revogada. Reconecte sua conta.')
  await openDetails(page)
  await page.getByRole('button', { name: 'Atualizar no Google' }).click()
  await expect(page.getByRole('link', { name: 'Reconectar Google' })).toBeVisible()
  await expect(page.getByRole('article').getByText('Sua conexão com o Google expirou')).toBeVisible()
  expect(mock.events).toHaveLength(1)
  expect(mock.events[0]?.id).toBe(fixture.id)
})

test('Google 404 limpa o vínculo e deixa o evento disponível para sincronizar novamente', async ({ page, context }) => {
  const googleId = `remote-${randomUUID()}`
  const fixture = event({ google_event_id: googleId, google_calendar_id: 'primary', google_sync_status: 'synced' })
  const mock = await mockEventDetails(context, [fixture], true)
  mock.setError(fixture.id, 'google_event_missing', 'O evento não existe mais no Google Calendar. Sincronize novamente.')
  await openDetails(page)
  await page.getByRole('button', { name: 'Atualizar no Google' }).click()
  await expect(page.getByRole('button', { name: 'Adicionar ao Google Calendar' })).toBeVisible()
  await expect(page.getByRole('status')).toContainText('O evento não existe mais no Google Calendar.')
  expect(mock.events[0]?.google_event_id).toBeNull()
})

test('lote seleciona eventos pendentes, mantém atualizados fora da seleção padrão e informa falha parcial', async ({ page, context }) => {
  const pending = event({ titulo: 'Inscrição' })
  const synced = event({ titulo: 'Prova', google_event_id: `remote-${randomUUID()}`, google_sync_status: 'synced' })
  const completed = event({ titulo: 'Matrícula', concluido: true })
  const successful = event({ titulo: 'Resultado final' })
  const mock = await mockEventDetails(context, [pending, synced, completed, successful], true)
  mock.setFailedIds([pending.id])
  await openDetails(page)
  await page.getByRole('button', { name: 'Sincronizar cronograma' }).click()
  const dialog = page.getByRole('dialog', { name: 'Sincronizar com Google Calendar' })
  await expect(dialog.getByRole('checkbox', { name: /^Inscrição Inscrição/ })).toBeChecked()
  await expect(dialog.getByRole('checkbox', { name: /^Prova Inscrição/ })).not.toBeChecked()
  await expect(dialog.getByRole('checkbox', { name: /^Matrícula Inscrição/ })).not.toBeChecked()
  await expect(dialog.getByRole('checkbox', { name: /^Resultado final Inscrição/ })).toBeChecked()
  await dialog.getByRole('button', { name: /Sincronizar selecionados/ }).click()
  await expect(dialog.getByRole('status')).toContainText('1 sincronizado. 1 falhou')
  expect(mock.syncRequests).toEqual([[pending.id, successful.id]])
})

test('excluir evento vinculado oferece excluir apenas local ou também no Google', async ({ page, context }) => {
  const googleId = `remote-${randomUUID()}`
  const fixture = event({ google_event_id: googleId, google_calendar_id: 'primary', google_sync_status: 'synced' })
  const mock = await mockEventDetails(context, [fixture], true)
  await openDetails(page)
  await expect(page.getByRole('button', { name: 'Sincronizar cronograma' })).toBeVisible()
  await page.getByRole('article').getByRole('button', { name: 'Excluir', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Excluir evento' })
  await expect(dialog).toContainText('Este evento também está no Google Calendar.')
  await dialog.getByRole('button', { name: 'Excluir do Google e do EditalTrack' }).click()
  await expect(page.getByText('Nenhum evento cadastrado')).toBeVisible()
  expect(mock.deletedEvents).toEqual([fixture.id])
  expect(mock.events).toHaveLength(0)
})

test('excluir somente no EditalTrack não chama remoção Google', async ({ page, context }) => {
  const googleId = `remote-${randomUUID()}`
  const fixture = event({ google_event_id: googleId, google_calendar_id: 'primary', google_sync_status: 'synced' })
  const mock = await mockEventDetails(context, [fixture], true)
  await openDetails(page)
  await page.getByRole('article').getByRole('button', { name: 'Excluir', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Excluir evento' })
  await dialog.getByRole('button', { name: 'Excluir apenas do EditalTrack' }).click()
  await expect(page.getByText('Nenhum evento cadastrado')).toBeVisible()
  expect(mock.deletedEvents).toHaveLength(0)
  expect(mock.events).toHaveLength(0)
})

test('falha ao remover remoto impede exclusão interna quando usuário escolheu excluir ambos', async ({ page, context }) => {
  const googleId = `remote-${randomUUID()}`
  const fixture = event({ google_event_id: googleId, google_calendar_id: 'primary', google_sync_status: 'synced' })
  const mock = await mockEventDetails(context, [fixture], true)
  mock.setDeleteFails()
  await openDetails(page)
  await page.getByRole('article').getByRole('button', { name: 'Excluir', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Excluir evento' })
  await dialog.getByRole('button', { name: 'Excluir do Google e do EditalTrack' }).click()
  await expect(dialog.getByRole('alert')).toContainText('O evento interno foi mantido')
  expect(mock.events).toHaveLength(1)
  expect(mock.events[0]?.google_event_id).toBe(googleId)
})
