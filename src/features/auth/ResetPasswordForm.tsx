import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from 'react-router-dom'
import { authService } from '../../services/auth.service'
import { useAuth } from './auth-context'
import { getAuthErrorMessage, reportAuthError } from './auth-errors'
import { recoveryOtpSchema, resetPasswordSchema, type RecoveryOtpValues, type ResetPasswordValues } from './auth-schemas'
import { AuthField } from './AuthField'
import { AuthFeedback } from './AuthFeedback'

export function ResetPasswordForm() {
  const { session, error: sessionError, clearError, finishPasswordRecovery } = useAuth()
  const [success, setSuccess] = useState(false)
  const [otpVerified, setOtpVerified] = useState(false)
  const { register, handleSubmit, reset, setError, formState: { errors, isSubmitting } } = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  })
  const recoveryForm = useForm<RecoveryOtpValues>({
    resolver: zodResolver(recoveryOtpSchema),
    defaultValues: { email: '', token: '' },
  })

  async function onVerifyCode({ email, token }: RecoveryOtpValues) {
    recoveryForm.clearErrors('root')
    clearError()
    try {
      await authService.verifyPasswordRecoveryCode(email, token)
      setOtpVerified(true)
    } catch (error) {
      reportAuthError(error)
      recoveryForm.setError('root', { message: getAuthErrorMessage(error) })
    }
  }

  async function onSubmit({ password }: ResetPasswordValues) {
    try {
      await authService.updatePassword(password)
      finishPasswordRecovery()
      reset()
      setSuccess(true)
    } catch (error) {
      reportAuthError(error)
      setError('root', { message: getAuthErrorMessage(error) })
    }
  }

  if ((!session || sessionError) && !otpVerified) {
    return (
      <div className="mt-6">
        <p className="page-description recovery-code-instructions">Informe o e-mail da conta e o código de recuperação para continuar.</p>
        <form className="auth-form" onSubmit={recoveryForm.handleSubmit(onVerifyCode)} noValidate aria-busy={recoveryForm.formState.isSubmitting}>
          <fieldset disabled={recoveryForm.formState.isSubmitting}>
            <AuthField id="recovery-email" label="E-mail da conta" type="email" autoComplete="email" required {...recoveryForm.register('email')} error={recoveryForm.formState.errors.email?.message} />
            <AuthField id="recovery-code" label="Código de recuperação" type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={8} required {...recoveryForm.register('token')} error={recoveryForm.formState.errors.token?.message} hint="No teste local, gere o código no terminal usando o comando documentado." />
            <AuthFeedback message={recoveryForm.formState.errors.root?.message} />
            <button type="submit" className="button button-primary w-full">{recoveryForm.formState.isSubmitting ? 'Validando…' : 'Validar código'}</button>
          </fieldset>
        </form>
        <Link to="/esqueci-senha" className="button button-secondary w-full mt-4">Solicitar novo link</Link>
      </div>
    )
  }

  if (otpVerified && !session) return <AuthFeedback success message="Código validado. Carregando a etapa de redefinição…" />

  if (success) return (
    <>
      <AuthFeedback success message="Senha redefinida com sucesso. Sua nova senha já pode ser utilizada." />
      <Link to="/dashboard" className="button button-primary w-full mt-4">Ir para o início</Link>
    </>
  )

  return (
    <form className="auth-form" onSubmit={handleSubmit(onSubmit)} noValidate aria-busy={isSubmitting}>
      <fieldset disabled={isSubmitting}>
        <AuthField id="password" label="Nova senha" type="password" autoComplete="new-password" required {...register('password')} error={errors.password?.message} hint="Use pelo menos 8 caracteres." />
        <AuthField id="confirmPassword" label="Confirmar nova senha" type="password" autoComplete="new-password" required {...register('confirmPassword')} error={errors.confirmPassword?.message} />
        <AuthFeedback message={errors.root?.message} />
        <button type="submit" className="button button-primary w-full">{isSubmitting ? 'Salvando…' : 'Salvar nova senha'}</button>
      </fieldset>
    </form>
  )
}
