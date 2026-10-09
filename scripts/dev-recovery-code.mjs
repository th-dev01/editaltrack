const projectUrl = process.env.SUPABASE_URL?.trim()
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
const devOnlyConfirmation = process.env.SUPABASE_RECOVERY_CODE_DEV_ONLY
const email = process.argv[2]?.trim().toLowerCase()

if (process.env.NODE_ENV === 'production' || devOnlyConfirmation !== '1') {
  console.error('Bloqueado: este utilitário é exclusivo para recuperação local de desenvolvimento.')
  process.exit(1)
}

if (!projectUrl || !serviceRoleKey || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  console.error('Uso: npm run auth:recovery-code -- email-da-conta')
  console.error('Configure SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY e SUPABASE_RECOVERY_CODE_DEV_ONLY=1 em .env.recovery.local.')
  process.exit(1)
}

let baseUrl
try {
  baseUrl = new URL(projectUrl)
  if (!['https:', 'http:'].includes(baseUrl.protocol) || baseUrl.pathname !== '/') throw new Error()
} catch {
  console.error('SUPABASE_URL inválida; use a Project URL raiz do Supabase.')
  process.exit(1)
}

try {
  const response = await fetch(`${baseUrl.origin}/auth/v1/admin/generate_link`, {
    method: 'POST',
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ type: 'recovery', email }),
  })

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}))
    const errorCode = [errorBody.code, errorBody.error_code].find((value) => typeof value === 'string') ?? ''
    const errorMessage = [errorBody.msg, errorBody.message].find((value) => typeof value === 'string') ?? ''
    if (response.status === 404 && /user.?not.?found|user does not exist/i.test(`${errorCode} ${errorMessage}`)) {
      console.error('Não existe usuário com esse e-mail neste projeto Supabase. Confira Authentication → Users e cadastre a conta EditalTrack antes de gerar o código.')
    } else if (response.status === 401 || response.status === 403) {
      console.error('O Supabase recusou a chave administrativa. Use a service_role do mesmo projeto; não use anon/publishable.')
    } else if (response.status === 404) {
      console.error('O endpoint retornou 404. Confira se SUPABASE_URL é a Project URL do projeto correto e se Authentication está habilitado.')
    } else {
      console.error(`O Supabase não gerou o código (HTTP ${response.status}). Confira Authentication → Users e a configuração do projeto.`)
    }
    process.exit(1)
  }

  const result = await response.json()
  // The Auth HTTP endpoint returns these properties at the top level; supabase-js
  // wraps them under `data.properties` when its generateLink helper transforms it.
  const code = result?.properties?.email_otp ?? result?.email_otp ?? result?.data?.properties?.email_otp
  if (typeof code !== 'string' || !/^\d{6,8}$/.test(code)) {
    console.error('Resposta inesperada do Supabase; nenhum código foi exibido.')
    process.exit(1)
  }

  console.log(`Código de recuperação para ${email}: ${code}`)
  console.log('Digite o e-mail e este código em /redefinir-senha. Ele é de uso único e expira conforme Auth → Settings → OTP Expiry.')
} catch {
  console.error('Não foi possível conectar ao Supabase. Verifique a rede e tente novamente.')
  process.exit(1)
}
