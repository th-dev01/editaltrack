import { z } from 'zod'

const email = z.string().trim().email('Informe um e-mail válido.')
const password = z.string().min(8, 'A senha deve ter pelo menos 8 caracteres.')

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Informe sua senha.'),
})

export const signupSchema = z.object({
  name: z.string().trim().min(1, 'Informe seu nome.').max(120, 'Use até 120 caracteres para o nome.'),
  email,
  password,
  confirmPassword: z.string().min(1, 'Confirme sua senha.'),
}).refine((values) => values.password === values.confirmPassword, {
  path: ['confirmPassword'],
  message: 'As senhas devem ser iguais.',
})

export const forgotPasswordSchema = z.object({ email })

export const resetPasswordSchema = z.object({
  password,
  confirmPassword: z.string().min(1, 'Confirme sua nova senha.'),
}).refine((values) => values.password === values.confirmPassword, {
  path: ['confirmPassword'],
  message: 'As senhas devem ser iguais.',
})

export const recoveryOtpSchema = z.object({
  email,
  token: z.string().trim().regex(/^\d{6,8}$/, 'Informe o código numérico exibido no terminal.'),
})

export type LoginValues = z.infer<typeof loginSchema>
export type SignupValues = z.infer<typeof signupSchema>
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>
export type RecoveryOtpValues = z.infer<typeof recoveryOtpSchema>
