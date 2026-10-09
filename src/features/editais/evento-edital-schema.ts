import { z } from 'zod'
import { EVENTO_TIPOS } from './evento-options'
import { INSCRICAO_LEMBRETE_MODOS, MAX_LEMBRETE_PERIODO_DIAS, listPeriodDates } from './inscricao-lembretes'

export function isValidDateString(value: string): boolean {
  const date = new Date(value)
  return !Number.isNaN(date.getTime())
}

const optionalText = z.string().trim().transform((value) => value || null)

const dateString = z.string()
  .min(1, 'Informe uma data válida.')
  .refine(isValidDateString, 'Informe uma data válida.')

export const eventoEditalSchema = z.object({
  titulo: z.string().trim().min(1, 'Informe o título do evento.'),
  tipo: z.enum(EVENTO_TIPOS, { message: 'Selecione um tipo de evento.' }),
  data_inicio: dateString,
  data_fim: z.string().trim()
    .refine((value) => !value || isValidDateString(value), 'Informe uma data válida.')
    .transform((value) => value || null),
  dia_inteiro: z.boolean(),
  descricao: optionalText,
  concluido: z.boolean(),
  lembrete_modo: z.enum(INSCRICAO_LEMBRETE_MODOS),
  lembrete_intervalo_dias: z.string().trim()
    .transform((value) => value === '' ? null : Number(value))
    .refine((value) => value === null || (Number.isInteger(value) && value >= 1 && value <= 30), 'Escolha um intervalo entre 1 e 30 dias.'),
  lembrete_datas: z.array(z.string()),
}).superRefine((data, ctx) => {
  if (data.data_fim && data.data_inicio) {
    const inicio = new Date(data.data_inicio).getTime()
    const fim = new Date(data.data_fim).getTime()
    if (fim < inicio) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['data_fim'],
        message: 'A data final deve ser posterior ou igual à data inicial.',
      })
    }
  }

  if (data.lembrete_modo !== 'nenhum') {
    if (data.tipo !== 'inscricao') {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['lembrete_modo'], message: 'Os lembretes por período estão disponíveis para eventos de inscrição.' })
    }
    if (!data.dia_inteiro || !data.data_fim) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['data_fim'], message: 'Informe um período de inscrição de dia inteiro para configurar lembretes.' })
    } else {
      const dates = listPeriodDates(data.data_inicio, data.data_fim)
      if (!dates.length || dates.length > MAX_LEMBRETE_PERIODO_DIAS) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['data_fim'], message: `O período de lembretes deve ter no máximo ${MAX_LEMBRETE_PERIODO_DIAS} dias.` })
      }
      if (data.lembrete_modo === 'frequencia' && data.lembrete_intervalo_dias === null) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['lembrete_intervalo_dias'], message: 'Informe a frequência dos lembretes.' })
      }
      if (data.lembrete_modo === 'datas' && data.lembrete_datas.some((date) => !dates.includes(date))) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['lembrete_datas'], message: 'Escolha somente datas dentro do período de inscrição.' })
      }
    }
  }

  if (data.lembrete_modo !== 'frequencia' && data.lembrete_intervalo_dias !== null) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['lembrete_intervalo_dias'], message: 'O intervalo só se aplica ao modo de frequência.' })
  }
})

export type EventoEditalFormInput = z.input<typeof eventoEditalSchema>
export type EventoEditalFormOutput = z.output<typeof eventoEditalSchema>
