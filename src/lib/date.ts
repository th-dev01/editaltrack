const DEFAULT_TIMEZONE = 'America/Fortaleza'
let configuredTimezone = DEFAULT_TIMEZONE

export function getTimezone(timezone = configuredTimezone): string {
  return timezone
}

export function setConfiguredTimezone(timezone: string): void {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone })
    configuredTimezone = timezone
  } catch {
    configuredTimezone = DEFAULT_TIMEZONE
  }
}

function zonedDateParts(date: Date, timezone = configuredTimezone): Record<string, string> {
  return Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date).map(({ type, value }) => [type, value]))
}

export function toDateInputValue(date: Date = new Date(), timezone = configuredTimezone): string {
  const parts = zonedDateParts(date, timezone)
  return `${parts.year}-${parts.month}-${parts.day}`
}

export function toDateTimeLocalInputValue(dateStr: string, timezone = configuredTimezone): string {
  const parts = zonedDateParts(new Date(dateStr), timezone)
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`
}

export function localDateTimeToIso(value: string, timezone = configuredTimezone): string {
  const [datePart = '', timePart = '00:00'] = value.split('T')
  const [year = 0, month = 1, day = 1] = datePart.split('-').map(Number)
  const [hour = 0, minute = 0, second = 0] = timePart.split(':').map(Number)
  const assumedUtc = Date.UTC(year, month - 1, day, hour, minute, second)
  const zonedParts = zonedDateParts(new Date(assumedUtc), timezone)
  const representedUtc = Date.UTC(
    Number(zonedParts.year), Number(zonedParts.month) - 1, Number(zonedParts.day),
    Number(zonedParts.hour), Number(zonedParts.minute), second,
  )
  return new Date(assumedUtc - (representedUtc - assumedUtc)).toISOString()
}

export function formatDate(dateStr: string, options: { includeTime?: boolean; timeZone?: string } = {}): string {
  const date = new Date(dateStr)
  const formatter = new Intl.DateTimeFormat('pt-BR', {
    timeZone: options.timeZone ?? configuredTimezone,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    ...(options.includeTime && { hour: '2-digit', minute: '2-digit' }),
  })
  return formatter.format(date)
}

export function formatDateShort(dateStr: string, timezone = configuredTimezone): string {
  const date = new Date(dateStr)
  const formatter = new Intl.DateTimeFormat('pt-BR', {
    timeZone: timezone,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
  return formatter.format(date)
}

export function formatPeriod(inicio: string, fim: string | null, timezone = configuredTimezone): string {
  if (!fim || fim === inicio) {
    return formatDate(inicio, { timeZone: timezone })
  }
  return `${formatDate(inicio, { timeZone: timezone })} \u2192 ${formatDate(fim, { timeZone: timezone })}`
}

export function formatTime(dateStr: string, timezone = configuredTimezone): string {
  const date = new Date(dateStr)
  const formatter = new Intl.DateTimeFormat('pt-BR', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
  })
  return formatter.format(date)
}

interface UrgenciaResult {
  status: 'today' | 'tomorrow' | 'urgent' | 'attention' | 'normal' | 'expired' | 'completed' | 'future'
  label: string
  daysRemaining: number | null
}

function startOfDay(date: Date, timezone = configuredTimezone): Date {
  const parts = zonedDateParts(date, timezone)
  return new Date(Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day)))
}

function endOfDay(date: Date, timezone = configuredTimezone): Date {
  return new Date(startOfDay(date, timezone).getTime() + 24 * 60 * 60 * 1000 - 1)
}

export function calcularUrgencia(
  dataInicio: string,
  dataFim: string | null,
  diaInteiro: boolean,
  concluido: boolean,
  timezone = configuredTimezone,
): UrgenciaResult {
  if (concluido) {
    return { status: 'completed', label: 'Concluído', daysRemaining: null }
  }

  const agora = new Date()
  const hoje = startOfDay(agora, timezone)
  const inicio = new Date(dataInicio)

  const dataFimObj = dataFim ? new Date(dataFim) : null
  const fimEfetivo = dataFimObj ?? inicio

  if (diaInteiro) {
    const fimDiaInteiro = endOfDay(fimEfetivo, timezone)

    if (fimDiaInteiro < hoje) {
      return { status: 'expired', label: 'Encerrado', daysRemaining: null }
    }

    const diffTime = fimDiaInteiro.getTime() - hoje.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 0) {
      return { status: 'today', label: 'Hoje', daysRemaining: 0 }
    }
    if (diffDays === 1) {
      return { status: 'tomorrow', label: 'Amanhã', daysRemaining: 1 }
    }
    if (diffDays <= 2) {
      return { status: 'urgent', label: `Faltam ${diffDays} dias`, daysRemaining: diffDays }
    }
    if (diffDays <= 7) {
      return { status: 'attention', label: `Faltam ${diffDays} dias`, daysRemaining: diffDays }
    }
    return { status: 'normal', label: `Faltam ${diffDays} dias`, daysRemaining: diffDays }
  }

  if (fimEfetivo < agora) {
    return { status: 'expired', label: 'Encerrado', daysRemaining: null }
  }

  const diffTime = fimEfetivo.getTime() - agora.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays <= 0) {
    return { status: 'today', label: 'Hoje', daysRemaining: 0 }
  }
  if (diffDays === 1) {
    return { status: 'tomorrow', label: 'Amanhã', daysRemaining: 1 }
  }
  if (diffDays <= 2) {
    return { status: 'urgent', label: `Faltam ${diffDays} dias`, daysRemaining: diffDays }
  }
  if (diffDays <= 7) {
    return { status: 'attention', label: `Faltam ${diffDays} dias`, daysRemaining: diffDays }
  }
  return { status: 'normal', label: `Faltam ${diffDays} dias`, daysRemaining: diffDays }
}

export function getUrgenciaStyle(status: UrgenciaResult['status']): { bg: string; text: string; border: string } {
  switch (status) {
    case 'today':
    case 'urgent':
      return { bg: '#ee939315', text: '#f3afaf', border: '#ee939330' }
    case 'tomorrow':
    case 'attention':
      return { bg: '#e4c47415', text: '#e4c474', border: '#e4c47430' }
    case 'expired':
      return { bg: '#2b322c', text: '#a0aaa1', border: '#3d4a3a' }
    case 'completed':
      return { bg: '#b5ed9710', text: '#b5ed97', border: '#b5ed9730' }
    case 'future':
      return { bg: '#2b322c', text: '#a0aaa1', border: '#3d4a3a' }
    default:
      return { bg: '#232c23', text: '#eff2ed', border: '#394436' }
  }
}
