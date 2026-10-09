export const INSCRICAO_LEMBRETE_MODOS = ['nenhum', 'frequencia', 'datas'] as const
export type InscricaoLembreteModo = (typeof INSCRICAO_LEMBRETE_MODOS)[number]

const DAY_MS = 24 * 60 * 60 * 1000
export const MAX_LEMBRETE_PERIODO_DIAS = 366

export function listPeriodDates(start: string, end: string): string[] {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end)) return []
  const first = new Date(`${start}T00:00:00.000Z`)
  const last = new Date(`${end}T00:00:00.000Z`)
  if (first.toISOString().slice(0, 10) !== start || last.toISOString().slice(0, 10) !== end) return []
  const span = Math.round((last.getTime() - first.getTime()) / DAY_MS)
  if (!Number.isInteger(span) || span < 0 || span >= MAX_LEMBRETE_PERIODO_DIAS) return []

  return Array.from({ length: span + 1 }, (_, index) => {
    const date = new Date(first)
    date.setUTCDate(date.getUTCDate() + index)
    return date.toISOString().slice(0, 10)
  })
}

/** Período automático: primeiro dia, dia seguinte, alternância pelo intervalo e último dia. */
export function buildFrequencyReminderDates(start: string, end: string, interval: number): string[] {
  const period = listPeriodDates(start, end)
  if (!period.length || !Number.isInteger(interval) || interval < 1 || interval > 30) return []
  if (period.length === 1) return period

  const selected = [period[0]!, period[1]!]
  for (let index = 1 + interval; index < period.length - 1; index += interval) {
    selected.push(period[index]!)
  }
  if (selected.at(-1) !== period.at(-1)) selected.push(period.at(-1)!)
  return selected
}
