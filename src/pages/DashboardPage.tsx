import { ArrowRight, CalendarClock, CheckCircle2, FileWarning, Heart, ListTodo, Plus, Sparkles } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { EmptyState } from '../components/EmptyState'
import { PageHeader } from '../components/PageHeader'
import { useAuth } from '../features/auth/auth-context'
import { calcularUrgencia, formatDate, getTimezone, getUrgenciaStyle } from '../lib/date'
import { getDashboardData } from '../services/dashboard.service'
import type { DashboardData } from '../services/dashboard.service'

function getFirstName(name: unknown, email: string | undefined): string {
  if (typeof name === 'string' && name.trim()) return name.trim().split(/\s+/)[0] ?? 'Olá'
  return email?.split('@')[0] ?? 'Olá'
}

function todayLabel(): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: getTimezone(),
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date())
}

export function DashboardPage() {
  const { user } = useAuth()
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  const loadDashboard = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getDashboardData()
      if (mountedRef.current) setDashboard(data)
    } catch {
      if (mountedRef.current) setError('Não foi possível carregar os dados do Dashboard. Tente novamente.')
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadDashboard()
  }, [loadDashboard])

  const firstName = getFirstName(user?.user_metadata.name, user?.email)

  return (
    <>
      <PageHeader
        eyebrow={todayLabel()}
        title={`Olá, ${firstName}`}
        description="Veja o que precisa da sua atenção."
        action={<Link to="/editais/novo" className="button button-primary"><Plus size={18} aria-hidden="true" /> Novo edital</Link>}
      />

      {loading ? (
        <div className="space-y-5" aria-label="Carregando Dashboard" aria-busy="true">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            {Array.from({ length: 6 }, (_, index) => <div key={index} className="h-24 animate-pulse rounded-xl border border-border bg-surface" />)}
          </div>
          <div className="h-64 animate-pulse rounded-xl border border-border bg-surface" />
        </div>
      ) : error ? (
        <div className="error-state" role="alert">
          <p>{error}</p>
          <button type="button" className="button button-secondary" onClick={loadDashboard}>Tentar novamente</button>
        </div>
      ) : dashboard && dashboard.summary.totalEditais === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="Seu acompanhamento começa aqui."
          description="Cadastre seu primeiro edital para acompanhar prazos, documentos e resultados."
          action={<Link to="/editais/novo" className="button button-primary"><Plus size={18} aria-hidden="true" /> Novo edital</Link>}
        />
      ) : dashboard ? (
        <div className="space-y-6">
          <section aria-label="Resumo" className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            <SummaryCard label="Inscrições abertas" value={dashboard.summary.inscricoesAbertas} icon={CheckCircle2} href="/editais" />
            <SummaryCard label="Próximos prazos" value={dashboard.summary.proximosPrazos} icon={CalendarClock} href="#proximos-prazos" />
            <SummaryCard label="Documentos pendentes" value={dashboard.summary.documentosPendentes} icon={FileWarning} href="#documentos-pendentes" />
            <SummaryCard label="Aguardando resultado" value={dashboard.summary.aguardandoResultado} icon={ListTodo} href="/editais?status=aguardando_resultado" />
            <SummaryCard label="Editais salvos" value={dashboard.summary.totalEditais} icon={Sparkles} href="/editais" />
            <SummaryCard label="Favoritos" value={dashboard.summary.favoritos} icon={Heart} href="/editais?favorito=true" />
          </section>

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(300px,1fr)]">
            <div className="space-y-5">
              <section className="panel" aria-labelledby="attention-title">
                <div className="panel-heading"><h2 id="attention-title"><Sparkles size={18} aria-hidden="true" /> Precisa da sua atenção</h2></div>
                {dashboard.attentionItems.length === 0 ? (
                  <p className="p-5 text-sm text-muted">Nenhuma pendência urgente por enquanto.</p>
                ) : (
                  <ul className="divide-y divide-border">
                    {dashboard.attentionItems.slice(0, 7).map((item) => {
                      const style = getUrgenciaStyle(item.urgencyStatus)
                      return (
                        <li key={item.id}>
                          <Link to={`/editais/${item.editalId}`} className="flex min-h-16 items-center gap-3 p-4 hover:bg-elevated">
                            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: style.text }} aria-hidden="true" />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-bold">{item.title}</span>
                              <span className="block truncate text-xs text-muted">{item.description}</span>
                            </span>
                            {item.dueDate && <span className="shrink-0 text-xs font-bold" style={{ color: style.text }}>{calcularUrgencia(item.dueDate, item.dueDate, true, false).label}</span>}
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </section>

              <section id="proximos-prazos" className="panel scroll-mt-5" aria-labelledby="deadlines-title">
                <PanelHeading id="deadlines-title" icon={CalendarClock} title="Próximos prazos" href="/calendario" linkLabel="Calendário" />
                {dashboard.proximosPrazos.length === 0 ? <p className="p-5 text-sm text-muted">Nenhum prazo próximo.</p> : (
                  <ul className="divide-y divide-border">
                    {dashboard.proximosPrazos.slice(0, 5).map((evento) => {
                      const urgency = calcularUrgencia(evento.data_inicio, evento.data_fim, evento.dia_inteiro, evento.concluido)
                      const style = getUrgenciaStyle(urgency.status)
                      return <li key={evento.id}><Link to={`/editais/${evento.edital_id}`} className="flex min-h-16 items-center gap-3 p-4 hover:bg-elevated">
                        <span className="w-14 shrink-0 text-center text-xs font-extrabold uppercase" style={{ color: style.text }}>{formatDate(evento.data_fim ?? evento.data_inicio).slice(0, 5)}</span>
                        <span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold">{evento.titulo}</span><span className="block truncate text-xs text-muted">{evento.edital_titulo}</span></span>
                        <span className="shrink-0 text-xs text-muted">{urgency.label}</span>
                      </Link></li>
                    })}
                  </ul>
                )}
              </section>
            </div>

            <div className="space-y-5">
              <section id="documentos-pendentes" className="panel scroll-mt-5" aria-labelledby="documents-title">
                <PanelHeading id="documents-title" icon={FileWarning} title="Documentos pendentes" />
                <LinkedRows empty="Nenhum documento obrigatório pendente." rows={dashboard.documentosPendentes.slice(0, 5).map((doc) => ({ id: doc.id, title: doc.nome, subtitle: doc.editalTitulo, href: `/editais/${doc.editalId}` }))} />
              </section>

              <section className="panel" aria-labelledby="results-title">
                <PanelHeading id="results-title" icon={ListTodo} title="Aguardando resultado" />
                <LinkedRows empty="Nenhum resultado previsto ou aguardado." rows={dashboard.aguardandoResultado.slice(0, 5).map((result) => ({ id: result.editalId, title: result.editalTitulo, subtitle: result.dataEvento ? `${result.eventoTitulo} · ${formatDate(result.dataEvento)}` : result.eventoTitulo, href: `/editais/${result.editalId}` }))} />
              </section>

              <section id="para-analisar" className="panel scroll-mt-5" aria-labelledby="analyze-title">
                <PanelHeading id="analyze-title" icon={Sparkles} title="Para analisar" href="/editais" linkLabel="Ver todos" />
                <LinkedRows empty="Nenhum edital aguardando análise." rows={dashboard.editaisParaAnalisar.map((edital) => ({ id: edital.id, title: edital.titulo, subtitle: edital.status === 'encontrado' ? 'Encontrado' : 'Em análise', href: `/editais/${edital.id}` }))} />
              </section>

              {dashboard.favoritos.length > 0 && <section id="favoritos" className="panel scroll-mt-5" aria-labelledby="favorites-title">
                <PanelHeading id="favorites-title" icon={Heart} title="Favoritos" href="/editais" linkLabel="Ver todos" />
                <LinkedRows rows={dashboard.favoritos.map((edital) => ({ id: edital.id, title: edital.titulo, subtitle: edital.instituicao, href: `/editais/${edital.id}` }))} />
              </section>}
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}

function SummaryCard({ label, value, icon: Icon, href }: { label: string; value: number; icon: typeof CalendarClock; href: string }) {
  return <Link to={href} className="rounded-xl border border-border bg-surface p-4 transition-colors hover:border-accent/50 hover:bg-elevated">
    <span className="flex items-center justify-between text-muted"><span className="text-xs font-semibold">{label}</span><Icon size={16} aria-hidden="true" /></span>
    <span className="mt-2 block text-2xl font-extrabold text-text">{value}</span>
  </Link>
}

function PanelHeading({ id, icon: Icon, title, href, linkLabel }: { id: string; icon: typeof CalendarClock; title: string; href?: string; linkLabel?: string }) {
  return <div className="panel-heading"><h2 id={id}><Icon size={18} aria-hidden="true" /> {title}</h2>{href && <Link to={href} className="text-link">{linkLabel ?? 'Ver todos'} <ArrowRight size={15} aria-hidden="true" /></Link>}</div>
}

function LinkedRows({ rows, empty }: { rows: Array<{ id: string; title: string; subtitle: string; href: string }>; empty?: string }) {
  if (rows.length === 0) return <p className="p-5 text-sm text-muted">{empty}</p>
  return <ul className="divide-y divide-border">{rows.map((row) => <li key={row.id}><Link to={row.href} className="block p-4 hover:bg-elevated"><span className="block truncate text-sm font-bold">{row.title}</span><span className="mt-1 block truncate text-xs text-muted">{row.subtitle}</span></Link></li>)}</ul>
}
