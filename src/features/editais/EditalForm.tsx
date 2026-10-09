import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { editalSchema, type EditalFormInput, type EditalFormOutput } from './edital-schema'
import { CATEGORIAS, ESTADOS, EDITAL_MODALIDADES, EDITAIS_STATUS, MODALIDADE_LABELS, STATUS_LABELS } from './edital-options'
import type { Edital } from '../../types/edital'

interface EditalFormProps {
  initialValues?: Edital
  onSubmit: (values: EditalFormOutput) => Promise<void>
  onCancel: () => void
  submitLabel?: string
  loadingLabel?: string
}

function buildDefaultValues(edital?: Edital): EditalFormInput {
  if (!edital) {
    return {
      titulo: '',
      instituicao: '',
      categoria: '' as EditalFormInput['categoria'],
      numero_edital: '',
      cargo_curso: '',
      descricao: '',
      cidade: '',
      estado: '' as EditalFormInput['estado'],
      modalidade: 'nao_informado',
      link_pagina: '',
      link_inscricao: '',
      link_pdf: '',
      valor_inscricao: '',
      possui_isencao: false,
      status: 'encontrado',
      favorito: false,
      observacoes: '',
      inscricao_realizada: false,
    }
  }

  const estadoValue = edital.estado ?? ''
  return {
    titulo: edital.titulo,
    instituicao: edital.instituicao,
    categoria: edital.categoria,
    numero_edital: edital.numero_edital ?? '',
    cargo_curso: edital.cargo_curso ?? '',
    descricao: edital.descricao ?? '',
    cidade: edital.cidade ?? '',
    estado: estadoValue as EditalFormInput['estado'],
    modalidade: edital.modalidade ?? 'nao_informado',
    link_pagina: edital.link_pagina ?? '',
    link_inscricao: edital.link_inscricao ?? '',
    link_pdf: edital.link_pdf ?? '',
    valor_inscricao: edital.valor_inscricao != null ? String(edital.valor_inscricao).replace('.', ',') : '',
    possui_isencao: edital.possui_isencao,
    status: edital.status,
    favorito: edital.favorito,
    observacoes: edital.observacoes ?? '',
    inscricao_realizada: edital.inscricao_realizada,
  }
}

