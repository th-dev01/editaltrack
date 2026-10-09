import type { EditalCategoria, EditalStatus, EditalModalidade } from '../features/editais/edital-options'
import type { EventoTipo } from '../features/editais/evento-options'
import type { InscricaoLembreteModo } from '../features/editais/inscricao-lembretes'

export type { EditalCategoria, EditalStatus, EditalModalidade, EventoTipo }

export type Edital = {
  id: string
  user_id: string
  titulo: string
  numero_edital: string | null
  instituicao: string
  categoria: EditalCategoria
  cargo_curso: string | null
  descricao: string | null
  cidade: string | null
  estado: string | null
  modalidade: EditalModalidade | null
  link_pagina: string | null
  link_inscricao: string | null
  link_pdf: string | null
  valor_inscricao: number | null
  possui_isencao: boolean
  status: EditalStatus
  favorito: boolean
  observacoes: string | null
  inscricao_realizada: boolean
  data_inscricao_realizada: string | null
  created_at: string
  updated_at: string
}

export type CreateEditalInput = Pick<Edital, 'titulo' | 'instituicao' | 'categoria'> &
  Partial<Omit<Edital, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'data_inscricao_realizada' | 'titulo' | 'instituicao' | 'categoria'>>

export type UpdateEditalInput = Partial<CreateEditalInput>



export type EventoEdital = {
  id: string
  user_id: string
  edital_id: string
  titulo: string
  tipo: EventoTipo
  data_inicio: string
  data_fim: string | null
  dia_inteiro: boolean
  descricao: string | null
  concluido: boolean
  lembrete_modo: InscricaoLembreteModo
  lembrete_intervalo_dias: number | null
  lembrete_datas: string[]
  google_event_id?: string | null
  google_calendar_id?: string | null
  google_sync_status?: GoogleSyncStatus
  google_synced_at?: string | null
  google_sync_error?: string | null
  google_event_html_link?: string | null
  created_at: string
  updated_at: string
}

export type GoogleSyncStatus = 'not_synced' | 'syncing' | 'synced' | 'error'

export type CreateEventoEditalInput = Pick<EventoEdital, 'edital_id' | 'titulo' | 'tipo' | 'data_inicio'> &
  Partial<Omit<EventoEdital, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'edital_id' | 'titulo' | 'tipo' | 'data_inicio' | 'google_event_id' | 'google_calendar_id' | 'google_sync_status' | 'google_synced_at' | 'google_sync_error' | 'google_event_html_link'>>

export type UpdateEventoEditalInput = Partial<CreateEventoEditalInput>

export interface ProximoEvento extends EventoEdital {
  edital_titulo: string
  edital_numero: string | null
  edital_categoria: string
}

export type EventoCalendario = EventoEdital & {
  edital_titulo: string
  edital_numero: string | null
  edital_instituicao: string
}

// DocumentoEdital types
export type DocumentoEdital = {
  id: string
  user_id: string
  edital_id: string
  nome: string
  descricao: string | null
  obrigatorio: boolean
  providenciado: boolean
  enviado: boolean
  observacao: string | null
  ordem: number
  created_at: string
  updated_at: string
}

export type CreateDocumentoEditalInput = Pick<DocumentoEdital, 'edital_id' | 'nome' | 'obrigatorio'> &
  Partial<Omit<DocumentoEdital, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'edital_id' | 'nome' | 'obrigatorio'>>

export type UpdateDocumentoEditalInput = Partial<CreateDocumentoEditalInput>

// Para Dashboard
export interface DocumentoPendente {
  id: string
  edital_id: string
  edital_titulo: string
  edital_numero: string | null
  nome: string
  obrigatorio: boolean
}
