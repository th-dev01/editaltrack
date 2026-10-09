import { Calendar, CheckCircle2, AlertTriangle, AlertCircle, Clock, CalendarDays } from 'lucide-react'
import { formatPeriod, formatTime, calcularUrgencia, getUrgenciaStyle } from '../../lib/date'
import { EVENTO_TIPO_LABELS } from './evento-options'
import type { EventoEdital } from '../../types/edital'
import { GoogleEventActions } from './GoogleEventActions'

interface EventoCardProps {
  evento: EventoEdital
  onEdit: (evento: EventoEdital) => void
  onDelete: (evento: EventoEdital) => void
  onToggleConcluido: (evento: EventoEdital, concluido: boolean) => void
  googleConnected: boolean
  googleReauthRequired: boolean
  googleBusy: boolean
  onGoogleSync: (evento: EventoEdital) => void
  onGoogleRemove: (evento: EventoEdital) => void
}

export function EventoCard({ evento, onEdit, onDelete, onToggleConcluido, googleConnected, googleReauthRequired, googleBusy, onGoogleSync, onGoogleRemove }: EventoCardProps) {
  const urgencia = calcularUrgencia(evento.data_inicio, evento.data_fim, evento.dia_inteiro, evento.concluido)
  const style = getUrgenciaStyle(urgencia.status)

  const periodo = formatPeriod(evento.data_inicio, evento.data_fim)

  const labelWithTime = evento.dia_inteiro ? periodo : `${periodo} ${evento.data_fim ? `até ${formatTime(evento.data_fim)}` : `às ${formatTime(evento.data_inicio)}`}`

  if (evento.concluido) {
    return (
      <article className="evento-card evento-card--concluido" style={{ borderColor: style.border }}>
        <div className="evento-card-header">
          <div className="evento-card-main">
            <div className="evento-card-tipo-row">
              <span className="evento-card-tipo-badge" style={{ backgroundColor: `${style.bg}40`, color: style.text }}>
                {EVENTO_TIPO_LABELS[evento.tipo]}
              </span>
              <h3 className="evento-card-titulo">{evento.titulo}</h3>
            </div>
            <div className="evento-card-periodo">
              <Calendar size={14} aria-hidden="true" />
              <span>{labelWithTime}</span>
            </div>
          </div>
          <div className="evento-card-status">
            <CheckCircle2 size={20} style={{ color: style.text }} aria-hidden="true" />
            <span className="evento-card-concluido-label" style={{ color: style.text }}>Concluído</span>
          </div>
        </div>

        <div className="evento-card-actions">
          <button
            type="button"
            className="button button-ghost button-sm"
            onClick={() => onEdit(evento)}
          >
            Editar
          </button>
          <button
            type="button"
            className="button button-danger button-sm"
            onClick={() => onDelete(evento)}
          >
            Excluir
          </button>
        </div>
        <GoogleEventActions evento={evento} connected={googleConnected} reauthRequired={googleReauthRequired} busy={googleBusy} onSync={() => onGoogleSync(evento)} onRemove={() => onGoogleRemove(evento)} />
      </article>
    )
  }

  const statusIcons = {
  today: AlertCircle,
  tomorrow: AlertTriangle,
  urgent: AlertTriangle,
  attention: Clock,
  normal: CalendarDays,
  expired: CalendarDays,
  future: CalendarDays,
  completed: CheckCircle2,
  default: CalendarDays,
} as const

const statusTexts = {
  today: 'Hoje',
  tomorrow: 'Amanhã',
  urgent: (days: number) => `Faltam ${days} dias`,
  attention: (days: number) => `Faltam ${days} dias`,
  normal: (days: number) => `Faltam ${days} dias`,
  expired: 'Encerrado',
  future: (days: number) => `Inicia em ${days} dias`,
  completed: 'Concluído',
  default: '',
} as const

const StatusIcon = statusIcons[urgencia.status] || statusIcons.default
const statusTextValue = statusTexts[urgencia.status]
  const statusText = typeof statusTextValue === 'function'
    ? statusTextValue(urgencia.daysRemaining ?? 0)
    : (statusTextValue ?? statusTexts.default)

  return (
    <article className="evento-card" style={{ borderColor: style.border }}>
      <div className="evento-card-header">
        <div className="evento-card-main">
          <div className="evento-card-tipo-row">
            <span className="evento-card-tipo-badge" style={{ backgroundColor: `${style.bg}40`, color: style.text }}>
              {EVENTO_TIPO_LABELS[evento.tipo]}
            </span>
            <h3 className="evento-card-titulo">{evento.titulo}</h3>
          </div>
          <div className="evento-card-periodo">
            <Calendar size={14} aria-hidden="true" />
            <span>{labelWithTime}</span>
          </div>
        </div>
        <div className="evento-card-urgencia" style={{ backgroundColor: `${style.bg}40`, color: style.text }}>
          <StatusIcon size={14} aria-hidden="true" />
          <span>{statusText}</span>
        </div>
      </div>

      {evento.descricao && (
        <p className="evento-card-descricao">{evento.descricao}</p>
      )}

      <div className="evento-card-actions">
        <button
          type="button"
          className="button button-secondary button-sm"
          onClick={() => onToggleConcluido(evento, true)}
        >
          <CheckCircle2 size={16} aria-hidden="true" />
          Concluir
        </button>
        <button
          type="button"
          className="button button-ghost button-sm"
          onClick={() => onEdit(evento)}
        >
          Editar
        </button>
        <button
          type="button"
          className="button button-danger button-sm"
          onClick={() => onDelete(evento)}
        >
          Excluir
        </button>
      </div>
      <GoogleEventActions evento={evento} connected={googleConnected} reauthRequired={googleReauthRequired} busy={googleBusy} onSync={() => onGoogleSync(evento)} onRemove={() => onGoogleRemove(evento)} />
    </article>
  )
}
