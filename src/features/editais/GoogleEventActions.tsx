import { useState } from 'react'
import { CalendarPlus, Check, ExternalLink, RefreshCw, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { EventoEdital } from '../../types/edital'

interface GoogleEventActionsProps {
  evento: EventoEdital
  connected: boolean
  reauthRequired?: boolean
  busy?: boolean
  onSync: () => void
  onRemove: () => void
}

function safeGoogleEventUrl(value: string | null | undefined): string | null {
  if (!value) return null
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:' || !['calendar.google.com', 'www.google.com'].includes(url.hostname)) return null
    return url.toString()
  } catch {
    return null
  }
}

export function GoogleEventActions({ evento, connected, reauthRequired = false, busy = false, onSync, onRemove }: GoogleEventActionsProps) {
  const [connectPrompt, setConnectPrompt] = useState(false)
  const status = evento.google_sync_status ?? 'not_synced'
  const linked = Boolean(evento.google_event_id)
  const eventUrl = safeGoogleEventUrl(evento.google_event_html_link)
  const needsReconnect = reauthRequired || evento.google_sync_error?.includes('Reconecte sua conta') === true

  function sync() {
    if (!connected || reauthRequired) {
      setConnectPrompt(true)
      return
    }
    setConnectPrompt(false)
    onSync()
  }

  return (
    <div className="google-event-actions">
      <span className={`google-sync-badge google-sync-badge--${status}`}>
        {status === 'synced' ? <><Check size={13} /> Google Calendar</> : status === 'syncing' ? 'Sincronizando...' : status === 'error' ? (linked ? 'Erro de sincronização' : 'Não sincronizado') : null}
      </span>
      {status === 'syncing' ? <button type="button" className="button button-ghost button-sm" disabled><RefreshCw size={14} className="animate-spin" /> Sincronizando</button> : needsReconnect ? <Link to="/configuracoes" className="button button-secondary button-sm">Reconectar Google</Link> : <button type="button" className="button button-ghost button-sm" onClick={sync} disabled={busy}>
        {linked ? <><RefreshCw size={14} /> Atualizar no Google</> : <><CalendarPlus size={14} /> Adicionar ao Google Calendar</>}
      </button>}
      {linked && <button type="button" className="button button-ghost button-sm" onClick={onRemove} disabled={busy}><Trash2 size={14} /> Remover do Google</button>}
      {eventUrl && <a className="button button-ghost button-sm" href={eventUrl} target="_blank" rel="noopener noreferrer"><ExternalLink size={14} /> Abrir no Google Calendar</a>}
      {connectPrompt && <p className="google-sync-help" role="status">{reauthRequired ? 'Sua conexão com o Google expirou ou foi revogada.' : 'Conecte sua conta Google primeiro.'} <Link to="/configuracoes">Ir para Configurações</Link></p>}
      {status === 'error' && evento.google_sync_error && <p className="google-sync-error" role="status">{evento.google_sync_error}</p>}
    </div>
  )
}
