export const EVENTO_TIPOS = [
  'publicacao', 'inscricao', 'isencao', 'pagamento', 'envio_documentos',
  'homologacao', 'prova', 'entrevista', 'avaliacao_titulos',
  'resultado_preliminar', 'recurso', 'resultado_recurso',
  'resultado_final', 'matricula', 'convocacao', 'outro',
] as const

export type EventoTipo = typeof EVENTO_TIPOS[number]

export const EVENTO_TIPO_LABELS = {
  publicacao: 'Publicação',
  inscricao: 'Inscrição',
  isencao: 'Isenção',
  pagamento: 'Pagamento',
  envio_documentos: 'Envio de documentos',
  homologacao: 'Homologação',
  prova: 'Prova',
  entrevista: 'Entrevista',
  avaliacao_titulos: 'Avaliação de títulos',
  resultado_preliminar: 'Resultado preliminar',
  recurso: 'Recurso',
  resultado_recurso: 'Resultado do recurso',
  resultado_final: 'Resultado final',
  matricula: 'Matrícula',
  convocacao: 'Convocação',
  outro: 'Outro',
} as const satisfies Record<EventoTipo, string>