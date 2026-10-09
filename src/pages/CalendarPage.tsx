import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, CalendarDays, Check, CheckCircle2, Clock3, List, Pencil, Plus, Search, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { EmptyState } from '../components/EmptyState'
import { PageHeader } from '../components/PageHeader'
import { EventoForm } from '../features/editais/EventoForm'
import { EVENTO_TIPOS, EVENTO_TIPO_LABELS } from '../features/editais/evento-options'
import { calcularUrgencia, formatDate, formatPeriod, formatTime, getTimezone, getUrgenciaStyle } from '../lib/date'
import { createEvento, getEventosByRange, toggleEventoConcluido, updateEvento } from '../services/eventos.service'
import { getEditais } from '../services/editais.service'
import type { Edital, EventoCalendario, EventoEdital } from '../types/edital'
import type { EventoEditalFormOutput } from '../features/editais/evento-edital-schema'
import { GoogleEventActions } from '../features/editais/GoogleEventActions'
import { deleteGoogleEvent, getGoogleConnectionStatus, markGoogleEventPending, syncEvento } from '../services/google-calendar.service'
import { DISCONNECTED_GOOGLE_STATUS, type GoogleConnectionStatus } from '../types/google-calendar'

type CalendarView = 'month' | 'list'
type CompletionFilter = 'pending' | 'completed' | 'all'

interface CalendarDay {
  key: string
  dayNumber: number
  inMonth: boolean
  isToday: boolean
}

const WEEKDAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

function dateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function keyInTimezone(value: string | Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: getTimezone(), year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date(value))
  const values = Object.fromEntries(parts.map(({ type, value: part }) => [type, part]))
  return `${values.year}-${values.month}-${values.day}`
}

function monthGrid(cursor: Date): CalendarDay[] {
  const year = cursor.getUTCFullYear()
  const month = cursor.getUTCMonth()
  const firstWeekday = new Date(Date.UTC(year, month, 1)).getUTCDay()
  const mondayOffset = (firstWeekday + 6) % 7
  const today = keyInTimezone(new Date())

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(Date.UTC(year, month, 1 - mondayOffset + index))
    const key = dateKey(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
    return { key, dayNumber: date.getUTCDate(), inMonth: date.getUTCMonth() === month, isToday: key === today }
  })
}

function monthHeading(cursor: Date): string {
  const value = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth(), 15, 12))
  return new Intl.DateTimeFormat('pt-BR', { timeZone: getTimezone(), month: 'long', year: 'numeric' }).format(value)
}

function monthDate(value: Date): string {
  return dateKey(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate())
}

function currentMonthCursor(): Date {
  const [year = 0, month = 1] = keyInTimezone(new Date()).split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, 1))
}

function getUrgency(evento: EventoEdital) {
  return calcularUrgencia(evento.data_inicio, evento.data_fim, evento.dia_inteiro, evento.concluido)
}

