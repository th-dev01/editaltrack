import { Check, CircleDashed } from 'lucide-react'
import { PageHeader } from '../components/PageHeader'

const phases = [
  'Base do projeto, layout, tema e rotas',
  'Supabase e autenticação',
  'Banco seguro e cadastro de editais',
  'Cronograma, prazos e urgência',
  'Checklist de documentos',
  'PDF e anexos privados',
  'Indicadores, busca e filtros',
  'Calendário interno',
  'Preferências, fuso horário e lembretes',
  'Conexão segura com o Google',
  'Sincronização com Google Calendar',
  'PWA e instalação no celular',
  'Revisão final, testes e documentação',
]

export function AboutPage() {
  return (
    <>
      <PageHeader eyebrow="CONSTRUINDO COM CUIDADO" title="Um projeto, um passo de cada vez." description="Acompanhe as etapas de desenvolvimento do EditalTrack." />
      <section className="panel" aria-labelledby="phases-title">
        <div className="panel-heading"><h2 id="phases-title">Roteiro de implementação</h2><span className="subtle-badge">Fase 1 de 13</span></div>
        <ol className="roadmap-list">{phases.map((phase, index) => (
          <li key={phase}>
            {index === 0 ? <Check size={19} className="text-accent shrink-0" aria-hidden="true" /> : <CircleDashed size={19} className="text-muted shrink-0" aria-hidden="true" />}
            <span className="roadmap-number">{String(index + 1).padStart(2, '0')}</span>
            <span className="flex-1">{phase}</span>
            <span className={index === 0 ? 'text-accent text-xs' : 'text-muted text-xs'}>{index === 0 ? 'Disponível' : 'Planejada'}</span>
          </li>
        ))}</ol>
      </section>
    </>
  )
}
