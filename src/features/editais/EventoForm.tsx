import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { eventoEditalSchema, type EventoEditalFormInput, type EventoEditalFormOutput } from './evento-edital-schema'
import { EVENTO_TIPOS, EVENTO_TIPO_LABELS } from './evento-options'
import type { EventoEdital } from '../../types/edital'
import { toDateInputValue, toDateTimeLocalInputValue } from '../../lib/date'
import { buildFrequencyReminderDates, listPeriodDates } from './inscricao-lembretes'

interface EventoFormProps {
  initialValues?: EventoEdital
  initialDate?: string
  onSubmit: (values: EventoEditalFormOutput) => Promise<void>
  onCancel: () => void
  submitLabel?: string
  loadingLabel?: string
}

function buildDefaultValues(evento?: EventoEdital, initialDate?: string): EventoEditalFormInput {
  if (!evento) {
    return {
      titulo: '',
      tipo: 'outro',
      data_inicio: initialDate ?? toDateInputValue(),
      data_fim: '',
      dia_inteiro: true,
      descricao: '',
      concluido: false,
      lembrete_modo: 'nenhum',
      lembrete_intervalo_dias: '',
      lembrete_datas: [],
    } as EventoEditalFormInput
  }

  const formatInputDate = (value: string, diaInteiro: boolean) => (
    diaInteiro ? toDateInputValue(new Date(value)) : toDateTimeLocalInputValue(value)
  )
  const dataFim = evento.data_fim ? formatInputDate(evento.data_fim, evento.dia_inteiro) : ''

  return {
    titulo: evento.titulo,
    tipo: evento.tipo,
    data_inicio: formatInputDate(evento.data_inicio, evento.dia_inteiro),
    data_fim: dataFim,
    dia_inteiro: evento.dia_inteiro,
    descricao: evento.descricao ?? '',
    concluido: evento.concluido,
    lembrete_modo: evento.lembrete_modo ?? 'nenhum',
    lembrete_intervalo_dias: evento.lembrete_intervalo_dias == null
      ? (evento.lembrete_modo === 'frequencia' ? '2' : '')
      : String(evento.lembrete_intervalo_dias),
    lembrete_datas: evento.lembrete_datas ?? [],
  } as EventoEditalFormInput
}

