import { createContext, useContext } from 'react'
import type { Session, User } from '@supabase/supabase-js'

interface AuthContextValue {
  user: User | null
  session: Session | null
  loading: boolean
  error: string | null
  recoveringPassword: boolean
  clearError: () => void
  finishPasswordRecovery: () => void
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth requer AuthProvider')
  return context
}
