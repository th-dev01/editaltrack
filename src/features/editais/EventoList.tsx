import { useCallback, useEffect, useState } from 'react'
import { Plus, CalendarDays, CloudUpload, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { EventoCard } from './EventoCard'
import { EventoForm } from './EventoForm'
import { getEventosByEdital, createEvento, updateEvento, deleteEvento, toggleEventoConcluido } from '../../services/eventos.service'
import { EmptyState } from '../../components/EmptyState'
import type { EventoEdital } from '../../types/edital'
import type { EventoEditalFormOutput } from './evento-edital-schema'
import { deleteGoogleEvent, getGoogleConnectionStatus, markGoogleEventPending, syncEvento, syncEventosBatch } from '../../services/google-calendar.service'
import { DISCONNECTED_GOOGLE_STATUS, type BatchSyncResult, type GoogleConnectionStatus } from '../../types/google-calendar'
import { formatPeriod } from '../../lib/date'
import { EVENTO_TIPO_LABELS } from './evento-options'

interface EventoListProps {
  editalId: string
  onEventoChange?: () => void
}

export function EventoList({ editalId, onEventoChange }: EventoListProps) {
  const [eventos, setEventos] = useState<EventoEdital[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingEvento, setEditingEvento] = useState<EventoEdital | null>(null)
  const [deletingEvento, setDeletingEvento] = useState<EventoEdital | null>(null)
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create')
  const [googleConnection, setGoogleConnection] = useState<GoogleConnectionStatus>(DISCONNECTED_GOOGLE_STATUS)
  const [googleBusyEvent, setGoogleBusyEvent] = useState<string | null>(null)
  const [googleActionError, setGoogleActionError] = useState<string | null>(null)
  const [showBatchDialog, setShowBatchDialog] = useState(false)
  const [batchEventIds, setBatchEventIds] = useState<string[]>([])
  const [batchLoading, setBatchLoading] = useState(false)
  const [batchSummary, setBatchSummary] = useState<BatchSyncResult | null>(null)
  const [deleteGoogleError, setDeleteGoogleError] = useState<string | null>(null)

  const loadEventos = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true)
    setError(null)
    try {
      const data = await getEventosByEdital(editalId)
      setEventos(data)
    } catch {
      setError('Não foi possível carregar os eventos. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }, [editalId])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadEventos()
  }, [loadEventos])

  useEffect(() => {
    let active = true
    getGoogleConnectionStatus().then((status) => {
      if (active) setGoogleConnection(status)
    }).catch(() => {
      if (active) setGoogleConnection(DISCONNECTED_GOOGLE_STATUS)
    })
    return () => { active = false }
  }, [])

  const handleCreate = async (values: EventoEditalFormOutput) => {
    try {
      await createEvento({ edital_id: editalId, ...values })
      await loadEventos(false)
      onEventoChange?.()
    } catch {
      setError('Não foi possível criar o evento. Tente novamente.')
    }
  }

  const handleEdit = async (values: EventoEditalFormOutput) => {
    if (!editingEvento) return
    try {
      await updateEvento(editingEvento.id, values)
      const needsGoogleUpdate = Boolean(editingEvento.google_event_id)
      const editedEventId = editingEvento.id
      setEditingEvento(null)
      setFormMode('create')
      setShowForm(false)
      if (needsGoogleUpdate) {
        setGoogleBusyEvent(editedEventId)
        try {
          await markGoogleEventPending(editedEventId)
        } catch {
          // The following backend sync re-reads ownership and persists its final state.
        }
        try {
          const result = await syncEvento(editedEventId)
          if (!result.synced) setGoogleActionError(result.message ?? 'As alterações foram salvas no EditalTrack, mas não no Google Calendar.')
        } catch {
          setGoogleActionError('As alterações foram salvas no EditalTrack, mas não foi possível atualizar o Google Calendar.')
        } finally {
          setGoogleBusyEvent(null)
        }
      }
      await loadEventos(false)
      onEventoChange?.()
    } catch {
      setError('Não foi possível atualizar o evento. Tente novamente.')
    }
  }

  const handleDelete = async (removeRemote = false) => {
    if (!deletingEvento) return
    setDeleteGoogleError(null)
    if (removeRemote && deletingEvento.google_event_id) {
      try {
        await deleteGoogleEvent(deletingEvento.id)
      } catch {
        setDeleteGoogleError('Não foi possível excluir do Google Calendar. O evento interno foi mantido.')
        await loadEventos(false)
        return
      }
    }
    try {
      await deleteEvento(deletingEvento.id)
      setDeletingEvento(null)
      await loadEventos(false)
      onEventoChange?.()
    } catch {
      setError(removeRemote ? 'O evento Google foi removido, mas não foi possível excluir o evento interno.' : 'Não foi possível excluir o evento. Tente novamente.')
    }
  }

  async function handleGoogleSync(evento: EventoEdital) {
    setGoogleBusyEvent(evento.id)
    setGoogleActionError(null)
    try {
      const result = await syncEvento(evento.id)
      if (!result.synced) setGoogleActionError(result.message ?? 'Não foi possível sincronizar o evento.')
      if (result.errorCode === 'connection_expired') {
        getGoogleConnectionStatus().then(setGoogleConnection).catch(() => undefined)
      }
      await loadEventos(false)
    } catch {
      setGoogleActionError('Não foi possível sincronizar o evento. Tente novamente.')
    } finally {
      setGoogleBusyEvent(null)
    }
  }

  async function handleGoogleRemove(evento: EventoEdital) {
    setGoogleBusyEvent(evento.id)
    setGoogleActionError(null)
    try {
      await deleteGoogleEvent(evento.id)
      await loadEventos(false)
    } catch (actionError) {
      setGoogleActionError(actionError instanceof Error ? actionError.message : 'Não foi possível remover o evento do Google Calendar.')
      await loadEventos(false)
    } finally {
      setGoogleBusyEvent(null)
    }
  }

  function openBatchDialog() {
    const initialIds = eventos.filter((evento) => !evento.concluido && (
      !evento.google_event_id || evento.google_sync_status === 'error'
    )).map((evento) => evento.id)
    setBatchEventIds(initialIds)
    setBatchSummary(null)
    setShowBatchDialog(true)
  }

  async function handleBatchSync() {
    setBatchLoading(true)
    setBatchSummary(null)
    setGoogleActionError(null)
    try {
      const summary = await syncEventosBatch(batchEventIds)
      setBatchSummary(summary)
      setBatchEventIds(summary.results.filter((item) => !item.synced).map((item) => item.eventId))
      await loadEventos(false)
    } catch {
      setGoogleActionError('Não foi possível sincronizar o cronograma. Tente novamente.')
    } finally {
      setBatchLoading(false)
    }
  }

  const handleToggleConcluido = async (evento: EventoEdital, concluido: boolean) => {
    try {
      await toggleEventoConcluido(evento.id, concluido)
      await loadEventos()
      onEventoChange?.()
    } catch {
      setError('Não foi possível atualizar o evento. Tente novamente.')
    }
  }

  const openCreateForm = () => {
    setEditingEvento(null)
    setFormMode('create')
    setShowForm(true)
  }

  const openEditForm = (evento: EventoEdital) => {
    setEditingEvento(evento)
    setFormMode('edit')
    setShowForm(true)
  }

  const confirmDelete = (evento: EventoEdital) => {
    setDeletingEvento(evento)
  }

  const closeForm = () => {
    setShowForm(false)
    setEditingEvento(null)
    setFormMode('create')
  }

  const cancelDelete = () => {
    setDeletingEvento(null)
  }

  if (loading) {
    return (
      <div className="evento-list-loading">
        <div className="loading-spinner" aria-hidden="true" />
        <p>Carregando eventos...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="error-state">
        <p>{error}</p>
        <button type="button" className="button button-secondary" onClick={() => loadEventos()}>
          Tentar novamente
        </button>
      </div>
    )
  }

  return (
    <div className="evento-list">
      <div className="evento-list-header">
        <h3>
          <CalendarDays size={18} aria-hidden="true" />
          Cronograma
        </h3>
        <div className="evento-list-header-actions">
          {googleConnection.connected && !googleConnection.reauthRequired && eventos.length > 0 && <button type="button" className="button button-secondary button-sm" onClick={openBatchDialog}><CloudUpload size={15} /> Sincronizar cronograma</button>}
          <button type="button" className="button button-primary" onClick={openCreateForm}>
            <Plus size={16} aria-hidden="true" />
            Adicionar evento
          </button>
        </div>
      </div>

      {googleConnection.reauthRequired && <p className="google-sync-notice" role="status">Sua conexão com o Google expirou ou foi revogada. <Link to="/configuracoes">Reconecte sua conta</Link>.</p>}
      {googleActionError && <p className="google-sync-alert" role="alert">{googleActionError} {!googleConnection.connected && <Link to="/configuracoes">Ir para Configurações</Link>}</p>}

      {eventos.length === 0 ? (
        <EmptyState
          compact
          icon={CalendarDays}
          title="Nenhum evento cadastrado"
          description="Adicione as datas importantes do edital para acompanhar os prazos."
          action={
            <button type="button" className="button button-primary" onClick={openCreateForm}>
              <Plus size={16} aria-hidden="true" />
              Adicionar primeiro evento
            </button>
          }
        />
      ) : (
        <div className="evento-cards">
          {eventos.map((evento) => (
            <EventoCard
              key={evento.id}
              evento={evento}
              onEdit={openEditForm}
              onDelete={confirmDelete}
              onToggleConcluido={handleToggleConcluido}
              googleConnected={googleConnection.connected}
              googleReauthRequired={googleConnection.reauthRequired}
              googleBusy={googleBusyEvent === evento.id}
              onGoogleSync={handleGoogleSync}
              onGoogleRemove={handleGoogleRemove}
            />
          ))}
        </div>
      )}

      {showForm && (
        <div className="evento-form-overlay" onClick={closeForm}>
          <div className="evento-form-panel panel" onClick={(e) => e.stopPropagation()}>
            <div className="panel-heading">
              <h2>{formMode === 'create' ? 'Novo evento' : 'Editar evento'}</h2>
              <button type="button" className="button button-ghost" onClick={closeForm}>Fechar</button>
            </div>
            <EventoForm
              initialValues={editingEvento ?? undefined}
              onSubmit={formMode === 'create' ? handleCreate : handleEdit}
              onCancel={closeForm}
              submitLabel={formMode === 'create' ? 'Cadastrar evento' : 'Salvar alterações'}
              loadingLabel={formMode === 'create' ? 'Cadastrando...' : 'Salvando...'}
            />
          </div>
        </div>
      )}

      {deletingEvento && (
        <div className="evento-form-overlay" onClick={cancelDelete}>
          <div className="evento-form-panel panel" role="dialog" aria-modal="true" aria-labelledby="delete-event-title" onClick={(e) => e.stopPropagation()}>
            <div className="panel-heading">
              <h2 id="delete-event-title">Excluir evento</h2>
            </div>
            <div className="delete-confirm">
              <p>Tem certeza que deseja excluir <strong>{deletingEvento.titulo}</strong>?</p>
              <p className="text-muted">Esta ação não poderá ser desfeita.</p>
              {deletingEvento.google_event_id && <p className="google-delete-warning">Este evento também está no Google Calendar.</p>}
              {deleteGoogleError && <p role="alert" className="field-error">{deleteGoogleError}</p>}
              <div className="form-actions">
                <button type="button" className="button button-secondary" onClick={cancelDelete}>
                  Cancelar
                </button>
                {deletingEvento.google_event_id ? <>
                  <button type="button" className="button button-secondary" onClick={() => handleDelete(false)}>Excluir apenas do EditalTrack</button>
                  <button type="button" className="button button-danger" onClick={() => handleDelete(true)}>Excluir do Google e do EditalTrack</button>
                </> : <button type="button" className="button button-danger" onClick={() => handleDelete(false)}>Excluir evento</button>}
              </div>
            </div>
          </div>
        </div>
      )}

      {showBatchDialog && <div className="evento-form-overlay" onClick={() => setShowBatchDialog(false)}>
        <div className="panel google-batch-dialog" role="dialog" aria-modal="true" aria-labelledby="google-batch-title" onClick={(event) => event.stopPropagation()}>
          <div className="panel-heading"><h2 id="google-batch-title">Sincronizar com Google Calendar</h2><button type="button" className="button button-ghost" aria-label="Fechar" onClick={() => setShowBatchDialog(false)}><X size={18} /></button></div>
          <p className="google-batch-intro">Selecione os eventos que deseja adicionar ou atualizar. Eventos já sincronizados não são selecionados automaticamente.</p>
          <div className="google-batch-events">{eventos.map((evento) => <label key={evento.id} className="google-batch-event">
            <input type="checkbox" checked={batchEventIds.includes(evento.id)} disabled={batchLoading || evento.google_sync_status === 'syncing' || (!batchEventIds.includes(evento.id) && batchEventIds.length >= 25)} onChange={(change) => setBatchEventIds((current) => change.target.checked ? [...current, evento.id] : current.filter((id) => id !== evento.id))} />
            <span><strong>{evento.titulo}</strong><small>{EVENTO_TIPO_LABELS[evento.tipo]} · {formatPeriod(evento.data_inicio, evento.data_fim)}{evento.google_event_id ? ' · já sincronizado (será atualizado)' : ''}</small></span>
          </label>)}</div>
          {batchEventIds.length >= 25 && <p className="google-batch-limit" role="status">Selecione no máximo 25 eventos por lote.</p>}
          {batchSummary && <div className={batchSummary.failedCount ? 'google-batch-result has-errors' : 'google-batch-result'} role="status">{batchSummary.syncedCount} sincronizado{batchSummary.syncedCount === 1 ? '' : 's'}. {batchSummary.failedCount} falhou/falharam.{batchSummary.results.filter((item) => !item.synced).map((item) => <p key={item.eventId}>{eventos.find((evento) => evento.id === item.eventId)?.titulo}: {item.message}</p>)}</div>}
          <div className="form-actions google-batch-actions"><button type="button" className="button button-secondary" onClick={() => setShowBatchDialog(false)}>Fechar</button><button type="button" className="button button-primary" onClick={handleBatchSync} disabled={batchLoading || batchEventIds.length === 0}>{batchLoading ? 'Sincronizando...' : batchSummary?.failedCount ? 'Tentar novamente' : `Sincronizar selecionados (${batchEventIds.length})`}</button></div>
        </div>
      </div>}
    </div>
  )
}
