export const SUPPORTED_TIMEZONES = [
  'America/Fortaleza',
  'America/Sao_Paulo',
  'America/Manaus',
  'America/Belem',
  'America/Recife',
  'America/Bahia',
  'America/Cuiaba',
  'America/Porto_Velho',
  'America/Rio_Branco',
] as const

export const DEFAULT_REMINDER_VALUES = [10080, 4320, 1440, 0] as const

export type SupportedTimezone = typeof SUPPORTED_TIMEZONES[number]
export type DefaultReminder = typeof DEFAULT_REMINDER_VALUES[number]

export interface UserPreferences {
  user_id: string
  timezone: SupportedTimezone
  default_reminders: DefaultReminder[]
}

export interface UserPreferencesRow extends UserPreferences {
  created_at: string
  updated_at: string
}

export const DEFAULT_USER_PREFERENCES = {
  timezone: 'America/Fortaleza',
  default_reminders: [...DEFAULT_REMINDER_VALUES],
} satisfies Omit<UserPreferences, 'user_id'>

export const TIMEZONE_LABELS: Record<SupportedTimezone, string> = {
  'America/Fortaleza': 'America/Fortaleza (UTC−03:00)',
  'America/Sao_Paulo': 'America/São_Paulo (UTC−03:00)',
  'America/Manaus': 'America/Manaus (UTC−04:00)',
  'America/Belem': 'America/Belém (UTC−03:00)',
  'America/Recife': 'America/Recife (UTC−03:00)',
  'America/Bahia': 'America/Bahia (UTC−03:00)',
  'America/Cuiaba': 'America/Cuiabá (UTC−04:00)',
  'America/Porto_Velho': 'America/Porto_Velho (UTC−04:00)',
  'America/Rio_Branco': 'America/Rio_Branco (UTC−05:00)',
}

export const DEFAULT_REMINDER_LABELS: Record<DefaultReminder, string> = {
  10080: '7 dias antes',
  4320: '3 dias antes',
  1440: '1 dia antes',
  0: 'No momento do evento',
}
