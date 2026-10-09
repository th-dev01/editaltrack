import { randomBytes, randomUUID } from 'node:crypto'
import { test, expect, type BrowserContext, type Page, type Route } from '@playwright/test'

const restUrl = 'https://auth.editaltrack.test/rest/v1'
const email = 'calendar@example.test'
const userId = randomUUID()
const editalId = randomUUID()
const fortaleza = 'America/Fortaleza'
const user = {
  id: userId,
  aud: 'authenticated',
  role: 'authenticated',
  email,
  email_confirmed_at: new Date().toISOString(),
  app_metadata: { provider: 'email', providers: ['email'] },
  user_metadata: { name: 'Pessoa do Calendário' },
  identities: [{ id: randomUUID(), provider: 'email' }],
  created_at: new Date().toISOString(),
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
    status,
    contentType: 'application/json',
    headers: { 'x-supabase-api-version': '2024-01-01', 'access-control-expose-headers': 'x-supabase-api-version' },
    body: JSON.stringify(body),
  })
}

function centralDate(offsetDays = 0, hour = 9, minute = 30): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: fortaleza, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date())
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]))
  const date = new Date(Date.UTC(Number(values.year), Number(values.month) - 1, Number(values.day) + offsetDays, hour + 3, minute))
  return date.toISOString()
}

function monthLabel(date = new Date()): string {
  const label = new Intl.DateTimeFormat('pt-BR', { timeZone: fortaleza, month: 'long', year: 'numeric' }).format(date)
  return label.charAt(0).toLocaleUpperCase('pt-BR') + label.slice(1)
}

function monthLabelOffset(offset: number): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: fortaleza, year: 'numeric', month: '2-digit' }).formatToParts(new Date())
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]))
  return monthLabel(new Date(Date.UTC(Number(values.year), Number(values.month) - 1 + offset, 15, 12)))
}

