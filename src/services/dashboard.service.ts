import { calcularUrgencia, getTimezone, toDateInputValue } from '../lib/date'
import { getDocumentosPendentes } from './documentos.service'
import { getEditais } from './editais.service'
import { getProximosEventos } from './eventos.service'
import type { DocumentoPendente, Edital, EventoEdital, ProximoEvento } from '../types/edital'

export interface DashboardSummary {
  totalEditais: number
  inscricoesAbertas: number
  proximosPrazos: number
  documentosPendentes: number
  aguardandoResultado: number
  favoritos: number
  paraAnalisar: number
}

export type DashboardAttentionPriority = 'critical' | 'high' | 'medium' | 'normal'

export interface DashboardAttentionItem {
  id: string
  type: 'prazo' | 'documentos_pendentes' | 'resultado' | 'inscricao_breve'
  priority: DashboardAttentionPriority
  title: string
  description: string
  editalId: string
  editalTitulo: string
  editalNumero: string | null
  dueDate: string | null
  urgencyStatus: ReturnType<typeof calcularUrgencia>['status']
}

type DashboardEvent = ProximoEvento

export interface DashboardPendingDocument extends DocumentoPendente {
  editalId: string
  editalTitulo: string
  editalNumero: string | null
}

export interface DashboardResult {
  editalId: string
  editalTitulo: string
  editalNumero: string | null
  eventoTitulo: string
  dataEvento: string | null
}

export interface DashboardData {
  summary: DashboardSummary
  inscricoesAbertas: Array<{
    editalId: string
    editalTitulo: string
    editalNumero: string | null
    eventoTitulo: string
    dataInicio: string
    dataFim: string | null
    diaInteiro: boolean
  }>
  proximosPrazos: DashboardEvent[]
  documentosPendentes: DashboardPendingDocument[]
  aguardandoResultado: DashboardResult[]
  editaisParaAnalisar: Edital[]
  favoritos: Edital[]
  attentionItems: DashboardAttentionItem[]
}

const RESULTADO_TIPOS: EventoEdital['tipo'][] = [
  'resultado_preliminar',
  'resultado_recurso',
  'resultado_final',
  'convocacao',
]

function registrationIsOpen(evento: DashboardEvent, agora: number): boolean {
  if (evento.dia_inteiro) {
    const hoje = toDateInputValue(new Date(agora), getTimezone())
    const inicio = toDateInputValue(new Date(evento.data_inicio), getTimezone())
    const fim = toDateInputValue(new Date(evento.data_fim ?? evento.data_inicio), getTimezone())
    return inicio <= hoje && fim >= hoje && !evento.concluido
  }

  const inicio = new Date(evento.data_inicio).getTime()
  if (inicio > agora || evento.concluido) return false

  const fim = new Date(evento.data_fim ?? evento.data_inicio)

  return fim.getTime() >= agora
}

function urgencyPriority(status: ReturnType<typeof calcularUrgencia>['status']): DashboardAttentionPriority {
  switch (status) {
    case 'today': return 'critical'
    case 'tomorrow':
    case 'urgent': return 'high'
    case 'attention': return 'medium'
    default: return 'normal'
  }
}

function endDate(evento: EventoEdital): string {
  return evento.data_fim ?? evento.data_inicio
}

function buildResults(editais: Edital[], eventos: DashboardEvent[], agora: number): DashboardResult[] {
  const porEdital = new Map<string, DashboardResult>()

  for (const evento of eventos) {
    if (!RESULTADO_TIPOS.includes(evento.tipo) || evento.concluido) continue
    if (new Date(evento.data_inicio).getTime() < agora) continue

    const atual = porEdital.get(evento.edital_id)
    if (!atual || new Date(evento.data_inicio).getTime() < new Date(atual.dataEvento ?? '').getTime()) {
      porEdital.set(evento.edital_id, {
        editalId: evento.edital_id,
        editalTitulo: evento.edital_titulo,
        editalNumero: evento.edital_numero,
        eventoTitulo: evento.titulo,
        dataEvento: evento.data_inicio,
      })
    }
  }

  for (const edital of editais) {
    if (edital.status === 'aguardando_resultado' && !porEdital.has(edital.id)) {
      porEdital.set(edital.id, {
        editalId: edital.id,
        editalTitulo: edital.titulo,
        editalNumero: edital.numero_edital,
        eventoTitulo: 'Aguardando resultado',
        dataEvento: null,
      })
    }
  }

  return [...porEdital.values()].sort((a, b) => {
    if (!a.dataEvento) return b.dataEvento ? 1 : 0
    if (!b.dataEvento) return -1
    return new Date(a.dataEvento).getTime() - new Date(b.dataEvento).getTime()
  })
}

