import { supabase } from '../lib/supabase'
import { userPreferencesSchema, type UserPreferencesInput } from '../features/settings/user-preferences-schema'
import { DEFAULT_USER_PREFERENCES, type UserPreferences, type UserPreferencesRow } from '../types/user-preferences'

function client() {
  if (!supabase) throw new Error('Supabase não configurado')
  return supabase
}

async function getCurrentUserId(): Promise<string> {
  const { data: { user }, error } = await client().auth.getUser()
  if (error) throw error
  if (!user) throw new Error('Sessão necessária')
  return user.id
}

export async function getUserPreferences(): Promise<UserPreferences> {
  const userId = await getCurrentUserId()
  const { data, error } = await client().from('user_preferences')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  if (!data) return { user_id: userId, ...DEFAULT_USER_PREFERENCES }

  const row = data as UserPreferencesRow
  const preferences = userPreferencesSchema.parse({
    timezone: row.timezone,
    default_reminders: row.default_reminders,
  })
  return { user_id: row.user_id, ...preferences }
}

export async function saveUserPreferences(input: UserPreferencesInput): Promise<UserPreferences> {
  const userId = await getCurrentUserId()
  const preferences = userPreferencesSchema.parse(input)
  const { data, error } = await client().from('user_preferences')
    .upsert({ user_id: userId, ...preferences }, { onConflict: 'user_id' })
    .select('*')
    .single()
  if (error) throw error
  const row = data as UserPreferencesRow
  return { user_id: row.user_id, timezone: row.timezone, default_reminders: row.default_reminders }
}

export async function updateTimezone(timezone: UserPreferencesInput['timezone']): Promise<UserPreferences> {
  const current = await getUserPreferences()
  return saveUserPreferences({ timezone, default_reminders: current.default_reminders })
}

export async function updateDefaultReminders(default_reminders: UserPreferencesInput['default_reminders']): Promise<UserPreferences> {
  const current = await getUserPreferences()
  return saveUserPreferences({ timezone: current.timezone, default_reminders })
}
