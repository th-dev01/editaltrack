import { useState, useEffect, useCallback } from 'react'
import { Plus, FileCheck2 } from 'lucide-react'
import { DocumentoCard } from './DocumentoCard'
import { DocumentoForm } from './DocumentoForm'
import { AdicionarDocumentosDialog } from './AdicionarDocumentosDialog'
import { DocumentProgress } from './DocumentProgress'
import { getDocumentosByEdital, createDocumento, updateDocumento, deleteDocumento, toggleProvidenciado, toggleEnviado, createDocumentosBatch } from '../../services/documentos.service'
import { EmptyState } from '../../components/EmptyState'
import type { DocumentoEdital } from '../../types/edital'
import type { DocumentoEditalFormOutput } from './documento-edital-schema'

interface DocumentoListProps {
  editalId: string
  onDocumentoChange?: () => void
}

export function DocumentoList({ editalId, onDocumentoChange }: DocumentoListProps) {
  const [documentos, setDocumentos] = useState<DocumentoEdital[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingDocumento, setEditingDocumento] = useState<DocumentoEdital | null>(null)
  const [deletingDocumento, setDeletingDocumento] = useState<DocumentoEdital | null>(null)
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create')
  const [showAdicionarDialog, setShowAdicionarDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  const loadDocumentos = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getDocumentosByEdital(editalId)
      setDocumentos(data)
    } catch {
      setError('Não foi possível carregar os documentos. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }, [editalId])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadDocumentos()
  }, [loadDocumentos])

  const handleCreate = async (values: DocumentoEditalFormOutput) => {
    try {
      await createDocumento({ edital_id: editalId, ...values })
      await loadDocumentos()
      onDocumentoChange?.()
    } catch {
      setError('Não foi possível criar o documento. Tente novamente.')
    }
  }

  const handleEdit = async (values: DocumentoEditalFormOutput) => {
    if (!editingDocumento) return
    try {
      await updateDocumento(editingDocumento.id, values)
      setEditingDocumento(null)
      setFormMode('create')
      setShowForm(false)
      await loadDocumentos()
      onDocumentoChange?.()
    } catch {
      setError('Não foi possível atualizar o documento. Tente novamente.')
    }
  }

  const handleDelete = async () => {
    if (!deletingDocumento) return
    try {
      await deleteDocumento(deletingDocumento.id)
      setDeletingDocumento(null)
      await loadDocumentos()
      onDocumentoChange?.()
    } catch {
      setError('Não foi possível excluir o documento. Tente novamente.')
    }
  }

  const handleToggleProvidenciado = async (documento: DocumentoEdital, providenciado: boolean) => {
    try {
      if (providenciado) {
        await toggleProvidenciado(documento.id, true)
      } else {
        // Ao desmarcar providenciado, também desmarca enviado
        await updateDocumento(documento.id, { providenciado: false, enviado: false })
      }
      await loadDocumentos()
      onDocumentoChange?.()
    } catch {
      setError('Não foi possível atualizar o documento. Tente novamente.')
    }
  }

  const handleToggleEnviado = async (documento: DocumentoEdital, enviado: boolean) => {
    try {
      if (enviado) {
        await toggleEnviado(documento.id, true)
      } else {
        await toggleEnviado(documento.id, false)
      }
      await loadDocumentos()
      onDocumentoChange?.()
    } catch {
      setError('Não foi possível atualizar o documento. Tente novamente.')
    }
  }

  const handleAdicionarVarios = async (documentos: Array<{ nome: string; obrigatorio: boolean }>) => {
    try {
      await createDocumentosBatch(editalId, documentos.map(d => ({
        edital_id: editalId,
        nome: d.nome,
        obrigatorio: d.obrigatorio,
        providenciado: false,
        enviado: false,
      })))
      await loadDocumentos()
      onDocumentoChange?.()
    } catch {
      setError('Não foi possível adicionar os documentos. Tente novamente.')
    }
  }

  const openCreateForm = () => {
    setEditingDocumento(null)
    setFormMode('create')
    setShowForm(true)
  }

  const openEditForm = (documento: DocumentoEdital) => {
    setEditingDocumento(documento)
    setFormMode('edit')
    setShowForm(true)
  }

  const confirmDelete = (documento: DocumentoEdital) => {
    setDeletingDocumento(documento)
    setShowDeleteDialog(true)
  }

  const closeForm = () => {
    setShowForm(false)
    setEditingDocumento(null)
    setFormMode('create')
  }

  const cancelDelete = () => {
    setDeletingDocumento(null)
    setShowDeleteDialog(false)
  }

  if (loading) {
    return (
      <div className="documento-list-loading">
        <div className="loading-spinner" aria-hidden="true" />
        <p>Carregando documentos...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="error-state">
        <p>{error}</p>
        <button type="button" className="button button-secondary" onClick={loadDocumentos}>
          Tentar novamente
        </button>
      </div>
    )
  }

  const obrigatorios = documentos.filter(d => d.obrigatorio)
  const providenciados = obrigatorios.filter(d => d.providenciado).length
  const totalObrigatorios = obrigatorios.length
  const enviadosTotal = documentos.filter(d => d.enviado).length

  return (
    <div className="documento-list">
      <div className="documento-list-header">
        <DocumentProgress
          providenciados={providenciados}
          total={totalObrigatorios}
          enviados={enviadosTotal}
        />
        <div className="documento-list-actions">
          <button type="button" className="button button-secondary" onClick={() => setShowAdicionarDialog(true)}>
            <FileCheck2 size={16} aria-hidden="true" />
            Adicionar vários
          </button>
          <button type="button" className="button button-primary" onClick={openCreateForm}>
            <Plus size={16} aria-hidden="true" />
            Adicionar documento
          </button>
        </div>
      </div>

      {documentos.length === 0 ? (
        <EmptyState
          compact
          icon={FileCheck2}
          title="Nenhum documento adicionado"
          description="Cadastre os documentos exigidos pelo edital para acompanhar sua preparação."
          action={
            <button type="button" className="button button-primary" onClick={openCreateForm}>
              <Plus size={16} aria-hidden="true" />
              Adicionar primeiro documento
            </button>
          }
        />
      ) : (
        <div className="documento-cards">
          {documentos.map((documento) => (
            <DocumentoCard
              key={documento.id}
              documento={documento}
              onEdit={openEditForm}
              onDelete={confirmDelete}
              onToggleProvidenciado={handleToggleProvidenciado}
              onToggleEnviado={handleToggleEnviado}
            />
          ))}
        </div>
      )}

      {showForm && (
        <div className="documento-form-overlay" onClick={closeForm}>
          <div className="documento-form-panel panel" onClick={(e) => e.stopPropagation()}>
            <div className="panel-heading">
              <h2>{formMode === 'create' ? 'Novo documento' : 'Editar documento'}</h2>
              <button type="button" className="button button-ghost" onClick={closeForm}>Fechar</button>
            </div>
            <DocumentoForm
              initialValues={editingDocumento ?? undefined}
              onSubmit={formMode === 'create' ? handleCreate : handleEdit}
              onCancel={closeForm}
              submitLabel={formMode === 'create' ? 'Cadastrar documento' : 'Salvar alterações'}
              loadingLabel={formMode === 'create' ? 'Cadastrando...' : 'Salvando...'}
            />
          </div>
        </div>
      )}

      {showDeleteDialog && (
        <div className="documento-form-overlay" onClick={() => { setShowDeleteDialog(false); setDeletingDocumento(null); }}>
          <div className="documento-form-panel panel" onClick={(e) => e.stopPropagation()}>
            <div className="panel-heading">
              <h2>Excluir documento</h2>
            </div>
            <div className="delete-confirm">
              <p>Tem certeza que deseja excluir <strong>{deletingDocumento?.nome}</strong>?</p>
              <p className="text-muted">Esta ação não poderá ser desfeita.</p>
              <div className="form-actions">
                <button type="button" className="button button-secondary" onClick={cancelDelete}>
                  Cancelar
                </button>
                <button type="button" className="button button-danger" onClick={handleDelete}>
                  Excluir documento
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAdicionarDialog && (
        <AdicionarDocumentosDialog
          open={showAdicionarDialog}
          onClose={() => setShowAdicionarDialog(false)}
          onConfirm={handleAdicionarVarios}
        />
      )}
    </div>
  )
}