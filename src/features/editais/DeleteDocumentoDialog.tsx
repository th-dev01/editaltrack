import { useState } from 'react'
import { Trash2 } from 'lucide-react'

interface DeleteDocumentoDialogProps {
  open: boolean
  onConfirm: () => void
  onCancel: () => void
  documentoNome?: string
}

export function DeleteDocumentoDialog({ open, onConfirm, onCancel, documentoNome }: DeleteDocumentoDialogProps) {
  const [deleting, setDeleting] = useState(false)

  if (!open) return null

  async function handleConfirm() {
    setDeleting(true)
    try {
      await onConfirm()
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="dialog-overlay" role="dialog" aria-modal="true" aria-labelledby="delete-documento-title">
      <div className="dialog">
        <div className="dialog-header">
          <span className="dialog-icon">
            <Trash2 size={22} aria-hidden="true" />
          </span>
          <h2 id="delete-documento-title">Excluir documento</h2>
        </div>
        <div className="dialog-body">
          <p>Tem certeza que deseja excluir <strong>{documentoNome || 'este documento'}</strong>?</p>
          <p className="dialog-warning">Esta ação não poderá ser desfeita.</p>
        </div>
        <div className="dialog-actions">
          <button type="button" className="button button-secondary" onClick={onCancel} disabled={deleting}>
            Cancelar
          </button>
          <button type="button" className="button button-danger" onClick={handleConfirm} disabled={deleting}>
            {deleting ? 'Excluindo...' : 'Excluir documento'}
          </button>
        </div>
      </div>
    </div>
  )
}