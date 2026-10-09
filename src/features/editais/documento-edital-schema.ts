import { z } from 'zod'

const optionalText = z.string().trim().transform((value) => value || null)

export const documentoEditalSchema = z.object({
  nome: z.string().trim().min(1, 'Informe o nome do documento.'),
  descricao: optionalText,
  obrigatorio: z.boolean(),
  providenciado: z.boolean(),
  enviado: z.boolean(),
  observacao: optionalText,
  ordem: z.number().int().min(0, 'A ordem deve ser um número maior ou igual a zero.'),
}).superRefine((data, ctx) => {
  if (data.enviado && !data.providenciado) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['enviado'],
      message: 'Um documento enviado deve estar providenciado.',
    })
  }
})

export type DocumentoEditalFormInput = z.input<typeof documentoEditalSchema>
export type DocumentoEditalFormOutput = z.output<typeof documentoEditalSchema>