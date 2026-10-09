import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database'

const url = import.meta.env.VITE_SUPABASE_URL?.trim()
const key = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()

function isValidProjectUrl(value: string | undefined): boolean {
  if (!value) return false
  try {
    const parsed = new URL(value)
    return ['https:', 'http:'].includes(parsed.protocol) &&
      parsed.pathname === '/' && !parsed.search && !parsed.hash && !parsed.username && !parsed.password
  } catch {
    return false
  }
}

export const isSupabaseConfigured = isValidProjectUrl(url) && Boolean(key)

export const supabase = isSupabaseConfigured && url && key
  ? createClient<Database>(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        // Fluxo oficial para SPA: o SDK processa e remove o fragmento de autenticação.
        flowType: 'implicit',
      },
    })
  : null
