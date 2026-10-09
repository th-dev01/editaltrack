export const CATEGORIAS = [
  'Pós-graduação', 'Especialização', 'Mestrado', 'Doutorado', 'Residência', 'Concurso',
  'Processo seletivo', 'Mediador pedagógico', 'Tutor', 'Professor', 'Estágio', 'Bolsa', 'Curso', 'Outro',
] as const

export const EDITAIS_STATUS = [
  'encontrado', 'analisando', 'tenho_interesse', 'vou_participar',
  'inscricao_aberta', 'inscricao_realizada', 'aguardando_resultado', 'aprovado',
  'nao_aprovado', 'desisti', 'arquivado',
] as const

export const EDITAL_MODALIDADES = [
  'presencial', 'ead', 'hibrido', 'nao_informado',
] as const

export const STATUS_LABELS: Record<(typeof EDITAIS_STATUS)[number], string> = {
  encontrado: 'Encontrado', analisando: 'Analisando', tenho_interesse: 'Tenho interesse',
  vou_participar: 'Vou participar', inscricao_aberta: 'Inscrição aberta',
  inscricao_realizada: 'Inscrição realizada', aguardando_resultado: 'Aguardando resultado',
  aprovado: 'Aprovado', nao_aprovado: 'Não aprovado', desisti: 'Desisti', arquivado: 'Arquivado',
}

export const MODALIDADE_LABELS: Record<(typeof EDITAL_MODALIDADES)[number], string> = {
  presencial: 'Presencial', ead: 'EaD', hibrido: 'Híbrido', nao_informado: 'Não informado',
}

export const ESTADOS = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'] as const

export type EditalCategoria = (typeof CATEGORIAS)[number]
export type EditalStatus = (typeof EDITAIS_STATUS)[number]
export type EditalModalidade = (typeof EDITAL_MODALIDADES)[number]
