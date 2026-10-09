import { randomBytes, randomUUID } from 'node:crypto'
import { test, expect, type Page, type Route } from '@playwright/test'

const restUrl = 'https://auth.editaltrack.test/rest/v1'
const email = 'dashboard@example.test'
const userId = randomUUID()
const now = new Date()
const date = (days: number) => new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString()
const user = {
  id: userId,
  aud: 'authenticated',
  role: 'authenticated',
  email,
  email_confirmed_at: new Date().toISOString(),
  app_metadata: { provider: 'email', providers: ['email'] },
  user_metadata: { name: 'Thiago Silva' },
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

function makeEdital(overrides: Record<string, unknown> = {}) {
  return {
    id: randomUUID(), user_id: userId, titulo: 'PPGCC UEMA', numero_edital: null, instituicao: 'UEMA',
    categoria: 'Mestrado', cargo_curso: null, descricao: null, cidade: null, estado: null, modalidade: null,
    link_pagina: null, link_inscricao: null, link_pdf: null, valor_inscricao: null, possui_isencao: false,
    status: 'encontrado', favorito: false, observacoes: null, inscricao_realizada: false,
    data_inscricao_realizada: null, created_at: date(-1), updated_at: date(-1), ...overrides,
  }
}

async function login(page: Page) {
  await page.goto('/login')
  await page.getByLabel('E-mail', { exact: true }).fill(email)
  await page.getByLabel('Senha', { exact: true }).fill(randomBytes(18).toString('base64url'))
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(page).toHaveURL('/dashboard')
}

test.beforeEach(async ({ context }) => {
  await context.route('https://auth.editaltrack.test/**', async (route) => {
    const url = new URL(route.request().url())
    if (url.pathname.endsWith('/token')) return reply(route, session())
    if (url.pathname.endsWith('/user')) return reply(route, { data: { user }, error: null })
    if (url.pathname.endsWith('/logout')) return route.fulfill({ status: 204 })
    return route.abort('blockedbyclient')
  })
})

test('mostra estado vazio com orientação para cadastrar o primeiro edital', async ({ page, context }) => {
  await context.route(`${restUrl}/editais**`, (route) => reply(route, []))
  await context.route(`${restUrl}/eventos_edital**`, (route) => reply(route, []))
  await context.route(`${restUrl}/documentos_edital**`, (route) => reply(route, []))

  await login(page)
  await expect(page.getByRole('heading', { name: 'Olá, Thiago' })).toBeVisible()
  await expect(page.getByText('Seu acompanhamento começa aqui.')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Novo edital' }).first()).toBeVisible()
})

test('agrega inscrições, documentos, resultados sem duplicar editais e listas de ação', async ({ page, context }) => {
  const openId = randomUUID()
  const awaitingId = randomUUID()
  const analyzeId = randomUUID()
  const editais = [
    makeEdital({ id: openId, titulo: 'PPGCC UEMA', status: 'vou_participar', favorito: true }),
    makeEdital({ id: awaitingId, titulo: 'Residência TJMA', status: 'aguardando_resultado' }),
    makeEdital({ id: analyzeId, titulo: 'Especialização IA IFMA', status: 'encontrado' }),
  ]

  await context.route(`${restUrl}/editais**`, (route) => reply(route, editais))
  const eventos = [
    { id: randomUUID(), user_id: userId, edital_id: openId, titulo: 'Fim das inscrições', tipo: 'inscricao', data_inicio: date(-2), data_fim: date(2), dia_inteiro: true, descricao: null, concluido: false, created_at: date(-3), updated_at: date(-3), editais: { titulo: 'PPGCC UEMA', numero_edital: null, categoria: 'Mestrado' } },
    { id: randomUUID(), user_id: userId, edital_id: openId, titulo: 'Resultado final', tipo: 'resultado_final', data_inicio: date(5), data_fim: null, dia_inteiro: true, descricao: null, concluido: false, created_at: date(-3), updated_at: date(-3), editais: { titulo: 'PPGCC UEMA', numero_edital: null, categoria: 'Mestrado' } },
    { id: randomUUID(), user_id: userId, edital_id: awaitingId, titulo: 'Resultado preliminar', tipo: 'resultado_preliminar', data_inicio: date(6), data_fim: null, dia_inteiro: true, descricao: null, concluido: false, created_at: date(-3), updated_at: date(-3), editais: { titulo: 'Residência TJMA', numero_edital: null, categoria: 'Residência' } },
    { id: randomUUID(), user_id: userId, edital_id: awaitingId, titulo: 'Convocação', tipo: 'convocacao', data_inicio: date(7), data_fim: null, dia_inteiro: true, descricao: null, concluido: false, created_at: date(-3), updated_at: date(-3), editais: { titulo: 'Residência TJMA', numero_edital: null, categoria: 'Residência' } },
    { id: randomUUID(), user_id: userId, edital_id: analyzeId, titulo: 'Inscrições futuras', tipo: 'inscricao', data_inicio: date(3), data_fim: null, dia_inteiro: true, descricao: null, concluido: false, created_at: date(-3), updated_at: date(-3), editais: { titulo: 'Especialização IA IFMA', numero_edital: null, categoria: 'Especialização' } },
    { id: randomUUID(), user_id: userId, edital_id: analyzeId, titulo: 'Inscrições encerradas', tipo: 'inscricao', data_inicio: date(-5), data_fim: date(-1), dia_inteiro: true, descricao: null, concluido: false, created_at: date(-6), updated_at: date(-6), editais: { titulo: 'Especialização IA IFMA', numero_edital: null, categoria: 'Especialização' } },
    { id: randomUUID(), user_id: userId, edital_id: analyzeId, titulo: 'Etapa concluída', tipo: 'inscricao', data_inicio: date(1), data_fim: date(2), dia_inteiro: true, descricao: null, concluido: true, created_at: date(-6), updated_at: date(-6), editais: { titulo: 'Especialização IA IFMA', numero_edital: null, categoria: 'Especialização' } },
    { id: randomUUID(), user_id: userId, edital_id: analyzeId, titulo: 'Inscrição sem período definido', tipo: 'inscricao', data_inicio: date(-2), data_fim: null, dia_inteiro: true, descricao: null, concluido: false, created_at: date(-6), updated_at: date(-6), editais: { titulo: 'Especialização IA IFMA', numero_edital: null, categoria: 'Especialização' } },
  ]
  await context.route(`${restUrl}/eventos_edital**`, (route) => {
    const url = new URL(route.request().url())
    const filtered = eventos.filter((event) => url.searchParams.get('concluido') !== 'eq.false' || event.concluido === false)
    return reply(route, filtered)
  })
  const documentos = [
    { id: randomUUID(), edital_id: openId, nome: 'Carta de intenção', obrigatorio: true, providenciado: false, editais: { titulo: 'PPGCC UEMA', numero_edital: null } },
    { id: randomUUID(), edital_id: openId, nome: 'Projeto de pesquisa', obrigatorio: true, providenciado: false, editais: { titulo: 'PPGCC UEMA', numero_edital: null } },
    { id: randomUUID(), edital_id: openId, nome: 'Documento opcional', obrigatorio: false, providenciado: false, editais: { titulo: 'PPGCC UEMA', numero_edital: null } },
    { id: randomUUID(), edital_id: openId, nome: 'Documento já providenciado', obrigatorio: true, providenciado: true, editais: { titulo: 'PPGCC UEMA', numero_edital: null } },
  ]
  await context.route(`${restUrl}/documentos_edital**`, (route) => {
    const url = new URL(route.request().url())
    const filtered = documentos.filter((documento) => {
      const mandatory = url.searchParams.get('obrigatorio') !== 'eq.true' || documento.obrigatorio
      const pending = url.searchParams.get('providenciado') !== 'eq.false' || !documento.providenciado
      return mandatory && pending
    })
    return reply(route, filtered)
  })

  await login(page)
  await expect(page.getByRole('link').filter({ hasText: 'Inscrições abertas' }).getByText('1', { exact: true })).toBeVisible()
  await expect(page.getByRole('link').filter({ hasText: 'Documentos pendentes' }).getByText('2', { exact: true })).toBeVisible()
  await expect(page.getByRole('link').filter({ hasText: 'Aguardando resultado' }).getByText('2', { exact: true })).toBeVisible()
  await expect(page.getByText('2 documentos obrigatórios pendentes')).toBeVisible()
  const deadlines = page.getByRole('region', { name: 'Próximos prazos' }).getByRole('list').getByRole('link')
  await expect(deadlines.first()).toContainText('Fim das inscrições')
  await expect(deadlines.nth(1)).toContainText('Inscrições futuras')
  const resultsSection = page.getByRole('region', { name: 'Aguardando resultado' })
  await expect(resultsSection.getByText('Resultado final')).toBeVisible()
  await expect(resultsSection.getByText('Resultado preliminar')).toBeVisible()
  await expect(resultsSection.getByText('Convocação')).toHaveCount(0)
  await expect(page.getByText('Carta de intenção')).toBeVisible()
  await expect(page.getByText('Projeto de pesquisa')).toBeVisible()
  await expect(page.getByText('Documento opcional')).toHaveCount(0)
  await expect(page.getByText('Documento já providenciado')).toHaveCount(0)
  await expect(page.getByRole('region', { name: 'Para analisar' }).getByText('Especialização IA IFMA')).toBeVisible()
})
