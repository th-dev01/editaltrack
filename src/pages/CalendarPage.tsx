import { CalendarDays, List, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { EmptyState } from '../components/EmptyState'
import { PageHeader } from '../components/PageHeader'
import { PhaseNotice } from '../components/PhaseNotice'

export function CalendarPage() {
  return (
    <>
      <PageHeader eyebrow="SEU TEMPO, BEM ORGANIZADO" title="Calendário" description="As datas importantes de todos os seus editais, reunidas aqui." />
      <section className="panel" aria-labelledby="calendar-title">
        <div className="panel-heading"><h2 id="calendar-title"><List size={18} aria-hidden="true" /> Agenda de oportunidades</h2><span className="subtle-badge">Prévia</span></div>
        <EmptyState icon={CalendarDays} title="Os próximos passos ganham data aqui" description="Quando você adicionar etapas aos seus editais, poderá acompanhar inscrições, provas e resultados nesta agenda."
          action={<Link to="/editais" className="button button-secondary">Ir para meus editais <ArrowRight size={17} aria-hidden="true" /></Link>} />
      </section>
      <PhaseNotice>O calendário com visualizações em mês e lista será implementado na Fase 8, com os eventos reais dos seus editais.</PhaseNotice>
    </>
  )
}
