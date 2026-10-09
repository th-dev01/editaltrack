import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from 'react-router-dom'
import { authService } from '../../services/auth.service'
import { isSupabaseConfigured } from '../../lib/supabase'
import { useAuth } from './auth-context'
import { getAuthErrorMessage, reportAuthError } from './auth-errors'
import { signupSchema, type SignupValues } from './auth-schemas'
import { AuthField } from './AuthField'
import { AuthFeedback } from './AuthFeedback'

export function SignupForm() {
  const [success, setSuccess] = useState(false)
  const navigate = useNavigate()
  const { clearError } = useAuth()
  const { register, handleSubmit, reset, setError, formState: { errors, isSubmitting } } = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { name: '', email: '', password: '', confirmPassword: '' },
  })

  async function onSubmit(values: SignupValues) {
    clearError()
    try {
      const { session } = await authService.signUp(values)
      reset()
      if (session) navigate('/dashboard', { replace: true })
      else setSuccess(true)
    } catch (error) {
      reportAuthError(error)
      setError('root', { message: getAuthErrorMessage(error) })
    }
  }

  if (success) return <AuthFeedback success message="Cadastro realizado. Verifique seu e-mail para confirmar sua conta." />

  return (
    <form className="auth-form" onSubmit={handleSubmit(onSubmit)} noValidate aria-busy={isSubmitting}>
      <fieldset disabled={isSubmitting || !isSupabaseConfigured}>
        <AuthField id="name" label="Nome" autoComplete="name" required {...register('name')} error={errors.name?.message} />
        <AuthField id="email" label="E-mail" type="email" autoComplete="email" inputMode="email" required {...register('email')} error={errors.email?.message} />
        <AuthField id="password" label="Senha" type="password" autoComplete="new-password" required {...register('password')} error={errors.password?.message} hint="Use pelo menos 8 caracteres." />
        <AuthField id="confirmPassword" label="Confirmar senha" type="password" autoComplete="new-password" required {...register('confirmPassword')} error={errors.confirmPassword?.message} />
        <AuthFeedback message={errors.root?.message} />
        <button type="submit" className="button button-primary w-full">{isSubmitting ? 'Criando conta…' : 'Criar conta'}</button>
      </fieldset>
    </form>
  )
}