export function CalendarPage() {
  const [cursor, setCursor] = useState(currentMonthCursor)
  const [view, setView] = useState<CalendarView>(() => window.matchMedia('(max-width: 767px)').matches ? 'list' : 'month')
  const [eventos, setEventos] = useState<EventoCalendario[]>([])
  const [editais, setEditais] = useState<Edital[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [googleConnection, setGoogleConnection] = useState<GoogleConnectionStatus>(DISCONNECTED_GOOGLE_STATUS)
  const [googleBusy, setGoogleBusy] = useState(false)
  const [tipoFiltro, setTipoFiltro] = useState('')
  const [statusFiltro, setStatusFiltro] = useState<CompletionFilter>('pending')
  const [editalFiltro, setEditalFiltro] = useState('')
  const [busca, setBusca] = useState('')
  const [selectedEvento, setSelectedEvento] = useState<EventoCalendario | null>(null)
  const [editingEvento, setEditingEvento] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [createEditalId, setCreateEditalId] = useState('')
  const [createDate, setCreateDate] = useState<string | undefined>()
  const [expandedDay, setExpandedDay] = useState<string | null>(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  const days = useMemo(() => monthGrid(cursor), [cursor])
  const startDate = days[0]?.key ?? monthDate(cursor)
  const endDate = days[days.length - 1]?.key ?? monthDate(cursor)

  const loadCalendar = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [eventosData, editaisData] = await Promise.all([
        getEventosByRange(startDate, endDate),
        getEditais(),
      ])
      if (mountedRef.current) {
        setEventos(eventosData)
        setSelectedEvento((current) => current ? eventosData.find((evento) => evento.id === current.id) ?? current : null)
        setEditais(editaisData)
        setCreateEditalId((current) => current || editaisData[0]?.id || '')
      }
    } catch {
      if (mountedRef.current) setError('Não foi possível carregar o calendário. Tente novamente.')
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [startDate, endDate])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadCalendar()
  }, [loadCalendar])

  useEffect(() => {
    let active = true
    getGoogleConnectionStatus().then((status) => {
      if (active) setGoogleConnection(status)
    }).catch(() => {
      if (active) setGoogleConnection(DISCONNECTED_GOOGLE_STATUS)
    })
    return () => { active = false }
  }, [])

  const filteredEvents = useMemo(() => {
    const query = busca.trim().toLocaleLowerCase('pt-BR')
    return eventos.filter((evento) => {
      if (tipoFiltro && evento.tipo !== tipoFiltro) return false
      if (statusFiltro === 'pending' && evento.concluido) return false
      if (statusFiltro === 'completed' && !evento.concluido) return false
      if (editalFiltro && evento.edital_id !== editalFiltro) return false
      if (query && ![evento.titulo, evento.edital_titulo, evento.edital_instituicao].some((value) => value.toLocaleLowerCase('pt-BR').includes(query))) return false
      const start = keyInTimezone(evento.data_inicio)
      const end = keyInTimezone(evento.data_fim ?? evento.data_inicio)
      return end >= startDate && start <= endDate
    })
  }, [eventos, tipoFiltro, statusFiltro, editalFiltro, busca, startDate, endDate])

  const eventsByDay = useMemo(() => {
    const grouped = new Map<string, EventoCalendario[]>()
    const firstVisibleKey = days[0]?.key ?? startDate
    const lastVisibleKey = days[days.length - 1]?.key ?? endDate
    const firstMonthKey = dateKey(cursor.getUTCFullYear(), cursor.getUTCMonth(), 1)

    for (const evento of filteredEvents) {
      const start = keyInTimezone(evento.data_inicio)
      const end = keyInTimezone(evento.data_fim ?? evento.data_inicio)
      const marks = new Set<string>()
      if (start >= firstVisibleKey && start <= lastVisibleKey) marks.add(start)
      if (evento.data_fim && end >= firstVisibleKey && end <= lastVisibleKey) marks.add(end)
      if (start < firstVisibleKey && end > lastVisibleKey) marks.add(firstMonthKey)

      for (const key of marks) {
        const values = grouped.get(key) ?? []
        values.push(evento)
        grouped.set(key, values)
      }
    }
    return grouped
  }, [filteredEvents, days, cursor, startDate, endDate])

  const listGroups = useMemo(() => {
    const groups = new Map<string, EventoCalendario[]>()
    const monthStart = dateKey(cursor.getUTCFullYear(), cursor.getUTCMonth(), 1)
    for (const evento of filteredEvents) {
      const startKey = keyInTimezone(evento.data_inicio)
      const groupKey = startKey < monthStart ? monthStart : startKey
      const values = groups.get(groupKey) ?? []
      values.push(evento)
      groups.set(groupKey, values)
    }
    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b))
  }, [filteredEvents, cursor])

  const completedCount = eventos.filter((evento) => evento.concluido).length
  const pendingCount = eventos.length - completedCount

  function changeMonth(amount: number) {
    setCursor((current) => new Date(Date.UTC(current.getUTCFullYear(), current.getUTCMonth() + amount, 1)))
  }

  function goToToday() {
    setCursor(currentMonthCursor())
  }

  function openCreate(date?: string) {
    setCreateDate(date)
    setSelectedEvento(null)
    setEditingEvento(false)
    setShowCreate(true)
  }

  async function handleCreate(values: EventoEditalFormOutput) {
    if (!createEditalId) return
    setActionError(null)
    try {
      await createEvento({ edital_id: createEditalId, ...values })
      setShowCreate(false)
      await loadCalendar()
    } catch {
      setActionError('Não foi possível criar o evento. Tente novamente.')
    }
  }

  async function handleEdit(values: EventoEditalFormOutput) {
    if (!selectedEvento) return
    setActionError(null)
    try {
      await updateEvento(selectedEvento.id, values)
      const eventId = selectedEvento.id
      const linked = Boolean(selectedEvento.google_event_id)
      setEditingEvento(false)
      if (linked) {
        try { await markGoogleEventPending(eventId) } catch { /* sync endpoint below revalidates and stores its final state */ }
        setGoogleBusy(true)
        try {
          const result = await syncEvento(eventId)
          if (!result.synced) setActionError(result.message ?? 'As alterações foram salvas no EditalTrack, mas não no Google Calendar.')
        } catch {
          setActionError('As alterações foram salvas no EditalTrack, mas não foi possível atualizar o Google Calendar.')
        } finally {
          setGoogleBusy(false)
        }
      }
      await loadCalendar()
    } catch {
      setActionError('Não foi possível atualizar o evento. Tente novamente.')
      setGoogleBusy(false)
    }
  }

  async function handleToggleComplete(evento: EventoCalendario) {
    setActionError(null)
    try {
      await toggleEventoConcluido(evento.id, !evento.concluido)
      setSelectedEvento(null)
      await loadCalendar()
    } catch {
      setActionError('Não foi possível atualizar o status do evento. Tente novamente.')
    }
  }

  async function handleGoogleSync(evento: EventoCalendario) {
    setGoogleBusy(true)
    setActionError(null)
    try {
      const result = await syncEvento(evento.id)
      if (!result.synced) setActionError(result.message ?? 'Não foi possível sincronizar o evento.')
      if (result.errorCode === 'connection_expired') getGoogleConnectionStatus().then(setGoogleConnection).catch(() => undefined)
      await loadCalendar()
    } catch {
      setActionError('Não foi possível sincronizar o evento. Tente novamente.')
    } finally {
      setGoogleBusy(false)
    }
  }

  async function handleGoogleRemove(evento: EventoCalendario) {
    setGoogleBusy(true)
    setActionError(null)
    try {
      await deleteGoogleEvent(evento.id)
      await loadCalendar()
    } catch (removeError) {
      setActionError(removeError instanceof Error ? removeError.message : 'Não foi possível remover do Google Calendar.')
      await loadCalendar()
    } finally {
      setGoogleBusy(false)
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="SEU TEMPO, BEM ORGANIZADO"
        title="Calendário"
        description="Inscrições, provas e resultados dos seus editais."
        action={<button type="button" className="button button-primary" onClick={() => openCreate()}><Plus size={18} aria-hidden="true" /> Novo evento</button>}
      />

      <section className="panel calendar-panel" aria-label="Calendário de eventos">
        <div className="calendar-toolbar">
          <div className="calendar-month-controls">
            <button type="button" className="button button-ghost button-sm" aria-label="Mês anterior" onClick={() => changeMonth(-1)}><ArrowLeft size={17} /></button>
            <h2>{monthHeading(cursor)}</h2>
            <button type="button" className="button button-ghost button-sm" aria-label="Próximo mês" onClick={() => changeMonth(1)}><ArrowRight size={17} /></button>
            <button type="button" className="button button-secondary button-sm" onClick={goToToday}>Hoje</button>
          </div>
          <div className="calendar-view-toggle" role="group" aria-label="Visualização do calendário">
            <button type="button" className={view === 'month' ? 'is-active' : ''} aria-pressed={view === 'month'} onClick={() => setView('month')}><CalendarDays size={16} /> Mês</button>
            <button type="button" className={view === 'list' ? 'is-active' : ''} aria-pressed={view === 'list'} onClick={() => setView('list')}><List size={16} /> Lista</button>
          </div>
        </div>

        <div className="calendar-filters">
          <label>Tipo<select aria-label="Filtrar por tipo" value={tipoFiltro} onChange={(event) => setTipoFiltro(event.target.value)}><option value="">Todos os tipos</option>{EVENTO_TIPOS.map((tipo) => <option key={tipo} value={tipo}>{EVENTO_TIPO_LABELS[tipo]}</option>)}</select></label>
          <label>Status<select aria-label="Filtrar por status" value={statusFiltro} onChange={(event) => setStatusFiltro(event.target.value as CompletionFilter)}><option value="pending">Pendentes</option><option value="completed">Concluídos</option><option value="all">Todos</option></select></label>
          <label>Edital<select aria-label="Filtrar por edital" value={editalFiltro} onChange={(event) => setEditalFiltro(event.target.value)}><option value="">Todos os editais</option>{editais.map((edital) => <option key={edital.id} value={edital.id}>{edital.titulo}</option>)}</select></label>
          <label className="calendar-search"><Search size={16} aria-hidden="true" /><input type="search" aria-label="Buscar eventos" placeholder="Buscar evento ou edital" value={busca} onChange={(event) => setBusca(event.target.value)} /></label>
        </div>

        <div className="calendar-summary"><span>{filteredEvents.length} evento{filteredEvents.length === 1 ? '' : 's'} no período</span><span>{pendingCount} pendentes · {completedCount} concluídos</span></div>

        {loading ? <div className="loading-state"><div className="loading-spinner" aria-hidden="true" /><p>Carregando eventos...</p></div> : error ? (
          <div className="error-state" role="alert"><p>{error}</p><button type="button" className="button button-secondary" onClick={loadCalendar}>Tentar novamente</button></div>
        ) : filteredEvents.length === 0 ? (
          <EmptyState icon={CalendarDays} title="Nenhum evento neste período." description="Adicione datas importantes aos seus editais para visualizá-las aqui." action={<button type="button" className="button button-primary" onClick={() => openCreate()}><Plus size={17} /> Novo evento</button>} />
        ) : view === 'month' ? (
          <div className="calendar-month-view">
            <div className="calendar-weekdays" aria-hidden="true">{WEEKDAYS.map((day) => <span key={day}>{day}</span>)}</div>
            <div className="calendar-month-grid">
              {days.map((day) => {
                const dayEvents = eventsByDay.get(day.key) ?? []
                const expanded = expandedDay === day.key
                const visibleEvents = expanded ? dayEvents : dayEvents.slice(0, 2)
                return <div key={day.key} data-date={day.key} className={`calendar-day ${day.inMonth ? '' : 'calendar-day--outside'} ${day.isToday ? 'calendar-day--today' : ''}`}>
                  <button type="button" className="calendar-day-number" aria-label={`Novo evento em ${formatDate(`${day.key}T12:00:00Z`)}`} onClick={() => openCreate(day.key)}>{day.dayNumber}</button>
                  <div className="calendar-day-events">
                    {visibleEvents.map((evento) => <CalendarChip key={`${evento.id}-${day.key}`} evento={evento} onClick={() => { setSelectedEvento(evento); setEditingEvento(false) }} />)}
                    {dayEvents.length > 2 && <button type="button" className="calendar-more" onClick={() => setExpandedDay(expanded ? null : day.key)}>{expanded ? 'Mostrar menos' : `+${dayEvents.length - 2} eventos`}</button>}
                  </div>
                </div>
              })}
            </div>
          </div>
        ) : (
          <div className="calendar-list-view">
            {listGroups.map(([key, dayEvents]) => <section key={key} className="calendar-list-group" aria-labelledby={`calendar-day-${key}`}>
              <h3 id={`calendar-day-${key}`}>{key === keyInTimezone(new Date()) ? 'Hoje' : formatDate(`${key}T12:00:00Z`)}</h3>
              <ul>{dayEvents.map((evento) => <li key={evento.id}><CalendarListItem evento={evento} onClick={() => { setSelectedEvento(evento); setEditingEvento(false) }} /></li>)}</ul>
            </section>)}
          </div>
        )}
      </section>

      {showCreate && <div className="evento-form-overlay" onClick={() => setShowCreate(false)}>
        <div className="evento-form-panel panel" role="dialog" aria-modal="true" aria-labelledby="calendar-create-title" onClick={(event) => event.stopPropagation()}>
          <div className="panel-heading"><h2 id="calendar-create-title">Novo evento</h2><button type="button" className="button button-ghost" aria-label="Fechar" onClick={() => setShowCreate(false)}><X size={18} /></button></div>
          {editais.length === 0 ? <div className="p-5"><p className="mb-4 text-sm text-muted">Cadastre um edital antes de adicionar um evento.</p><Link className="button button-primary" to="/editais/novo">Novo edital</Link></div> : <>
            {actionError && <p className="form-error-banner mx-5 mt-4" role="alert">{actionError}</p>}
            <div className="form-field px-5 pt-4"><label htmlFor="calendar-create-edital">Edital *</label><select id="calendar-create-edital" value={createEditalId} onChange={(event) => setCreateEditalId(event.target.value)}>{editais.map((edital) => <option key={edital.id} value={edital.id}>{edital.titulo}</option>)}</select></div>
            <EventoForm initialDate={createDate} onSubmit={handleCreate} onCancel={() => setShowCreate(false)} submitLabel="Criar evento" loadingLabel="Criando..." />
          </>}
        </div>
      </div>}

      {selectedEvento && <div className="evento-form-overlay" onClick={() => { setSelectedEvento(null); setEditingEvento(false) }}>
        <div className="evento-form-panel panel" role="dialog" aria-modal="true" aria-labelledby="calendar-event-title" onClick={(event) => event.stopPropagation()}>
          <div className="panel-heading"><h2 id="calendar-event-title">{editingEvento ? 'Editar evento' : 'Detalhes do evento'}</h2><button type="button" className="button button-ghost" aria-label="Fechar" onClick={() => { setSelectedEvento(null); setEditingEvento(false) }}><X size={18} /></button></div>
          {actionError && <p className="form-error-banner mx-5 mt-4" role="alert">{actionError}</p>}
          {editingEvento ? <EventoForm initialValues={selectedEvento} onSubmit={handleEdit} onCancel={() => setEditingEvento(false)} submitLabel="Salvar alterações" /> : <div className="calendar-event-details">
            <span className="evento-card-tipo-badge">{EVENTO_TIPO_LABELS[selectedEvento.tipo]}</span>
            <h3>{selectedEvento.titulo}</h3>
            <p>{selectedEvento.edital_titulo} · {selectedEvento.edital_instituicao}</p>
            <dl><div><dt>Data/período</dt><dd>{formatPeriod(selectedEvento.data_inicio, selectedEvento.data_fim)}</dd></div>
              {selectedEvento.data_fim && <div><dt>Prazo final</dt><dd>{formatDate(selectedEvento.data_fim)}</dd></div>}
              <div><dt>Horário</dt><dd>{selectedEvento.dia_inteiro ? 'Dia inteiro' : `${formatTime(selectedEvento.data_inicio)}${selectedEvento.data_fim ? ` – ${formatTime(selectedEvento.data_fim)}` : ''}`}</dd></div>
              <div><dt>Status</dt><dd>{selectedEvento.concluido ? '✓ Concluído' : getUrgency(selectedEvento).label}</dd></div>
            </dl>
            {selectedEvento.descricao && <p className="calendar-event-description">{selectedEvento.descricao}</p>}
            <GoogleEventActions evento={selectedEvento} connected={googleConnection.connected} reauthRequired={googleConnection.reauthRequired} busy={googleBusy} onSync={() => handleGoogleSync(selectedEvento)} onRemove={() => handleGoogleRemove(selectedEvento)} />
            <div className="form-actions">
              <Link className="button button-secondary" to={`/editais/${selectedEvento.edital_id}`}>Abrir edital</Link>
              <button type="button" className="button button-secondary" onClick={() => setEditingEvento(true)}><Pencil size={15} /> Editar evento</button>
              {!selectedEvento.concluido && <button type="button" className="button button-primary" onClick={() => handleToggleComplete(selectedEvento)}><Check size={15} /> Marcar concluído</button>}
            </div>
          </div>}
        </div>
      </div>}
    </>
  )
}