function buildAttentionItems(
  inscricoesAbertas: DashboardData['inscricoesAbertas'],
  proximosPrazos: DashboardEvent[],
  documentosPendentes: DashboardPendingDocument[],
  aguardandoResultado: DashboardResult[],
  agora: number,
): DashboardAttentionItem[] {
  const items: DashboardAttentionItem[] = []

  for (const evento of proximosPrazos) {
    const urgencia = calcularUrgencia(evento.data_inicio, evento.data_fim, evento.dia_inteiro, evento.concluido)
    if (!['today', 'tomorrow', 'urgent', 'attention'].includes(urgencia.status)) continue

    items.push({
      id: `prazo-${evento.id}`,
      type: 'prazo',
      priority: urgencyPriority(urgencia.status),
      title: evento.titulo,
      description: evento.edital_titulo,
      editalId: evento.edital_id,
      editalTitulo: evento.edital_titulo,
      editalNumero: evento.edital_numero,
      dueDate: endDate(evento),
      urgencyStatus: urgencia.status,
    })
  }

  const pendingByEdital = new Map<string, DashboardPendingDocument[]>()
  for (const documento of documentosPendentes) {
    const group = pendingByEdital.get(documento.editalId) ?? []
    group.push(documento)
    pendingByEdital.set(documento.editalId, group)
  }

  for (const inscricao of inscricoesAbertas) {
    const pendentes = pendingByEdital.get(inscricao.editalId) ?? []
    if (pendentes.length === 0) continue

    const dataPrazo = inscricao.dataFim ?? (inscricao.diaInteiro ? inscricao.dataInicio : null)
    const urgencia = dataPrazo
      ? calcularUrgencia(dataPrazo, dataPrazo, inscricao.diaInteiro, false)
      : null
    const prazoEmTresDias = urgencia?.daysRemaining !== null && urgencia?.daysRemaining !== undefined
      && urgencia.daysRemaining <= 3
    if (!prazoEmTresDias) continue

    items.push({
      id: `documentos-${inscricao.editalId}`,
      type: 'documentos_pendentes',
      priority: urgencyPriority(urgencia.status),
      title: `${pendentes.length} documento${pendentes.length === 1 ? '' : 's'} obrigatório${pendentes.length === 1 ? '' : 's'} pendente${pendentes.length === 1 ? '' : 's'}`,
      description: `${inscricao.eventoTitulo} — ${inscricao.editalTitulo}`,
      editalId: inscricao.editalId,
      editalTitulo: inscricao.editalTitulo,
      editalNumero: inscricao.editalNumero,
      dueDate: dataPrazo,
      urgencyStatus: urgencia.status,
    })
  }

  for (const resultado of aguardandoResultado) {
    if (!resultado.dataEvento || new Date(resultado.dataEvento).getTime() - agora > 7 * 24 * 60 * 60 * 1000) continue
    const resultadoHoje = calcularUrgencia(resultado.dataEvento, resultado.dataEvento, true, false)

    items.push({
      id: `resultado-${resultado.editalId}`,
      type: 'resultado',
      priority: urgencyPriority(resultadoHoje.status),
      title: resultadoHoje.status === 'today' ? 'Resultado previsto para hoje' : resultado.eventoTitulo,
      description: resultado.editalTitulo,
      editalId: resultado.editalId,
      editalTitulo: resultado.editalTitulo,
      editalNumero: resultado.editalNumero,
      dueDate: resultado.dataEvento,
      urgencyStatus: resultadoHoje.status,
    })
  }

  return items.sort((a, b) => {
    const priorityOrder: Record<DashboardAttentionPriority, number> = {
      critical: 0,
      high: 1,
      medium: 2,
      normal: 3,
    }
    const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority]
    if (priorityDiff !== 0) return priorityDiff
    if (!a.dueDate) return b.dueDate ? 1 : 0
    if (!b.dueDate) return -1
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
  })
}

export async function getDashboardData(): Promise<DashboardData> {
  const agora = Date.now()
  const [editais, proximosPrazos, documentosRaw] = await Promise.all([
    getEditais(),
    getProximosEventos(1000),
    getDocumentosPendentes(1000),
  ])
  proximosPrazos.sort((a, b) => {
    const prazoA = new Date(a.data_fim ?? a.data_inicio).getTime()
    const prazoB = new Date(b.data_fim ?? b.data_inicio).getTime()
    return prazoA - prazoB
  })

  const inscricoesAbertas = proximosPrazos
    .filter((evento) => evento.tipo === 'inscricao' && registrationIsOpen(evento, agora))
    .map((evento) => ({
      editalId: evento.edital_id,
      editalTitulo: evento.edital_titulo,
      editalNumero: evento.edital_numero,
      eventoTitulo: evento.titulo,
      dataInicio: evento.data_inicio,
      dataFim: evento.data_fim,
      diaInteiro: evento.dia_inteiro,
    }))

  const documentosPendentes: DashboardPendingDocument[] = documentosRaw.map((documento) => ({
    ...documento,
    editalId: documento.edital_id,
    editalTitulo: documento.edital_titulo,
    editalNumero: documento.edital_numero,
  }))

  const aguardandoResultado = buildResults(editais, proximosPrazos, agora)
  const editaisParaAnalisar = editais
    .filter((edital) => edital.status === 'encontrado' || edital.status === 'analisando')
    .slice(0, 5)
  const favoritos = editais.filter((edital) => edital.favorito).slice(0, 5)

  const summary: DashboardSummary = {
    totalEditais: editais.length,
    inscricoesAbertas: inscricoesAbertas.length,
    proximosPrazos: proximosPrazos.length,
    documentosPendentes: documentosPendentes.length,
    aguardandoResultado: aguardandoResultado.length,
    favoritos: editais.filter((edital) => edital.favorito).length,
    paraAnalisar: editais.filter((edital) => edital.status === 'encontrado' || edital.status === 'analisando').length,
  }

  return {
    summary,
    inscricoesAbertas,
    proximosPrazos,
    documentosPendentes,
    aguardandoResultado,
    editaisParaAnalisar,
    favoritos,
    attentionItems: buildAttentionItems(inscricoesAbertas, proximosPrazos, documentosPendentes, aguardandoResultado, agora),
  }
}