export function EventoForm({ initialValues, initialDate, onSubmit, onCancel, submitLabel = 'Salvar', loadingLabel = 'Salvando...' }: EventoFormProps) {
  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<EventoEditalFormInput, unknown, EventoEditalFormOutput>({
    resolver: zodResolver(eventoEditalSchema),
    defaultValues: buildDefaultValues(initialValues, initialDate),
  })

  // eslint-disable-next-line react-hooks/incompatible-library
  const diaInteiro = watch('dia_inteiro')
  const tipo = watch('tipo')
  const dataInicio = watch('data_inicio')
  const dataFim = watch('data_fim')
  const lembreteModo = watch('lembrete_modo')
  const lembreteIntervalo = watch('lembrete_intervalo_dias')
  const lembreteDatas = watch('lembrete_datas')
  const periodoDatas = tipo === 'inscricao' && diaInteiro && dataInicio && dataFim
    ? listPeriodDates(dataInicio, dataFim)
    : []
  const datasAlternadas = lembreteModo === 'frequencia'
    ? buildFrequencyReminderDates(dataInicio, dataFim, Number(lembreteIntervalo))
    : []

  async function handleFormSubmit(values: EventoEditalFormOutput) {
    const lembrete_datas = values.lembrete_modo === 'datas'
      ? [...new Set([values.data_inicio, ...values.lembrete_datas, values.data_fim].filter((date): date is string => Boolean(date)))].sort()
      : []
    await onSubmit({
      ...values,
      lembrete_intervalo_dias: values.lembrete_modo === 'frequencia' ? values.lembrete_intervalo_dias : null,
      lembrete_datas,
    })
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} noValidate className="evento-form" aria-busy={isSubmitting}>
      <fieldset disabled={isSubmitting} className="evento-form-fields">
        <div className="form-field">
          <label htmlFor="evento-titulo">Título *</label>
          <input
            id="evento-titulo"
            type="text"
            {...register('titulo')}
            aria-invalid={Boolean(errors.titulo)}
            aria-describedby={errors.titulo ? 'evento-titulo-error' : undefined}
          />
          {errors.titulo && <p id="evento-titulo-error" className="field-error">{errors.titulo.message}</p>}
        </div>

        <div className="form-field">
          <label htmlFor="evento-tipo">Tipo *</label>
          <select
            id="evento-tipo"
            {...register('tipo')}
            onChange={(event) => {
              const nextType = event.target.value
              setValue('tipo', nextType as EventoEditalFormInput['tipo'])
              if (nextType !== 'inscricao') {
                setValue('lembrete_modo', 'nenhum')
                setValue('lembrete_intervalo_dias', '')
                setValue('lembrete_datas', [])
              }
            }}
            aria-invalid={Boolean(errors.tipo)}
            aria-describedby={errors.tipo ? 'evento-tipo-error' : undefined}
          >
            {EVENTO_TIPOS.map((value) => (
              <option key={value} value={value}>{EVENTO_TIPO_LABELS[value]}</option>
            ))}
          </select>
          {errors.tipo && <p id="evento-tipo-error" className="field-error">{errors.tipo.message}</p>}
        </div>

        <div className="form-field">
          <label className="checkbox-label">
            <input
              type="checkbox"
              {...register('dia_inteiro')}
            />
            Dia inteiro
          </label>
        </div>

        <div className="form-row">
          <div className="form-field">
            <label htmlFor="evento-data-inicio">Data de início *</label>
            <input
              id="evento-data-inicio"
              type={diaInteiro ? 'date' : 'datetime-local'}
              {...register('data_inicio')}
              aria-invalid={Boolean(errors.data_inicio)}
              aria-describedby={errors.data_inicio ? 'evento-data-inicio-error' : undefined}
            />
          </div>

          <div className="form-field">
            <label htmlFor="evento-data-fim">Data de fim</label>
            <input
              id="evento-data-fim"
              type={diaInteiro ? 'date' : 'datetime-local'}
              {...register('data_fim')}
              aria-invalid={Boolean(errors.data_fim)}
              aria-describedby={errors.data_fim ? 'evento-data-fim-error' : undefined}
            />
          </div>
        </div>

        {errors.data_inicio && <p id="evento-data-inicio-error" className="field-error">{errors.data_inicio.message}</p>}
        {errors.data_fim && <p id="evento-data-fim-error" className="field-error">{errors.data_fim.message}</p>}

        {(tipo === 'inscricao' || lembreteModo !== 'nenhum') && <section className="enrollment-reminder-settings" aria-labelledby="enrollment-reminder-title">
          <h3 id="enrollment-reminder-title">Lembretes no período de inscrição</h3>
          <p>Escolha uma frequência ou marque datas específicas. O primeiro e o último dia sempre terão lembrete.</p>
          <div className="form-field">
            <label htmlFor="evento-lembrete-modo">Como lembrar?</label>
            <select id="evento-lembrete-modo" {...register('lembrete_modo')} onChange={(event) => {
              const mode = event.target.value as EventoEditalFormInput['lembrete_modo']
              setValue('lembrete_modo', mode)
              setValue('lembrete_intervalo_dias', mode === 'frequencia' ? (lembreteIntervalo || '2') : '')
              if (mode !== 'datas') setValue('lembrete_datas', [])
            }}>
              <option value="nenhum">Sem lembretes recorrentes</option>
              <option value="frequencia">Repetir a cada intervalo</option>
              <option value="datas">Escolher datas específicas</option>
            </select>
          </div>

          {lembreteModo !== 'nenhum' && (!dataFim || !diaInteiro) && <p className="field-error">Defina início e fim e marque o evento como dia inteiro para configurar lembretes.</p>}

          {lembreteModo === 'frequencia' && <>
            <div className="form-field">
              <label htmlFor="evento-lembrete-intervalo">Intervalo em dias</label>
              <input id="evento-lembrete-intervalo" type="number" min="1" max="30" {...register('lembrete_intervalo_dias')} aria-invalid={Boolean(errors.lembrete_intervalo_dias)} />
              <span className="field-hint">Inclui o primeiro dia, o dia seguinte, repete pelo intervalo e inclui o último dia.</span>
              {errors.lembrete_intervalo_dias && <p className="field-error">{errors.lembrete_intervalo_dias.message}</p>}
            </div>
            {datasAlternadas.length > 0 && <p className="enrollment-reminder-preview"><strong>Datas:</strong> {datasAlternadas.map((date) => new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'UTC' }).format(new Date(`${date}T00:00:00Z`))).join(', ')}</p>}
          </>}

          {lembreteModo === 'datas' && periodoDatas.length > 0 && <div className="enrollment-reminder-date-grid" aria-label="Selecione as datas de lembrete">
            {periodoDatas.map((date, index) => {
              const endpoint = index === 0 || index === periodoDatas.length - 1
              const checked = endpoint || lembreteDatas.includes(date)
              return <label key={date} className="checkbox-label enrollment-reminder-date">
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={endpoint}
                  onChange={(event) => setValue('lembrete_datas', event.target.checked
                    ? [...lembreteDatas, date]
                    : lembreteDatas.filter((selected) => selected !== date))}
                />
                {new Intl.DateTimeFormat('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', timeZone: 'UTC' }).format(new Date(`${date}T00:00:00Z`))}{endpoint && <span className="field-hint">{index === 0 ? 'Início' : 'Fim'}</span>}
              </label>
            })}
          </div>}
          {errors.lembrete_datas && <p className="field-error">{errors.lembrete_datas.message}</p>}
        </section>}

        <div className="form-field">
          <label htmlFor="evento-descricao">Descrição</label>
          <textarea
            id="evento-descricao"
            rows={3}
            {...register('descricao')}
          />
        </div>
      </fieldset>

      <div className="form-actions">
        <button type="button" className="button button-secondary" onClick={onCancel} disabled={isSubmitting}>
          Cancelar
        </button>
        <button type="submit" className="button button-primary" disabled={isSubmitting}>
          {isSubmitting && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
          {isSubmitting ? loadingLabel : submitLabel}
        </button>
      </div>
    </form>
  )
}