function CalendarChip({ evento, onClick }: { evento: EventoCalendario; onClick: () => void }) {
  const urgency = getUrgency(evento)
  const style = getUrgenciaStyle(urgency.status)
  return <button type="button" className={`calendar-chip ${evento.concluido ? 'calendar-chip--completed' : ''}`} style={{ borderLeftColor: style.text }} onClick={onClick} title={`${evento.titulo} — ${evento.edital_titulo}`}>
    <span>{evento.titulo}</span><small>{evento.edital_titulo}</small>
  </button>
}

function CalendarListItem({ evento, onClick }: { evento: EventoCalendario; onClick: () => void }) {
  const urgency = getUrgency(evento)
  const style = getUrgenciaStyle(urgency.status)
  const time = evento.dia_inteiro ? 'Dia inteiro' : `${formatTime(evento.data_inicio)}${evento.data_fim ? ` – ${formatTime(evento.data_fim)}` : ''}`
  return <button type="button" className={`calendar-list-event ${evento.concluido ? 'calendar-list-event--completed' : ''}`} onClick={onClick}>
    <span className="calendar-list-event-mark" style={{ backgroundColor: style.text }} aria-hidden="true" />
    <span className="calendar-list-event-main"><strong>{evento.titulo}</strong><span>{evento.edital_titulo} · {evento.edital_instituicao}</span><small>{EVENTO_TIPO_LABELS[evento.tipo]} · {formatPeriod(evento.data_inicio, evento.data_fim)} · {time}</small></span>
    <span className="calendar-list-event-status" style={{ color: style.text }}>{evento.concluido ? <><CheckCircle2 size={15} /> Concluído</> : <><Clock3 size={15} /> {urgency.label}</>}</span>
  </button>
}
