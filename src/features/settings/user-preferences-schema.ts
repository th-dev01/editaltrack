import { z } from 'zod'
import { DEFAULT_REMINDER_VALUES, SUPPORTED_TIMEZONES } from '../../types/user-preferences'

export const userPreferencesSchema = z.object({
  timezone: z.enum(SUPPORTED_TIMEZONES),
  default_reminders: z.array(z.union([
    z.literal(DEFAULT_REMINDER_VALUES[0]),
    z.literal(DEFAULT_REMINDER_VALUES[1]),
    z.literal(DEFAULT_REMINDER_VALUES[2]),
    z.literal(DEFAULT_REMINDER_VALUES[3]),
  ]))
    .refine((values) => new Set(values).size === values.length, 'Não repita um lembrete.'),
})

export type UserPreferencesInput = z.infer<typeof userPreferencesSchema>
