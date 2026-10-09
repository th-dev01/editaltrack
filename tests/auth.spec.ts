import { randomBytes, randomUUID } from 'node:crypto'
import { test, expect, type Page, type Route } from '@playwright/test'

const authUrl = 'https://auth.editaltrack.test/auth/v1'
const email = 'pessoa@example.test'
// Valores descartáveis, criados só em memória e sem validade em serviços reais.
const password = () => randomBytes(18).toString('base64url')
const user = {
  id: randomUUID(),
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

async function login(page: Page) {
  await page.goto('/login')
  await page.getByLabel('E-mail', { exact: true }).fill(email)
  await page.getByLabel('Senha', { exact: true }).fill(password())
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(page).toHaveURL('/dashboard')
}

test.beforeEach(async ({ context }) => {
  await context.route('https://auth.editaltrack.test/**', async (route) => {
    const url = new URL(route.request().url())
    if (url.pathname.endsWith('/token')) return reply(route, session())
    if (url.pathname.endsWith('/user')) return reply(route, user)
    if (url.pathname.endsWith('/signup')) return reply(route, user)
    if (url.pathname.endsWith('/recover')) return reply(route, {})
    if (url.pathname.endsWith('/logout')) return route.fulfill({ status: 204 })
    // Nenhuma requisição do teste pode alcançar um serviço externo.
    return route.abort('blockedbyclient')
  })
})

test('protege todas as telas privadas e mantém rotas públicas acessíveis', async ({ page }) => {
  // Esta verificação navega por todas as rotas lazy em série; dá margem ao primeiro carregamento no CI.
  test.setTimeout(60_000)
  for (const route of ['/', '/dashboard', '/editais', '/editais/novo', '/editais/exemplo', '/editais/exemplo/editar', '/calendario', '/configuracoes']) {
    await page.goto(route)
    await expect(page).toHaveURL('/login')
    await expect(page.getByRole('button', { name: 'Entrar', exact: true })).toBeVisible()
    await expect(page.locator('.desktop-sidebar')).toHaveCount(0)
  }
  for (const route of ['/cadastro', '/esqueci-senha', '/redefinir-senha']) {
    await page.goto(route)
    await expect(page.locator('h1')).toBeVisible()
    await expect(page).toHaveURL(route)
  }
  await page.goto('/recuperar-senha')
  await expect(page).toHaveURL('/esqueci-senha')
})

test('valida cadastro antes de enviar, preservando foco e acessibilidade', async ({ page }) => {
  let requests = 0
  page.on('request', (request) => { if (request.url().startsWith(authUrl)) requests++ })
  await page.goto('/cadastro')
  await page.getByRole('button', { name: 'Criar conta', exact: true }).click()
  await expect(page.getByText('Informe seu nome.')).toBeVisible()
  await expect(page.getByLabel('Nome', { exact: true })).toBeFocused()
  await page.getByLabel('Nome', { exact: true }).fill('   ')
  await page.getByLabel('E-mail', { exact: true }).fill('invalido')
  await page.getByLabel('Senha', { exact: true }).fill(password().slice(0, 7))
  await page.getByLabel('Confirmar senha', { exact: true }).fill(password())
  await page.getByRole('button', { name: 'Criar conta', exact: true }).click()
  await expect(page.getByText('Informe um e-mail válido.')).toBeVisible()
  await expect(page.getByText('A senha deve ter pelo menos 8 caracteres.')).toBeVisible()
  await expect(page.getByText('As senhas devem ser iguais.')).toBeVisible()
  expect(requests).toBe(0)
})

test('cadastro envia nome nos metadados, bloqueia envio duplo e pede confirmação', async ({ page }) => {
  let release = () => {}
  const pending = new Promise<void>((resolve) => { release = resolve })
  let calls = 0
  await page.route(`${authUrl}/signup**`, async (route) => {
    calls++
    const body = route.request().postDataJSON() as { data: { name: string }; email: string }
    expect(body.data.name).toBe('Pessoa de Teste')
    expect(body.email).toBe(email)
    expect(new URL(route.request().url()).searchParams.get('redirect_to')).toBe('http://localhost:5180/dashboard')
    await pending
    await reply(route, user)
  })
  await page.goto('/cadastro')
  await page.getByLabel('Nome', { exact: true }).fill('  Pessoa de Teste  ')
  await page.getByLabel('E-mail', { exact: true }).fill(email)
  const value = password()
  await page.getByLabel('Senha', { exact: true }).fill(value)
  await page.getByLabel('Confirmar senha', { exact: true }).fill(value)
  await page.getByRole('button', { name: 'Criar conta', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Criando conta…' })).toBeDisabled()
  await page.keyboard.press('Enter')
  expect(calls).toBe(1)
  release()
  await expect(page.getByRole('status')).toHaveText('Cadastro realizado. Verifique seu e-mail para confirmar sua conta.')
  await expect(page).toHaveURL('/cadastro')
})

test('cadastro sem confirmação autentica imediatamente', async ({ page }) => {
  await page.route(`${authUrl}/signup**`, (route) => reply(route, session()))
  await page.goto('/cadastro')
  await page.getByLabel('Nome', { exact: true }).fill('Pessoa de Teste')
  await page.getByLabel('E-mail', { exact: true }).fill(email)
  const value = password()
  await page.getByLabel('Senha', { exact: true }).fill(value)
  await page.getByLabel('Confirmar senha', { exact: true }).fill(value)
  await page.getByRole('button', { name: 'Criar conta', exact: true }).click()
  await expect(page).toHaveURL('/dashboard')
})

test('cadastro duplicado é traduzido inclusive quando o SDK retorna identities vazio', async ({ page }) => {
  await page.route(`${authUrl}/signup**`, (route) => reply(route, { ...user, identities: [] }))
  await page.goto('/cadastro')
  await page.getByLabel('Nome', { exact: true }).fill('Pessoa de Teste')
  await page.getByLabel('E-mail', { exact: true }).fill(email)
  const value = password()
  await page.getByLabel('Senha', { exact: true }).fill(value)
  await page.getByLabel('Confirmar senha', { exact: true }).fill(value)
  await page.getByRole('button', { name: 'Criar conta', exact: true }).click()
  await expect(page.getByRole('alert')).toHaveText('Já existe uma conta cadastrada com este e-mail.')
})

test('login persiste após recarga, redireciona visitantes autenticados e logout sincroniza abas', async ({ page, context }) => {
  await login(page)
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Olá, Pessoa' })).toBeVisible()
  for (const route of ['/login', '/cadastro']) {
    await page.goto(route)
    await expect(page).toHaveURL('/dashboard')
  }
  const secondTab = await context.newPage()
  await secondTab.goto('/editais')
  await expect(secondTab.getByRole('heading', { name: 'Meus editais', exact: true })).toBeVisible()
  await page.goto('/configuracoes')
  await expect(page.getByText('Pessoa de Teste', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Sair da conta' }).click()
  await expect(page).toHaveURL('/login')
  await expect(secondTab).toHaveURL('/login')
  await page.reload()
  await expect(page).toHaveURL('/login')
  await page.goto('/dashboard')
  await expect(page).toHaveURL('/login')
})

test('login traduz credenciais incorretas, e-mail não confirmado e erro de rede', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('E-mail', { exact: true }).fill(email)
  await page.getByLabel('Senha', { exact: true }).fill(password())
  for (const [code, message] of [
    ['invalid_credentials', 'E-mail ou senha incorretos.'],
    ['email_not_confirmed', 'Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada.'],
  ]) {
    await page.route(`${authUrl}/token**`, (route) => reply(route, { code, msg: 'Internal technical message' }, 400))
    await page.getByRole('button', { name: 'Entrar', exact: true }).click()
    await expect(page.getByRole('alert')).toHaveText(message!)
  }
  await page.route(`${authUrl}/token**`, (route) => route.abort('internetdisconnected'))
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(page.getByRole('alert')).toHaveText('Não foi possível conectar ao servidor. Tente novamente.')
  await expect(page.getByRole('button', { name: 'Entrar', exact: true })).toBeEnabled()
})

test('recuperação envia redirect correto e feedback sem revelar existência da conta', async ({ page }) => {
  await page.route(`${authUrl}/recover**`, async (route) => {
    expect(new URL(route.request().url()).searchParams.get('redirect_to')).toBe('http://localhost:5180/redefinir-senha')
    expect((route.request().postDataJSON() as { email: string }).email).toBe(email)
    await reply(route, {})
  })
  await page.goto('/login')
  await page.getByRole('link', { name: 'Esqueci minha senha' }).click()
  await page.getByRole('button', { name: 'Enviar link de recuperação' }).click()
  await expect(page.getByText('Informe um e-mail válido.')).toBeVisible()
  await page.getByLabel('E-mail', { exact: true }).fill(email)
  await page.getByRole('button', { name: 'Enviar link de recuperação' }).click()
  await expect(page.getByRole('status')).toContainText('Se houver uma conta com este e-mail')
})

test('redefinição sem sessão e links expirados são tratados sem expor erro técnico', async ({ page }) => {
  await page.goto('/redefinir-senha')
  await expect(page.getByRole('button', { name: 'Salvar nova senha' })).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Solicitar novo link' })).toBeVisible()
  // Um callback de e-mail chega como documento novo, não como mudança de fragmento na mesma página.
  await page.goto('/login')
  await page.goto('/redefinir-senha#error=access_denied&error_code=otp_expired&error_description=Technical+message')
  await expect(page.getByRole('alert')).toContainText('Este link expirou ou já foi utilizado.')
  await expect(page.getByText('Technical message')).toHaveCount(0)
  await expect(page).toHaveURL('/redefinir-senha')
})

test('código de recuperação digitado manualmente cria sessão e libera a redefinição', async ({ page }) => {
  const recoverySession = session()
  let verificationCalled = false
  await page.route(`${authUrl}/verify**`, async (route) => {
    const body = route.request().postDataJSON() as { email: string; token: string; type: string }
    expect(body).toMatchObject({ email, token: '123456', type: 'recovery' })
    verificationCalled = true
    await reply(route, recoverySession)
  })
  await page.goto('/redefinir-senha')
  await page.getByLabel('E-mail da conta').fill(email)
  await page.getByLabel('Código de recuperação').fill('123456')
  await page.getByRole('button', { name: 'Validar código' }).click()
  await expect(page.getByRole('button', { name: 'Salvar nova senha' })).toBeVisible()

  const newPassword = password()
  let updateCalled = false
  await page.route(`${authUrl}/user`, async (route) => {
    if (route.request().method() === 'PUT') updateCalled = true
    await reply(route, user)
  })
  await page.getByLabel('Nova senha', { exact: true }).fill(newPassword)
  await page.getByLabel('Confirmar nova senha', { exact: true }).fill(newPassword)
  await page.getByRole('button', { name: 'Salvar nova senha' }).click()
  await expect(page.getByRole('status')).toContainText('Senha redefinida com sucesso.')
  expect(verificationCalled).toBe(true)
  expect(updateCalled).toBe(true)
})

test('SDK processa link de recuperação, persiste sessão e atualiza a senha após recarga', async ({ page }) => {
  const value = session()
  const hash = new URLSearchParams({
    access_token: value.access_token,
    refresh_token: value.refresh_token,
    token_type: value.token_type,
    expires_in: String(value.expires_in),
    type: 'recovery',
  })
  await page.goto(`/redefinir-senha#${hash}`)
  await expect(page.getByRole('button', { name: 'Salvar nova senha' })).toBeVisible()
  await expect(page).toHaveURL((url) => url.pathname === '/redefinir-senha' && !url.hash)
  await page.reload()
  await expect(page.getByRole('button', { name: 'Salvar nova senha' })).toBeVisible()
  await page.getByLabel('Nova senha', { exact: true }).fill(password())
  await page.getByLabel('Confirmar nova senha', { exact: true }).fill(password())
  await page.getByRole('button', { name: 'Salvar nova senha' }).click()
  await expect(page.getByText('As senhas devem ser iguais.')).toBeVisible()
  const newPassword = password()
  let updateCalled = false
  await page.route(`${authUrl}/user`, async (route) => {
    if (route.request().method() === 'PUT') {
      updateCalled = true
      expect((route.request().postDataJSON() as { password: string }).password).toBe(newPassword)
    }
    await reply(route, user)
  })
  await page.getByLabel('Nova senha', { exact: true }).fill(newPassword)
  await page.getByLabel('Confirmar nova senha', { exact: true }).fill(newPassword)
  await page.getByRole('button', { name: 'Salvar nova senha' }).click()
  await expect(page.getByRole('status')).toContainText('Senha redefinida com sucesso.')
  expect(updateCalled).toBe(true)
  await page.getByRole('link', { name: 'Ir para o início' }).click()
  await expect(page).toHaveURL('/dashboard')
})

test('sessão expirada com refresh recusado volta para o login', async ({ page }) => {
  await login(page)
  await page.evaluate(() => {
    const key = Object.keys(localStorage).find((entry) => entry.endsWith('-auth-token'))
    if (!key) throw new Error('Sessão de teste não encontrada')
    const data = JSON.parse(localStorage.getItem(key)!) as { expires_at: number }
    data.expires_at = 1
    localStorage.setItem(key, JSON.stringify(data))
  })
  await page.route(`${authUrl}/token**`, (route) => reply(route, { code: 'refresh_token_not_found', msg: 'Invalid Refresh Token' }, 400))
  await page.reload()
  await expect(page).toHaveURL('/login')
  await expect(page.getByRole('button', { name: 'Entrar', exact: true })).toBeVisible()
})

test('formulários e layout autenticado funcionam em 320px e desktop sem overflow', async ({ page }) => {
  const runtimeErrors: string[] = []
  page.on('pageerror', (error) => runtimeErrors.push(error.message))
  for (const width of [320, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    for (const route of ['/login', '/cadastro', '/esqueci-senha', '/redefinir-senha']) {
      await page.goto(route)
      await expect(page.locator('h1')).toBeVisible()
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    }
  }
  await login(page)
  for (const width of [320, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    for (const route of ['/dashboard', '/editais', '/calendario', '/configuracoes']) {
      await page.goto(route)
      await expect(page.locator('h1')).toBeVisible()
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    }
  }
  expect(runtimeErrors).toEqual([])
})
