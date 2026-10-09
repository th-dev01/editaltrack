import { AuthError } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { LoginValues, SignupValues } from '../features/auth/auth-schemas'

function authClient() {
  if (!supabase) throw new Error('Supabase não configurado')
  return supabase.auth
}

export const authService = {
  async signUp({ name, email, password }: SignupValues) {
    const { data, error } = await authClient().signUp({
      email,
      password,
      options: {
        data: { name },
        emailRedirectTo: new URL('/dashboard', window.location.origin).href,
      },
    })
    if (error) throw error
    // Com confirmação ativada, o Supabase pode ocultar duplicatas com identities vazio.
    if (data.user?.identities?.length === 0) {
      throw new AuthError('User already registered', 400, 'user_already_exists')
    }
    return data
  },

  async signIn({ email, password }: LoginValues) {
    const { data, error } = await authClient().signInWithPassword({ email, password })
    if (error) throw error
    return data
  },

  async requestPasswordReset(email: string) {
    const { error } = await authClient().resetPasswordForEmail(email, {
      redirectTo: new URL('/redefinir-senha', window.location.origin).href,
    })
    if (error) throw error
  },

  async updatePassword(password: string) {
    const { error } = await authClient().updateUser({ password })
    if (error) throw error
  },

  async verifyPasswordRecoveryCode(email: string, token: string) {
    const { data, error } = await authClient().verifyOtp({
      email: email.trim(),
      token: token.trim(),
      type: 'recovery',
    })
    if (error) throw error
    if (!data.session) throw new Error('recovery_session_missing')
    return data
  },

  async signOut() {
    const { error } = await authClient().signOut({ scope: 'local' })
    if (error) throw error
  },
}