export function EditalForm({ initialValues, onSubmit, onCancel, submitLabel = 'Salvar', loadingLabel = 'Salvando...' }: EditalFormProps) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<EditalFormInput, unknown, EditalFormOutput>({
    resolver: zodResolver(editalSchema),
    defaultValues: buildDefaultValues(initialValues),
  })

  async function handleFormSubmit(values: EditalFormOutput) {
    await onSubmit(values)
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} noValidate className="edital-form" aria-busy={isSubmitting}>
      <fieldset disabled={isSubmitting} className="edital-form-fields">
        <div className="form-section">
          <h3 className="form-section-title">Informações básicas</h3>

          <div className="form-field">
            <label htmlFor="titulo">Título *</label>
            <input
              id="titulo"
              type="text"
              {...register('titulo')}
              aria-invalid={Boolean(errors.titulo)}
              aria-describedby={errors.titulo ? 'titulo-error' : undefined}
            />
            {errors.titulo && <p id="titulo-error" className="field-error">{errors.titulo.message}</p>}
          </div>

          <div className="form-field">
            <label htmlFor="instituicao">Instituição *</label>
            <input
              id="instituicao"
              type="text"
              {...register('instituicao')}
              aria-invalid={Boolean(errors.instituicao)}
              aria-describedby={errors.instituicao ? 'instituicao-error' : undefined}
            />
            {errors.instituicao && <p id="instituicao-error" className="field-error">{errors.instituicao.message}</p>}
          </div>

          <div className="form-field">
            <label htmlFor="numero_edital">Número do edital</label>
            <input
              id="numero_edital"
              type="text"
              {...register('numero_edital')}
            />
          </div>

          <div className="form-field">
            <label htmlFor="categoria">Categoria *</label>
            <select
              id="categoria"
              {...register('categoria')}
              aria-invalid={Boolean(errors.categoria)}
              aria-describedby={errors.categoria ? 'categoria-error' : undefined}
            >
              <option value="">Selecione uma categoria</option>
              {CATEGORIAS.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            {errors.categoria && <p id="categoria-error" className="field-error">{errors.categoria.message}</p>}
          </div>

          <div className="form-field">
            <label htmlFor="cargo_curso">Cargo / curso / função</label>
            <input
              id="cargo_curso"
              type="text"
              {...register('cargo_curso')}
            />
          </div>

          <div className="form-field">
            <label htmlFor="descricao">Descrição</label>
            <textarea
              id="descricao"
              rows={4}
              {...register('descricao')}
            />
          </div>
        </div>

        <div className="form-section">
          <h3 className="form-section-title">Localização</h3>

          <div className="form-row">
            <div className="form-field">
              <label htmlFor="cidade">Cidade</label>
              <input
                id="cidade"
                type="text"
                {...register('cidade')}
              />
            </div>

            <div className="form-field">
              <label htmlFor="estado">Estado</label>
              <select
                id="estado"
                {...register('estado')}
              >
                <option value="">Selecione</option>
                {ESTADOS.map((uf) => (
                  <option key={uf} value={uf}>{uf}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-field">
            <label htmlFor="modalidade">Modalidade</label>
            <select
              id="modalidade"
              {...register('modalidade')}
            >
              {EDITAL_MODALIDADES.map((value) => (
                <option key={value} value={value}>{MODALIDADE_LABELS[value]}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-section">
          <h3 className="form-section-title">Links</h3>

          <div className="form-field">
            <label htmlFor="link_pagina">Link da página oficial</label>
            <input
              id="link_pagina"
              type="url"
              placeholder="https://..."
              {...register('link_pagina')}
              aria-invalid={Boolean(errors.link_pagina)}
              aria-describedby={errors.link_pagina ? 'link_pagina-error' : undefined}
            />
            {errors.link_pagina && <p id="link_pagina-error" className="field-error">{errors.link_pagina.message}</p>}
          </div>

          <div className="form-field">
            <label htmlFor="link_inscricao">Link da inscrição</label>
            <input
              id="link_inscricao"
              type="url"
              placeholder="https://..."
              {...register('link_inscricao')}
              aria-invalid={Boolean(errors.link_inscricao)}
              aria-describedby={errors.link_inscricao ? 'link_inscricao-error' : undefined}
            />
            {errors.link_inscricao && <p id="link_inscricao-error" className="field-error">{errors.link_inscricao.message}</p>}
          </div>

          <div className="form-field">
            <label htmlFor="link_pdf">Link direto do PDF</label>
            <input
              id="link_pdf"
              type="url"
              placeholder="https://..."
              {...register('link_pdf')}
              aria-invalid={Boolean(errors.link_pdf)}
              aria-describedby={errors.link_pdf ? 'link_pdf-error' : undefined}
            />
            {errors.link_pdf && <p id="link_pdf-error" className="field-error">{errors.link_pdf.message}</p>}
          </div>
        </div>

        <div className="form-section">
          <h3 className="form-section-title">Inscrição</h3>

          <div className="form-field">
            <label htmlFor="valor_inscricao">Valor da inscrição</label>
            <input
              id="valor_inscricao"
              type="text"
              inputMode="decimal"
              placeholder="0,00"
              {...register('valor_inscricao')}
              aria-invalid={Boolean(errors.valor_inscricao)}
              aria-describedby={errors.valor_inscricao ? 'valor_inscricao-error' : undefined}
            />
            {errors.valor_inscricao && <p id="valor_inscricao-error" className="field-error">{errors.valor_inscricao.message}</p>}
          </div>

          <div className="form-field">
            <label className="checkbox-label">
              <input
                type="checkbox"
                {...register('possui_isencao')}
              />
              Possui isenção
            </label>
          </div>

          <div className="form-field">
            <label className="checkbox-label">
              <input
                type="checkbox"
                {...register('inscricao_realizada')}
              />
              Inscrição realizada
            </label>
          </div>
        </div>

        <div className="form-section">
          <h3 className="form-section-title">Organização</h3>

          <div className="form-field">
            <label htmlFor="status">Status</label>
            <select
              id="status"
              {...register('status')}
            >
              {EDITAIS_STATUS.map((value) => (
                <option key={value} value={value}>{STATUS_LABELS[value]}</option>
              ))}
            </select>
          </div>

          <div className="form-field">
            <label className="checkbox-label">
              <input
                type="checkbox"
                {...register('favorito')}
              />
              Favorito
            </label>
          </div>

          <div className="form-field">
            <label htmlFor="observacoes">Observações</label>
            <textarea
              id="observacoes"
              rows={3}
              {...register('observacoes')}
            />
          </div>
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