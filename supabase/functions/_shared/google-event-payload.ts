const MAX_REMINDERS = 5

export interface EventPayloadSource {
  titulo: string
  tipo: string
  data_inicio: string
  data_fim: string | null
  dia_inteiro: boolean
  descricao: string | null
  lembrete_modo?: 'nenhum' | 'frequencia' | 'datas'
  lembrete_intervalo_dias?: number | null
  lembrete_datas?: string[]
  editais: {
    titulo: string
    instituicao: string
    link_pagina: string | null
    link_inscricao: string | null
  }
}

export interface GoogleEventPayload {
  id?: string
  summary: string
  description: string
  start: { date: string } | { dateTime: string; timeZone: string }
  end: { date: string } | { dateTime: string; timeZone: string }
  recurrence?: string[]
  reminders: { useDefault: false; overrides: Array<{ method: 'popup'; minutes: number }> }
}

export function validateReminderMinutes(value: unknown): number[] {
  if (!Array.isArray(value) || value.length > MAX_REMINDERS || value.some((minutes) => (
    typeof minutes !== 'number' || !Number.isInteger(minutes) || minutes < 0 || minutes > 40320
  ))) throw new Error('reminder_limit_exceeded')
  if (new Set(value).size !== value.length) throw new Error('reminder_limit_exceeded')
  return value as number[]
}

function localDate(value: string, timezone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date(value))
  const values = Object.fromEntries(parts.map(({ type, value: part }) => [type, part]))
  return `${values.year}-${values.month}-${values.day}`
}

function shiftDate(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00Z`)
  value.setUTCDate(value.getUTCDate() + days)
  return value.toISOString().slice(0, 10)
}

function enrollmentReminderDates(event: EventPayloadSource, timezone: string): string[] {
  if (event.tipo !== 'inscricao' || !event.dia_inteiro || !event.lembrete_modo || event.lembrete_modo === 'nenhum') return []

  const start = localDate(event.data_inicio, timezone)
  const end = event.data_fim ? localDate(event.data_fim, timezone) : start
  const startValue = new Date(`${start}T00:00:00Z`).getTime()
  const endValue = new Date(`${end}T00:00:00Z`).getTime()
  const span = (endValue - startValue) / (24 * 60 * 60 * 1000)
  if (!Number.isInteger(span) || span < 0 || span >= 366) throw new Error('invalid_enrollment_reminder_period')

  const dates = new Set<string>([start, end])
  if (event.lembrete_modo === 'frequencia') {
    const interval = event.lembrete_intervalo_dias
    if (!Number.isInteger(interval) || !interval || interval < 1 || interval > 30) throw new Error('invalid_enrollment_reminder_config')
    if (span >= 1) dates.add(shiftDate(start, 1))
    for (let offset = 1 + interval; offset < span; offset += interval) dates.add(shiftDate(start, offset))
  } else {
    for (const date of event.lembrete_datas ?? []) {
      const parsed = new Date(`${date}T00:00:00Z`)
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date || date < start || date > end) {
        throw new Error('invalid_enrollment_reminder_config')
      }
      dates.add(date)
    }
  }
  return [...dates].sort()
}

export function buildGoogleEventPayload(
  event: EventPayloadSource,
  timezone: string,
  reminderMinutes: unknown,
): GoogleEventPayload {
  const reminders = validateReminderMinutes(reminderMinutes)
  const description = [
    `Edital: ${event.editais.titulo}`,
    `Instituição: ${event.editais.instituicao}`,
    `Tipo: ${event.tipo}`,
    event.descricao ? `Descrição: ${event.descricao}` : null,
    event.editais.link_pagina ? `Página oficial: ${event.editais.link_pagina}` : null,
    event.editais.link_inscricao ? `Inscrição: ${event.editais.link_inscricao}` : null,
    'Criado automaticamente pelo EditalTrack.',
  ].filter(Boolean).join('\n')

  const base: Pick<GoogleEventPayload, 'summary' | 'description' | 'reminders'> = {
    summary: `[EditalTrack] ${event.titulo}`,
    description,
    reminders: { useDefault: false, overrides: reminders.map((minutes) => ({ method: 'popup', minutes })) },
  }

  if (event.dia_inteiro) {
    const startDate = localDate(event.data_inicio, timezone)
    const inclusiveEndDate = event.data_fim ? localDate(event.data_fim, timezone) : startDate
    const reminderDates = enrollmentReminderDates(event, timezone)
    if (reminderDates.length > 1) {
      return {
        ...base,
        start: { date: reminderDates[0] },
        end: { date: shiftDate(reminderDates[0], 1) },
        recurrence: [`RDATE;VALUE=DATE:${reminderDates.slice(1).map((date) => date.replaceAll('-', '')).join(',')}`],
      }
    }
    return { ...base, start: { date: startDate }, end: { date: shiftDate(inclusiveEndDate, 1) } }
  }

  const start = new Date(event.data_inicio)
  const end = event.data_fim ? new Date(event.data_fim) : new Date(start.getTime() + 60 * 60 * 1000)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end.getTime() <= start.getTime()) {
    throw new Error('invalid_event_period')
  }
  return {
    ...base,
    start: { dateTime: start.toISOString(), timeZone: timezone },
    end: { dateTime: end.toISOString(), timeZone: timezone },
  }
}
