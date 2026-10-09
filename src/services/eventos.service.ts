import { supabase } from '../lib/supabase'
import { getTimezone, localDateTimeToIso, toDateInputValue } from '../lib/date'
import type { CreateEventoEditalInput, EventoCalendario, EventoEdital, UpdateEventoEditalInput } from '../types/edital'

// Helper para acessar o cliente Supabase ignorando tipos estritos de tabela
// A tabela eventos_edital será criada via migration e ainda não está nos tipos gerados
function getClient() {
  if (!supabase) throw new Error('Supabase não configurado')
  return supabase!
}

const isUuid = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)

function shiftDate(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00Z`)
  value.setUTCDate(value.getUTCDate() + days)
  return value.toISOString().slice(0, 10)
}

type EventoCalendarioRow = EventoEdital & {
  editais: { titulo: string; numero_edital: string | null; instituicao: string }
}

export async function getEventosByEdital(editalId: string): Promise<EventoEdital[]> {
  if (!isUuid(editalId)) return []
  // @ts-expect-error - eventos_edital table not in generated types yet (migration pending)
  const query = getClient().from('eventos_edital').select('*').eq('edital_id', editalId).order('data_inicio', { ascending: true })
  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as unknown as EventoEdital[]
}

/** Carrega em páginas os eventos que cruzam o intervalo solicitado. */
export async function getEventosByRange(startDate: string, endDate: string): Promise<EventoCalendario[]> {
  const db = getClient()
  const { data: { user }, error: authError } = await db.auth.getUser()
  if (authError) throw authError
  if (!user) throw new Error('Sessão necessária')
  if (new Date(`${startDate}T00:00:00Z`) > new Date(`${endDate}T00:00:00Z`)) return []

  // A folga de um dia cobre a diferença entre limites UTC do PostgREST e o dia civil de Fortaleza.
  const lowerDate = shiftDate(startDate, -1)
  const upperDate = shiftDate(endDate, 2)
  const lowerBound = `${lowerDate}T00:00:00Z`
  const upperBound = `${upperDate}T00:00:00Z`
  // @ts-expect-error - eventos_edital ainda não está nos tipos gerados do Supabase.
  const query = db.from('eventos_edital')
    .select(`
      *,
      editais!inner (
        titulo,
        numero_edital,
        instituicao
      )
    `)
    .eq('user_id', user.id)
    .lte('data_inicio', upperBound)
    .or(`data_fim.gte.${lowerBound},and(data_fim.is.null,data_inicio.gte.${lowerBound})`)
    .order('data_inicio', { ascending: true })

  const rows: EventoCalendarioRow[] = []
  const pageSize = 500
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await query.range(offset, offset + pageSize - 1)
    if (error) throw error
    rows.push(...((data ?? []) as unknown as EventoCalendarioRow[]))
    if ((data ?? []).length < pageSize) break
  }

  return rows.map(({ editais, ...evento }) => ({
    ...evento,
    edital_titulo: editais.titulo,
    edital_numero: editais.numero_edital,
    edital_instituicao: editais.instituicao,
  }))
}

export async function getEventoById(id: string): Promise<EventoEdital | null> {
  if (!isUuid(id)) return null
  // @ts-expect-error - eventos_edital table not in generated types yet (migration pending)
  const { data, error } = await getClient().from('eventos_edital').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return data as unknown as EventoEdital | null
}

export async function createEvento(input: CreateEventoEditalInput): Promise<EventoEdital> {
  const db = getClient()
  const { data: { user }, error: authError } = await db.auth.getUser()
  if (authError) throw authError
  if (!user) throw new Error('Sessão necessária')

  const payload = {
    ...input,
    user_id: user.id,
    data_inicio: localDateTimeToIso(input.data_inicio),
    data_fim: input.data_fim ? localDateTimeToIso(input.data_fim) : null,
  } as Record<string, unknown>

  // @ts-expect-error - eventos_edital table not in generated types yet (migration pending)
  const { data, error } = await getClient().from('eventos_edital').insert(payload).select('*').single()
  if (error) throw error
  return data as unknown as EventoEdital
}

export async function updateEvento(id: string, input: UpdateEventoEditalInput): Promise<EventoEdital> {
  const payload: Record<string, unknown> = { ...input }
  if (input.data_inicio) {
    payload.data_inicio = localDateTimeToIso(input.data_inicio)
  }
  if (input.data_fim !== undefined) {
    payload.data_fim = input.data_fim ? localDateTimeToIso(input.data_fim) : null
  }

  // @ts-expect-error - eventos_edital table not in generated types yet (migration pending)
  const { data, error } = await getClient().from('eventos_edital').update(payload).eq('id', id).select('*').single()
  if (error) throw error
  return data as unknown as EventoEdital
}

export async function deleteEvento(id: string): Promise<void> {
  // @ts-expect-error - eventos_edital table not in generated types yet (migration pending)
  const { data, error } = await getClient().from('eventos_edital').delete().eq('id', id).select('id').single()
  if (error) throw error
  if (!data) throw new Error('Evento não encontrado')
}

export async function toggleEventoConcluido(id: string, concluido: boolean): Promise<EventoEdital> {
  return updateEvento(id, { concluido })
}

interface ProximoEvento extends EventoEdital {
  edital_titulo: string
  edital_numero: string | null
  edital_categoria: string
}

export async function getProximosEventos(limite = 10): Promise<ProximoEvento[]> {
  const db = getClient()
  const { data: { user }, error: authError } = await db.auth.getUser()
  if (authError) throw authError
  if (!user) throw new Error('Sessão necessária')

  // @ts-expect-error - eventos_edital table not in generated types yet (migration pending)
  const { data, error } = await db.from('eventos_edital')
    .select(`
      *,
      editais!inner (
        titulo,
        numero_edital,
        categoria
      )
    `)
    .eq('user_id', user.id)
    // @ts-expect-error - eventos_edital table not in generated types yet (migration pending)
    .eq('concluido', false)
    .order('data_inicio', { ascending: true })
    .limit(limite * 3)

  if (error) throw error

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
const eventos = (data ?? []).map((e: any) => ({
    ...e,
    edital_titulo: e.editais?.titulo,
    edital_numero: e.editais?.numero_edital,
    edital_categoria: e.editais?.categoria,
  })) as ProximoEvento[]

  const agora = Date.now()
  const filtrados = eventos.filter((e) => {
    const dataInicio = new Date(e.data_inicio).getTime()

    if (e.dia_inteiro) {
      const hoje = toDateInputValue(new Date(agora), getTimezone())
      const fim = toDateInputValue(new Date(e.data_fim ?? e.data_inicio), getTimezone())
      return fim >= hoje
    }

    const fimEfetivo = e.data_fim ? new Date(e.data_fim).getTime() : dataInicio
    return fimEfetivo >= agora
  })

  return filtrados.slice(0, limite)
}

export async function getEventosParaDashboard(): Promise<ProximoEvento[]> {
  return getProximosEventos(5)
}
