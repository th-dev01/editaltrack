import { LoaderCircle } from 'lucide-react'

export function AuthLoading() {
  return (
    <main className="auth-loading" role="status" aria-live="polite">
      <LoaderCircle size={28} className="animate-spin text-accent" aria-hidden="true" />
      <p>Verificando seu acesso…</p>
    </main>
  )
}
