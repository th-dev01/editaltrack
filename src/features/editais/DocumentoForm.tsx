import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { documentoEditalSchema, type DocumentoEditalFormInput, type DocumentoEditalFormOutput } from './documento-edital-schema'
import { DOCUMENTO_SUGESTOES } from './documento-options'
import type { DocumentoEdital } from '../../types/edital'

interface DocumentoFormProps {
  initialValues?: DocumentoEdital
  onSubmit: (values: DocumentoEditalFormOutput) => Promise<void>
  onCancel: () => void
  submitLabel?: string
  loadingLabel?: string
}

function buildDefaultValues(documento?: DocumentoEdital): DocumentoEditalFormInput {
  if (!documento) {
    return {
      nome: '',
      descricao: '',
      obrigatorio: true,
      providenciado: false,
      enviado: false,
      observacao: '',
      ordem: 0,
    } as DocumentoEditalFormInput
  }

  return {
    nome: documento.nome,
    descricao: documento.descricao ?? '',
    obrigatorio: documento.obrigatorio,
    providenciado: documento.providenciado,
    enviado: documento.enviado,
    observacao: documento.observacao ?? '',
    ordem: documento.ordem,
  } as DocumentoEditalFormInput
}

export function DocumentoForm({ initialValues, onSubmit, onCancel, submitLabel = 'Salvar', loadingLabel = 'Salvando...' }: DocumentoFormProps) {
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<DocumentoEditalFormInput, unknown, DocumentoEditalFormOutput>({
    resolver: zodResolver(documentoEditalSchema),
    defaultValues: buildDefaultValues(initialValues),
  })

  // eslint-disable-next-line react-hooks/incompatible-library -- watch() from react-hook-form cannot be memoized safely, this is a known limitation
  const enviado = watch('enviado')

  async function handleFormSubmit(values: DocumentoEditalFormOutput) {
    await onSubmit(values)
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} noValidate className="documento-form" aria-busy={isSubmitting}>
      <fieldset disabled={isSubmitting} className="documento-form-fields">
        <div className="form-field">
          <label htmlFor="documento-nome">Nome *</label>
          <div className="nome-input-wrapper">
            <input
              id="documento-nome"
              type="text"
              {...register('nome')}
              aria-invalid={Boolean(errors.nome)}
              aria-describedby={errors.nome ? 'documento-nome-error' : undefined}
              list="documento-sugestoes"
            />
            <datalist id="documento-sugestoes">
              {DOCUMENTO_SUGESTOES.map((sugestao) => (
                <option key={sugestao} value={sugestao} />
              ))}
            </datalist>
          </div>
          {errors.nome && <p id="documento-nome-error" className="field-error">{errors.nome.message}</p>}
        </div>

        <div className="form-field">
          <label htmlFor="documento-descricao">Descrição</label>
          <textarea
            id="documento-descricao"
            rows={3}
            {...register('descricao')}
          />
        </div>

        <div className="form-row">
          <div className="form-field">
            <label className="checkbox-label">
              <input
                type="checkbox"
                {...register('obrigatorio')}
              />
              Obrigatório
            </label>
          </div>

          <div className="form-field">
            <label className="checkbox-label">
              <input
                type="checkbox"
                {...register('providenciado')}
                disabled={enviado}
              />
              Providenciado
            </label>
          </div>
        </div>

        <div className="form-row">
          <div className="form-field">
            <label className="checkbox-label">
              <input
                type="checkbox"
                {...register('enviado')}
              />
              Enviado
            </label>
          </div>

          <div className="form-field">
            <label htmlFor="documento-ordem">Ordem</label>
            <input
              id="documento-ordem"
              type="number"
              min="0"
              {...register('ordem', { valueAsNumber: true })}
              aria-invalid={Boolean(errors.ordem)}
              aria-describedby={errors.ordem ? 'documento-ordem-error' : undefined}
            />
            {errors.ordem && <p id="documento-ordem-error" className="field-error">{errors.ordem.message}</p>}
          </div>
        </div>

        <div className="form-field">
          <label htmlFor="documento-observacao">Observação</label>
          <textarea
            id="documento-observacao"
            rows={3}
            {...register('observacao')}
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