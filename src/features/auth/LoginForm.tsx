import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate } from 'react-router-dom'
import { authService } from '../../services/auth.service'
import { isSupabaseConfigured } from '../../lib/supabase'
import { useAuth } from './auth-context'
import { getAuthErrorMessage, reportAuthError } from './auth-errors'
import { loginSchema, type LoginValues } from './auth-schemas'
import { AuthField } from './AuthField'
import { AuthFeedback } from './AuthFeedback'

export function LoginForm() {
  const navigate = useNavigate()
  const { clearError } = useAuth()
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  async function onSubmit(values: LoginValues) {
    clearError()
    try {
      await authService.signIn(values)
      navigate('/dashboard', { replace: true })
    } catch (error) {
      reportAuthError(error)
      setError('root', { message: getAuthErrorMessage(error) })
    }
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit(onSubmit)} noValidate aria-busy={isSubmitting}>
      <fieldset disabled={isSubmitting || !isSupabaseConfigured}>
        <AuthField id="email" label="E-mail" type="email" autoComplete="email" inputMode="email" required {...register('email')} error={errors.email?.message} />
        <AuthField id="password" label="Senha" type="password" autoComplete="current-password" required {...register('password')} error={errors.password?.message} />
        <Link to="/esqueci-senha" className="text-link self-end">Esqueci minha senha</Link>
        <AuthFeedback message={errors.root?.message} />
        <button type="submit" className="button button-primary w-full">{isSubmitting ? 'Entrando…' : 'Entrar'}</button>
      </fieldset>
    </form>
  )
}
