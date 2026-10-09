import { z } from 'zod'
import { CATEGORIAS, ESTADOS, EDITAL_MODALIDADES, EDITAIS_STATUS } from './edital-options'

export function isExternalUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return ['https:', 'http:'].includes(url.protocol) && Boolean(url.hostname) && !url.username && !url.password
  } catch {
    return false
  }
}

const optionalText = z.string().trim().transform((value) => value || null)
const externalUrl = z.string().trim()
  .refine((value) => !value || isExternalUrl(value), 'Informe uma URL válida começando com https:// ou http://.')
  .transform((value) => value || null)

const money = z.string().trim()
  .refine((value) => !value || /^\d+([.,]\d{1,2})?$/.test(value), 'Informe um valor maior ou igual a zero, com até 2 casas decimais.')
  .transform((value) => value === '' ? null : Number(value.replace(',', '.')))
  .refine((value) => value === null || (Number.isFinite(value) && value <= 99999999.99), 'O valor máximo é R$ 99.999.999,99.')

export const editalSchema = z.object({
  titulo: z.string().trim().min(1, 'Informe o título do edital.'),
  instituicao: z.string().trim().min(1, 'Informe a instituição.'),
  categoria: z.enum(CATEGORIAS, { message: 'Selecione uma categoria.' }),
  numero_edital: optionalText,
  cargo_curso: optionalText,
  descricao: optionalText,
  cidade: optionalText,
  estado: z.union([z.enum(ESTADOS), z.literal(''), z.null()]).transform((value) => value || null),
  modalidade: z.enum(EDITAL_MODALIDADES, { message: 'Selecione uma modalidade.' }),
  link_pagina: externalUrl,
  link_inscricao: externalUrl,
  link_pdf: externalUrl,
  valor_inscricao: money,
  possui_isencao: z.boolean(),
  status: z.enum(EDITAIS_STATUS, { message: 'Selecione um status.' }),
  favorito: z.boolean(),
  observacoes: optionalText,
  inscricao_realizada: z.boolean(),
})

export type EditalFormInput = z.input<typeof editalSchema>
export type EditalFormOutput = z.output<typeof editalSchema>
