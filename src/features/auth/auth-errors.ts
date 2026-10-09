import { isAuthError } from '@supabase/supabase-js'

const messages: Record<string, string> = {
  invalid_credentials: 'E-mail ou senha incorretos.',
  email_not_confirmed: 'Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada.',
  user_already_exists: 'Já existe uma conta cadastrada com este e-mail.',
  email_exists: 'Já existe uma conta cadastrada com este e-mail.',
  weak_password: 'A senha não atende às regras de segurança. Use ao menos 8 caracteres e verifique as exigências do projeto.',
  same_password: 'Escolha uma senha diferente da senha atual.',
  over_email_send_rate_limit: 'Muitos e-mails solicitados. Aguarde alguns minutos e tente novamente.',
  over_request_rate_limit: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.',
  email_address_invalid: 'Informe um e-mail válido.',
  email_address_not_authorized: 'O envio para este e-mail ainda não está autorizado. Verifique a configuração de e-mail do projeto.',
  signup_disabled: 'O cadastro de novas contas está temporariamente indisponível.',
  email_provider_disabled: 'O acesso por e-mail ainda não está habilitado.',
  otp_expired: 'Este link expirou ou já foi utilizado. Solicite um novo e-mail.',
  flow_state_expired: 'Este link expirou. Solicite um novo e-mail.',
  session_not_found: 'Sua sessão expirou. Entre novamente ou solicite outro link de recuperação.',
  refresh_token_not_found: 'Sua sessão expirou. Entre novamente.',
  refresh_token_already_used: 'Sua sessão expirou. Entre novamente.',
  user_banned: 'Não foi possível acessar esta conta. Entre em contato com o responsável pelo sistema.',
  reauthentication_needed: 'Entre novamente ou solicite outro link de recuperação antes de alterar a senha.',
}

export function getAuthErrorMessage(error: unknown): string {
  if (isAuthError(error)) {
    if (error.code && messages[error.code]) return messages[error.code]!
    if (error.status === 429) return messages.over_request_rate_limit!
    if (error.name === 'AuthRetryableFetchError' || error.status === 0) {
      return 'Não foi possível conectar ao servidor. Tente novamente.'
    }
    if (error.name === 'AuthSessionMissingError') return messages.session_not_found!
    // Compatibilidade com projetos que ainda retornam somente mensagens, sem code.
    if (error.message === 'Invalid login credentials') return messages.invalid_credentials!
    if (error.message === 'User already registered') return messages.user_already_exists!
  }
  if (error instanceof TypeError) return 'Não foi possível conectar ao servidor. Tente novamente.'
  return 'Não foi possível concluir esta ação. Tente novamente.'
}

export function reportAuthError(error: unknown) {
  if (import.meta.env.DEV) {
    // Nunca registrar sessão, tokens, senha ou payload de cadastro.
    console.error('Falha de autenticação', isAuthError(error)
      ? { name: error.name, code: error.code, status: error.status }
      : { name: error instanceof Error ? error.name : 'UnknownError' })
  }
}

export function readAuthCallbackError(): string | null {
  const hash = new URLSearchParams(window.location.hash.slice(1))
  const query = new URLSearchParams(window.location.search)
  const params = hash.has('error') || hash.has('error_code') ? hash : query
  if (!params.has('error') && !params.has('error_code')) return null
  return messages[params.get('error_code') ?? ''] ?? 'Não foi possível validar este link. Solicite um novo e-mail.'
}
