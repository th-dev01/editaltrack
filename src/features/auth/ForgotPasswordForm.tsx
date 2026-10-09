import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { authService } from '../../services/auth.service'
import { isSupabaseConfigured } from '../../lib/supabase'
import { useAuth } from './auth-context'
import { getAuthErrorMessage, reportAuthError } from './auth-errors'
import { forgotPasswordSchema, type ForgotPasswordValues } from './auth-schemas'
import { AuthField } from './AuthField'
import { AuthFeedback } from './AuthFeedback'

export function ForgotPasswordForm() {
  const [success, setSuccess] = useState(false)
  const { clearError } = useAuth()
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  })

  async function onSubmit({ email }: ForgotPasswordValues) {
    clearError()
    try {
      await authService.requestPasswordReset(email)
      setSuccess(true)
    } catch (error) {
      reportAuthError(error)
      setError('root', { message: getAuthErrorMessage(error) })
    }
  }

  if (success) return <AuthFeedback success message="Se houver uma conta com este e-mail, você receberá um link para redefinir a senha. Confira também a pasta de spam." />

  return (
    <form className="auth-form" onSubmit={handleSubmit(onSubmit)} noValidate aria-busy={isSubmitting}>
      <fieldset disabled={isSubmitting || !isSupabaseConfigured}>
        <AuthField id="email" label="E-mail" type="email" autoComplete="email" inputMode="email" required {...register('email')} error={errors.email?.message} />
        <AuthFeedback message={errors.root?.message} />
        <button type="submit" className="button button-primary w-full">{isSubmitting ? 'Enviando…' : 'Enviar link de recuperação'}</button>
      </fieldset>
    </form>
  )
}
