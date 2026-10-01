import { useEffect } from 'react'
import { useRouteError } from 'react-router-dom'
import { CircleAlert } from 'lucide-react'

export function RouteErrorPage() {
  const error = useRouteError()

  useEffect(() => {
    if (import.meta.env.DEV) console.error('Falha ao abrir a página:', error)
  }, [error])

  return (
    <main className="error-page">
      <CircleAlert size={32} className="text-accent" aria-hidden="true" />
      <h1>Não foi possível abrir esta página.</h1>
      <p>Tente novamente voltando para o início.</p>
      <a href="/" className="button button-primary">Voltar ao início</a>
    </main>
  )
}
