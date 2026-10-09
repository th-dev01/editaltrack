import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from './auth-context'
import { AuthLoading } from './AuthLoading'

export function ProtectedRoute() {
  const { user, loading, recoveringPassword } = useAuth()
  if (loading) return <AuthLoading />
  if (!user) return <Navigate to="/login" replace />
  if (recoveringPassword) return <Navigate to="/redefinir-senha" replace />
  return <Outlet />
}

export function GuestRoute() {
  const { user, loading, recoveringPassword } = useAuth()
  if (loading) return <AuthLoading />
  if (user) return <Navigate to={recoveringPassword ? '/redefinir-senha' : '/dashboard'} replace />
  return <Outlet />
}
