import { Trash2, FileText } from 'lucide-react'
import type { DocumentoEdital } from '../../types/edital'

interface DocumentoItemProps {
  documento: DocumentoEdital
  onEdit: (documento: DocumentoEdital) => void
  onDelete: (documento: DocumentoEdital) => void
  onToggleProvidenciado: (documento: DocumentoEdital, providenciado: boolean) => void
  onToggleEnviado: (documento: DocumentoEdital, enviado: boolean) => void
}

export function DocumentoItem({ documento, onEdit, onDelete, onToggleProvidenciado, onToggleEnviado }: DocumentoItemProps) {
  return (
    <article className={`documento-item ${documento.obrigatorio ? '' : 'documento-item--opcional'}`}>
      <div className="documento-item-main">
        <div className="documento-item-header">
          <div className="documento-item-tipo-row">
            {documento.obrigatorio ? (
              <span className="documento-item-badge badge--obrigatorio">Obrigatório</span>
            ) : (
              <span className="documento-item-badge badge--opcional">Opcional</span>
            )}
            <h3 className="documento-item-titulo">{documento.nome}</h3>
          </div>

          <div className="documento-item-status">
            <div className="status-item">
              <label className="status-checkbox">
                <input
                  type="checkbox"
                  checked={documento.providenciado}
                  onChange={(e) => onToggleProvidenciado(documento, e.target.checked)}
                  disabled={documento.enviado}
                />
                <span className="status-label">Providenciado</span>
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

        {documento.descricao && (
          <p className="documento-item-descricao">{documento.descricao}</p>
        )}

        {documento.observacao && (
          <p className="documento-item-observacao">{documento.observacao}</p>
        )}
      </div>

      <div className="documento-item-actions">
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
          <Trash2 size={14} aria-hidden="true" />
          Excluir
        </button>
      </div>
    </article>
  )
}