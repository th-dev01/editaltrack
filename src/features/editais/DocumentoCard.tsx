import { FileText } from 'lucide-react'
import type { DocumentoEdital } from '../../types/edital'

interface DocumentoCardProps {
  documento: DocumentoEdital
  onEdit: (documento: DocumentoEdital) => void
  onDelete: (documento: DocumentoEdital) => void
  onToggleProvidenciado: (documento: DocumentoEdital, providenciado: boolean) => void
  onToggleEnviado: (documento: DocumentoEdital, enviado: boolean) => void
}

export function DocumentoCard({ documento, onEdit, onDelete, onToggleProvidenciado, onToggleEnviado }: DocumentoCardProps) {
  return (
    <article className={`documento-card ${documento.obrigatorio ? '' : 'documento-card--opcional'}`}>
      <div className="documento-card-main">
        <div className="documento-card-header-row">
          <div className="documento-card-tipo-row">
            {documento.obrigatorio ? (
              <span className="documento-card-badge badge--obrigatorio">Obrigatório</span>
            ) : (
              <span className="documento-card-badge badge--opcional">Opcional</span>
            )}
            <h3 className="documento-card-titulo">{documento.nome}</h3>
          </div>
        </div>

        {documento.descricao && (
          <p className="documento-card-descricao">{documento.descricao}</p>
        )}

        {documento.observacao && (
          <p className="documento-card-observacao">{documento.observacao}</p>
        )}

        <div className="documento-card-status">
          <div className="status-item">
            <label className="status-checkbox">
              <input
                type="checkbox"
                checked={documento.providenciado}
                onChange={(e) => onToggleProvidenciado(documento, e.target.checked)}
                disabled={documento.enviado}
              />
              <span className="status-label">Providenciado</span>
              {documento.enviado && !documento.providenciado && (
                <span className="status-hint">(auto ao enviar)</span>
              )}
            </label>
          </div>
          <div className="status-item">
            <label className="status-checkbox">
              <input
                type="checkbox"
                checked={documento.enviado}
                onChange={(e) => onToggleEnviado(documento, e.target.checked)}
              />
              <span className="status-label">Enviado</span>
            </label>
          </div>
        </div>
      </div>

      <div className="documento-card-actions">
        <button
          type="button"
          className="button button-secondary button-sm"
          onClick={() => onEdit(documento)}
        >
          <FileText size={14} aria-hidden="true" />
          Editar
        </button>
        <button
          type="button"
          className="button button-ghost button-sm"
          onClick={() => onDelete(documento)}
        >
          Excluir
        </button>
      </div>
    </article>
  )
}