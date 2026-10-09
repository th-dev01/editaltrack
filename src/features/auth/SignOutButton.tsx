import { useState } from 'react'
import { LogOut } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from './auth-context'
import { getAuthErrorMessage, reportAuthError } from './auth-errors'
import { AuthFeedback } from './AuthFeedback'

export function SignOutButton() {
  const { signOut } = useAuth()
  const navigate = useNavigate()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSignOut() {
    if (pending) return
    setPending(true)
    setError(null)
    try {
      await signOut()
      navigate('/login', { replace: true })
    } catch (signOutError) {
      reportAuthError(signOutError)
      setError(getAuthErrorMessage(signOutError))
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="mt-4">
      <button type="button" className="button button-secondary" onClick={handleSignOut} disabled={pending}>
        <LogOut size={17} aria-hidden="true" />{pending ? 'Saindo…' : 'Sair da conta'}
      </button>
      <AuthFeedback message={error} />
    </div>
  )
}
