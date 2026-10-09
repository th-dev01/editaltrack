export function editalErrorMessage(error: unknown, fallback: string): string {
  const code = typeof error === 'object' && error !== null && 'code' in error ? error.code : null
  if (code === 'PGRST205' || code === '42P01') {
    return 'O cadastro de editais ainda não está configurado. Aplique a migration conforme o guia da Fase 3.'
  }
  return fallback
}

export function reportEditalError(error: unknown) {
  if (import.meta.env.DEV) console.error('Falha na operação de editais:', error)
}