function makeEvent(overrides: Record<string, unknown> = {}) {
  return {
    id: randomUUID(), user_id: userId, edital_id: editalId, titulo: 'Prova objetiva', tipo: 'prova',
    data_inicio: centralDate(), data_fim: null, dia_inteiro: false, descricao: 'Levar documento com foto.',
    concluido: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    editais: { titulo: 'PPGCC UEMA', numero_edital: '01/2026', instituicao: 'UEMA' },
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

async function mockCalendar(context: BrowserContext, initialEvents: Array<Record<string, unknown>>) {
  const events = initialEvents
  await context.route('https://auth.editaltrack.test/**', async (route) => {
    const url = new URL(route.request().url())
    if (url.pathname.endsWith('/token')) return reply(route, session())
    if (url.pathname.endsWith('/user')) return reply(route, { data: { user }, error: null })
    if (url.pathname.endsWith('/logout')) return route.fulfill({ status: 204 })
    return route.abort('blockedbyclient')
  })
  await context.route(`${restUrl}/editais**`, (route) => reply(route, [{
    id: editalId, user_id: userId, titulo: 'PPGCC UEMA', numero_edital: '01/2026', instituicao: 'UEMA',
    categoria: 'Mestrado', cargo_curso: null, descricao: null, cidade: null, estado: 'MA', modalidade: null,
    link_pagina: null, link_inscricao: null, link_pdf: null, valor_inscricao: null, possui_isencao: false,
    status: 'encontrado', favorito: false, observacoes: null, inscricao_realizada: false,
    data_inscricao_realizada: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  }]))
  await context.route(`${restUrl}/eventos_edital**`, async (route) => {
    const method = route.request().method()
    if (method === 'GET') return reply(route, events)
    if (method === 'POST') {
      const body = route.request().postDataJSON() as Record<string, unknown>
      const event = makeEvent({ ...body, editais: { titulo: 'PPGCC UEMA', numero_edital: '01/2026', instituicao: 'UEMA' } })
      events.push(event)
      return reply(route, event, 201)
    }
    if (method === 'PATCH') {
      const id = new URL(route.request().url()).searchParams.get('id')?.replace('eq.', '')
      const body = route.request().postDataJSON() as Record<string, unknown>
      const index = events.findIndex((event) => event.id === id)
      if (index < 0) return reply(route, { message: 'Evento não encontrado' }, 404)
      events[index] = { ...events[index], ...body }
      return reply(route, events[index])
    }
    return route.abort('blockedbyclient')
  })
  return events
}

test('abre no mês atual, navega entre meses e volta para hoje', async ({ page, context }) => {
  await mockCalendar(context, [])
  await login(page)
  await page.goto('/calendario')

  const initial = monthLabel()
  await expect(page.getByRole('heading', { name: initial })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Mês anterior' })).toBeVisible()
  await page.getByRole('button', { name: 'Mês anterior' }).click()
  await expect(page.getByRole('heading', { name: monthLabelOffset(-1) })).toBeVisible()
  await page.getByRole('button', { name: 'Próximo mês' }).click()
  await expect(page.getByRole('heading', { name: initial })).toBeVisible()
  await page.getByRole('button', { name: 'Próximo mês' }).click()
  await expect(page.getByRole('heading', { name: monthLabelOffset(1) })).toBeVisible()
  await page.getByRole('button', { name: 'Hoje' }).click()
  await expect(page.getByRole('heading', { name: initial })).toBeVisible()
})

test('lista mostra tipo, edital, data/hora e abre os detalhes do evento', async ({ page, context }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  const event = makeEvent()
  await mockCalendar(context, [event])
  await login(page)
  await page.goto('/calendario')
  const todayParts = new Intl.DateTimeFormat('en-CA', { timeZone: fortaleza, year: 'numeric', month: '2-digit', day: '2-digit' })
    .formatToParts(new Date())
  const todayDate = Object.fromEntries(todayParts.map(({ type, value }) => [type, value]))
  const monthEventDay = page.locator(`[data-date="${todayDate.year}-${todayDate.month}-${todayDate.day}"]`)
  await page.getByRole('button', { name: 'Mês', exact: true }).click()
  await expect(monthEventDay.getByRole('button', { name: /Prova objetiva/ })).toBeVisible()
  await page.getByRole('button', { name: 'Lista', exact: true }).click()

  const eventButton = page.getByRole('button', { name: /Prova objetiva.*PPGCC UEMA/ })
  await expect(eventButton).toContainText('Prova')
  await expect(eventButton).toContainText('09:30')
  await eventButton.click()
  await expect(page.getByRole('dialog')).toContainText('Levar documento com foto.')
  await expect(page.getByRole('link', { name: 'Abrir edital' })).toHaveAttribute('href', `/editais/${editalId}`)
  await expect(page.getByRole('button', { name: 'Editar evento' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Marcar concluído' })).toBeVisible()
  await page.getByRole('button', { name: 'Editar evento' }).click()
  await page.getByLabel('Título *').fill('Prova atualizada')
  await page.getByRole('button', { name: 'Salvar alterações' }).click()
  await expect(page.getByRole('button', { name: /Prova atualizada/ })).toBeVisible()
})

test('filtra tipo e status, e conclui evento pelo detalhe rápido', async ({ page, context }) => {
  const pending = makeEvent()
  const completed = makeEvent({ id: randomUUID(), titulo: 'Resultado final', tipo: 'resultado_final', concluido: true, data_inicio: centralDate(1) })
  await mockCalendar(context, [pending, completed])
  await login(page)
  await page.goto('/calendario')
  await page.getByRole('button', { name: 'Lista', exact: true }).click()
  await page.getByLabel('Filtrar por tipo').selectOption('prova')
  await expect(page.getByRole('button', { name: /Prova objetiva/ })).toBeVisible()
  await expect(page.locator('.calendar-list-view').getByText('Resultado final')).toHaveCount(0)
  await page.getByLabel('Filtrar por tipo').selectOption('')
  await page.getByLabel('Filtrar por status').selectOption('completed')
  await expect(page.getByRole('button', { name: /Resultado final/ })).toBeVisible()
  await page.getByLabel('Filtrar por status').selectOption('pending')
  await page.getByRole('button', { name: /Prova objetiva/ }).click()
  await page.getByRole('button', { name: 'Marcar concluído' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.getByLabel('Filtrar por status').selectOption('completed')
  await expect(page.getByRole('button', { name: /Prova objetiva/ })).toBeVisible()
})

test('cria evento pelo calendário reutilizando o formulário e o edital selecionado', async ({ page, context }) => {
  const events = await mockCalendar(context, [])
  await login(page)
  await page.goto('/calendario')
  await page.getByRole('button', { name: 'Novo evento', exact: true }).first().click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.getByLabel('Título *').fill('Inscrição para seleção')
  await page.getByLabel('Tipo *').selectOption('inscricao')
  await page.getByLabel('Edital *').selectOption(editalId)
  await page.getByLabel('Data de início *').fill('2026-09-29')
  await page.getByLabel('Data de fim').fill('2026-10-13')
  await page.getByLabel('Como lembrar?').selectOption('frequencia')
  await expect(page.getByText('29/09, 30/09, 02/10, 04/10, 06/10, 08/10, 10/10, 12/10, 13/10')).toBeVisible()
  await page.getByRole('button', { name: 'Criar evento' }).click()
  await expect(page.getByText('Inscrição para seleção')).toBeVisible()
  expect(events.at(-1)?.lembrete_modo).toBe('frequencia')
  expect(events.at(-1)?.lembrete_intervalo_dias).toBe(2)
  expect(events.at(-1)?.lembrete_datas).toEqual([])
})

test('evento de inscrição permite marcar datas específicas e inclui os extremos do período', async ({ page, context }) => {
  const events = await mockCalendar(context, [])
  await login(page)
  await page.goto('/calendario')
  await page.getByRole('button', { name: 'Novo evento', exact: true }).first().click()
  await page.getByLabel('Título *').fill('Período de inscrições')
  await page.getByLabel('Tipo *').selectOption('inscricao')
  await page.getByLabel('Edital *').selectOption(editalId)
  await page.getByLabel('Data de início *').fill('2026-09-29')
  await page.getByLabel('Data de fim').fill('2026-10-13')
  await page.getByLabel('Como lembrar?').selectOption('datas')
  await page.getByLabel('ter., 06/10').check()
  await page.getByRole('button', { name: 'Criar evento' }).click()
  await expect(page.getByText('Período de inscrições')).toBeVisible()
  expect(events.at(-1)?.lembrete_modo).toBe('datas')
  expect(events.at(-1)?.lembrete_datas).toEqual(['2026-09-29', '2026-10-06', '2026-10-13'])
})

test('estado vazio informa que não há eventos no período e funciona em viewport mobile', async ({ page, context }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await mockCalendar(context, [])
  await login(page)
  await page.goto('/calendario')
  await expect(page.getByRole('button', { name: 'Lista', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByText('Nenhum evento neste período.')).toBeVisible()
  await expect(page.getByText('Adicione datas importantes aos seus editais para visualizá-las aqui.')).toBeVisible()
})
