import { useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabase'
import { authService } from '../../services/auth.service'
import { AuthContext } from './auth-context'
import { getAuthErrorMessage, readAuthCallbackError, reportAuthError } from './auth-errors'

// Captura somente a mensagem traduzida; os tokens são processados pelo SDK.
const callbackError = readAuthCallbackError()

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(Boolean(supabase))
  const [error, setError] = useState<string | null>(callbackError)
  const [recoveringPassword, setRecoveringPassword] = useState(false)

  useEffect(() => {
    if (!supabase) return
    let active = true
    let eventReceived = false

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!active) return
      eventReceived = true
      setSession(nextSession)
      if (event === 'PASSWORD_RECOVERY') setRecoveringPassword(true)
      if (event === 'SIGNED_OUT') setRecoveringPassword(false)
      // Callback síncrono: chamadas ao Auth aqui poderiam disputar o lock do SDK.
    })

    supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!active) return
      if (!eventReceived) setSession(data.session)
      if (sessionError) {
        reportAuthError(sessionError)
        setError(getAuthErrorMessage(sessionError))
      }
      setLoading(false)
    }).catch((sessionError: unknown) => {
      if (!active) return
      reportAuthError(sessionError)
      setError(getAuthErrorMessage(sessionError))
      setLoading(false)
    })

    if (callbackError) {
      const cleanUrl = new URL(window.location.href)
      cleanUrl.hash = ''
      for (const key of ['error', 'error_code', 'error_description']) cleanUrl.searchParams.delete(key)
      window.history.replaceState(window.history.state, '', cleanUrl)
    }

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  async function signOut() {
    await authService.signOut()
    setSession(null)
    setError(null)
    setRecoveringPassword(false)
  }

  return (
    <AuthContext.Provider value={{
      user: session?.user ?? null,
      session,
      loading,
      error,
      recoveringPassword,
      clearError: () => setError(null),
      finishPasswordRecovery: () => setRecoveringPassword(false),
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  )
}
