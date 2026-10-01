import { ArrowRight, CalendarClock, CalendarDays, Check, FileCheck2, Files, ListChecks, Plus, Sprout } from 'lucide-react'
import { Link } from 'react-router-dom'
import { EmptyState } from '../components/EmptyState'
import { PageHeader } from '../components/PageHeader'
import { PhaseNotice } from '../components/PhaseNotice'

const steps = [
  { icon: Files, title: 'Encontre uma oportunidade', description: 'Um concurso, uma pós ou aquele próximo passo.' },
  { icon: CalendarDays, title: 'Organize as datas importantes', description: 'Inscrições, provas e resultados no mesmo lugar.' },
  { icon: ListChecks, title: 'Prepare sua documentação', description: 'Saiba o que está pronto e o que falta enviar.' },
]

export function DashboardPage() {
  return (
    <>
      <PageHeader
        eyebrow="VISÃO GERAL"
        title="Espaço para o seu próximo passo."
        description="Suas oportunidades, seus prazos. Tudo em um só lugar."
        action={<Link to="/editais/novo" className="button button-primary"><Plus size={18} aria-hidden="true" /> Novo edital</Link>}
      />

      <section className="welcome-card" aria-labelledby="welcome-title">
        <div className="welcome-content">
          <span className="small-label"><Sprout size={15} aria-hidden="true" /> CADA OPORTUNIDADE CONTA</span>
          <h2 id="welcome-title">Menos abas abertas.<br /><span className="text-accent">Mais caminhos à frente.</span></h2>
          <p>Reúna os editais que fazem sentido para você e acompanhe cada etapa com tranquilidade.</p>
          <Link to="/editais" className="button button-secondary">Conhecer meu espaço <ArrowRight size={17} aria-hidden="true" /></Link>
        </div>
        <div className="welcome-illustration" aria-hidden="true">
          <span className="illustration-orbit orbit-one" />
          <span className="illustration-orbit orbit-two" />
          <div className="illustration-sheet">
            <span className="illustration-sheet-icon"><FileCheck2 size={25} /></span>
            <span className="illustration-line line-long" />
            <span className="illustration-line line-short" />
            {[1, 2, 3].map((item) => <span key={item} className="illustration-task"><span><Check size={12} /></span><i /></span>)}
          </div>
          <span className="illustration-calendar"><CalendarDays size={25} /></span>
          <span className="illustration-check"><Check size={22} /></span>
        </div>
      </section>

      <div className="dashboard-grid">
        <section className="panel" aria-labelledby="deadlines-title">
          <div className="panel-heading">
            <h2 id="deadlines-title"><CalendarClock size={18} aria-hidden="true" /> Próximos prazos</h2>
            <Link to="/calendario" className="text-link">Calendário <ArrowRight size={15} aria-hidden="true" /></Link>
          </div>
          <EmptyState compact icon={CalendarDays} title="Um calendário de possibilidades" description="As datas dos seus editais aparecerão aqui, organizadas pelo próximo prazo." />
          <div className="panel-footnote">O acompanhamento de prazos será conectado na Fase 4.</div>
        </section>

        <section className="panel" aria-labelledby="getting-started-title">
          <div className="panel-heading"><h2 id="getting-started-title">Tudo começa com um edital</h2></div>
          <ol className="getting-started-list">
            {steps.map(({ icon: Icon, title, description }, index) => (
              <li key={title}>
                <span className="step-icon"><Icon size={19} aria-hidden="true" /></span>
                <div><span className="step-number">PASSO 0{index + 1}</span><h3>{title}</h3><p>{description}</p></div>
              </li>
            ))}
          </ol>
        </section>
      </div>

      <section className="quick-access" aria-label="Acesso aos editais">
        <div className="quick-access-icon"><Files size={22} aria-hidden="true" /></div>
        <div className="min-w-0 flex-1"><h2>Seu ponto de partida</h2><p>Um lugar para cada oportunidade que você encontrar.</p></div>
        <Link to="/editais" className="button button-ghost">Meus editais <ArrowRight size={17} aria-hidden="true" /></Link>
      </section>

      <PhaseNotice>Esta é a base visual do EditalTrack. Cadastro, dados e indicadores serão ativados nas próximas fases.</PhaseNotice>
    </>
  )
}
