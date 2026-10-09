import { randomBytes, randomUUID } from 'node:crypto'
import { test, expect, type Page, type Route } from '@playwright/test'

const restUrl = 'https://auth.editaltrack.test/rest/v1'
const email = 'pessoa@example.test'
const password = () => randomBytes(18).toString('base64url')
const userId = randomUUID()

const user = {
  id: userId,
  aud: 'authenticated',
  role: 'authenticated',
  email,
  email_confirmed_at: new Date().toISOString(),
  app_metadata: { provider: 'email', providers: ['email'] },
  user_metadata: { name: 'Pessoa de Teste' },
  identities: [{ id: randomUUID(), provider: 'email' }],
  created_at: new Date().toISOString(),
}

function session() {
  const expiresAt = Math.floor(Date.now() / 1000) + 3600
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url')
  return {
    access_token: `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: user.id, aud: 'authenticated', exp: expiresAt, iat: expiresAt - 3600 })}.${randomBytes(32).toString('base64url')}`,
    refresh_token: randomUUID(),
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: expiresAt,
    user,
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

// Estado em memória para simular o banco de dados
let editaisDb: Array<Record<string, unknown>> = []

function makeEdital(overrides: Record<string, unknown> = {}) {
  return {
    id: randomUUID(),
    user_id: userId,
    titulo: 'PPGCC UEMA 2027',
    numero_edital: '001/2027',
    instituicao: 'UEMA',
    categoria: 'Mestrado',
    cargo_curso: null,
    descricao: null,
    cidade: 'São Luís',
    estado: 'MA',
    modalidade: 'presencial',
    link_pagina: null,
    link_inscricao: null,
    link_pdf: null,
    valor_inscricao: null,
    possui_isencao: false,
    status: 'encontrado',
    favorito: false,
    observacoes: null,
    inscricao_realizada: false,
    data_inscricao_realizada: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  }
}

async function login(page: Page) {
  await page.goto('/login')
  await page.getByLabel('E-mail', { exact: true }).fill(email)
  await page.getByLabel('Senha', { exact: true }).fill(password())
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(page).toHaveURL('/dashboard')
}

test.beforeEach(async ({ context }) => {
  editaisDb = []

  await context.route('https://auth.editaltrack.test/**', async (route) => {
    const url = new URL(route.request().url())
    if (url.pathname.endsWith('/token')) return reply(route, session())
    if (url.pathname.endsWith('/user')) return reply(route, { data: { user }, error: null })
    if (url.pathname.endsWith('/signup')) return reply(route, { data: { user }, error: null })
    if (url.pathname.endsWith('/recover')) return reply(route, {})
    if (url.pathname.endsWith('/logout')) return route.fulfill({ status: 204 })
    return route.abort('blockedbyclient')
  })

  await context.route(`${restUrl}/editais**`, async (route) => {
    const method = route.request().method()
    if (method === 'GET') {
      const url = new URL(route.request().url())
      const idParam = url.searchParams.get('id')
      let id = idParam
      if (idParam?.startsWith('eq.')) {
        id = idParam.slice(3)
      }
      if (id) {
        const edital = editaisDb.find((e) => e.id === id)
        return reply(route, edital ? [edital] : [])
      }
      return reply(route, editaisDb)
    }
    if (method === 'POST') {
      const body = route.request().postDataJSON() as Record<string, unknown>
      const edital = makeEdital(body)
      editaisDb.push(edital)
      return reply(route, edital, 201)
    }
    if (method === 'PATCH') {
      const body = route.request().postDataJSON() as Record<string, unknown>
      const url = new URL(route.request().url())
      const id = url.searchParams.get('id')?.split('.')[1]
      const index = editaisDb.findIndex((e) => e.id === id)
      if (index >= 0) {
        editaisDb[index] = { ...editaisDb[index], ...body }
        return reply(route, [editaisDb[index]])
      }
      return reply(route, [], 404)
    }
    if (method === 'DELETE') {
      const url = new URL(route.request().url())
      const id = url.searchParams.get('id')?.split('.')[1]
      const index = editaisDb.findIndex((e) => e.id === id)
      if (index >= 0) {
        editaisDb.splice(index, 1)
        return reply(route, [{ id }])
      }
      return reply(route, [], 404)
    }
    return route.abort('blockedbyclient')
  })
})

test('formulário exige título, instituição e categoria', async ({ page }) => {
  await login(page)
  await page.goto('/editais/novo')
  await page.getByRole('button', { name: 'Cadastrar edital', exact: true }).click()
  await expect(page.getByText('Informe o título do edital.')).toBeVisible()
  await expect(page.getByText('Informe a instituição.')).toBeVisible()
  await expect(page.getByText('Selecione uma categoria.')).toBeVisible()
})

test('URL inválida gera erro no formulário', async ({ page }) => {
  await login(page)
  await page.goto('/editais/novo')
  await page.getByLabel('Título *', { exact: true }).fill('PPGCC UEMA 2027')
  await page.getByLabel('Instituição *', { exact: true }).fill('UEMA')
  await page.getByLabel('Categoria *', { exact: true }).selectOption('Mestrado')
  await page.getByLabel('Link da página oficial', { exact: true }).fill('url-invalida')
  await page.getByRole('button', { name: 'Cadastrar edital', exact: true }).click()
  await expect(page.getByText('Informe uma URL válida começando com https:// ou http://.')).toBeVisible()
})

test('criação de edital com dados mínimos redireciona para detalhes', async ({ page }) => {
  await login(page)
  await page.goto('/editais/novo')
  await page.getByLabel('Título *', { exact: true }).fill('PPGCC UEMA 2027')
  await page.getByLabel('Instituição *', { exact: true }).fill('UEMA')
  await page.getByLabel('Categoria *', { exact: true }).selectOption('Mestrado')
  await page.getByRole('button', { name: 'Cadastrar edital', exact: true }).click()
  await expect(page).toHaveURL(/\/editais\/[0-9a-f-]{36}/)
  await expect(page.getByRole('heading', { name: 'PPGCC UEMA 2027' })).toBeVisible()
  await expect(page.getByRole('status')).toHaveText('Edital cadastrado com sucesso.')
})

test('listagem exibe editais cadastrados', async ({ page }) => {
  editaisDb.push(makeEdital())
  await login(page)
  await page.goto('/editais')
  await expect(page.getByText('PPGCC UEMA 2027')).toBeVisible()
  await expect(page.getByText('UEMA', { exact: true })).toBeVisible()
  await expect(page.locator('.edital-card-categoria', { hasText: 'Mestrado' })).toBeVisible()
})

test('edição de edital atualiza dados', async ({ page }) => {
  const edital = makeEdital()
  editaisDb.push(edital)
  await login(page)
  await page.goto(`/editais/${edital.id}/editar`)
  await page.getByLabel('Título *', { exact: true }).fill('PPGCC UEMA 2028')
  await page.getByRole('button', { name: 'Salvar alterações', exact: true }).click()
  await expect(page).toHaveURL(`/editais/${edital.id}`)
  await expect(page.getByRole('heading', { name: 'PPGCC UEMA 2028' })).toBeVisible()
  await expect(page.getByRole('status')).toHaveText('Edital atualizado com sucesso.')
})

test('favoritar edital atualiza estado', async ({ page }) => {
  const edital = makeEdital()
  editaisDb.push(edital)
  await login(page)
  await page.goto(`/editais/${edital.id}`)
  await page.getByRole('button', { name: 'Favoritar', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Favorito', exact: true })).toBeVisible()
})

test('exclusão de edital remove da listagem', async ({ page }) => {
  const edital = makeEdital()
  editaisDb.push(edital)
  await login(page)
  await page.goto(`/editais/${edital.id}`)
  await page.getByRole('button', { name: 'Excluir', exact: true }).click()
  await expect(page.getByText('Tem certeza que deseja excluir este edital?')).toBeVisible()
  await page.getByRole('button', { name: 'Excluir edital', exact: true }).click()
  await expect(page).toHaveURL('/editais')
  await expect(page.getByText('Nenhum edital cadastrado.')).toBeVisible()
})

test('rota protegida redireciona para login', async ({ page }) => {
  await page.goto('/editais')
  await expect(page).toHaveURL('/login')
})

test('edital inexistente mostra mensagem de não encontrado', async ({ page }) => {
  await login(page)
  await page.goto(`/editais/${randomUUID()}`)
  await expect(page.getByText('Edital não encontrado.')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Voltar para meus editais' })).toBeVisible()
})

test('busca filtra editais por título', async ({ page }) => {
  editaisDb.push(makeEdital({ titulo: 'PPGCC UEMA 2027' }))
  editaisDb.push(makeEdital({ titulo: 'Concurso IFMA 2027' }))
  await login(page)
  await page.goto('/editais')
  await page.getByPlaceholder('Buscar editais...').fill('PPGCC')
  await expect(page.getByText('PPGCC UEMA 2027')).toBeVisible()
  await expect(page.getByText('Concurso IFMA 2027')).toHaveCount(0)
})

test('filtro por categoria exibe apenas editais correspondentes', async ({ page }) => {
  editaisDb.push(makeEdital({ categoria: 'Mestrado' }))
  editaisDb.push(makeEdital({ categoria: 'Doutorado' }))
  await login(page)
  await page.goto('/editais')
  await page.getByRole('button', { name: /Filtros/ }).click()
  await page.locator('.edital-filter-grid label', { hasText: 'Categoria' }).locator('select').selectOption('Mestrado')
  // Verifica que o card de Mestrado está visível (não a option do select)
  await expect(page.locator('.edital-card-categoria', { hasText: 'Mestrado' })).toBeVisible()
  await expect(page.locator('.edital-card-categoria', { hasText: 'Doutorado' })).toHaveCount(0)
})

test('arquivar edital altera status para arquivado', async ({ page }) => {
  const edital = makeEdital()
  editaisDb.push(edital)
  await login(page)
  await page.goto(`/editais/${edital.id}`)
  await page.getByRole('button', { name: 'Arquivar', exact: true }).click()
  await expect(page.getByText('Arquivado')).toBeVisible()
})
