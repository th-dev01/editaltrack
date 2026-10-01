import { ArrowDownToLine, Files, Plus } from 'lucide-react'
import { Link } from 'react-router-dom'
import { EmptyState } from '../components/EmptyState'
import { PageHeader } from '../components/PageHeader'
import { PhaseNotice } from '../components/PhaseNotice'

export function EditaisPage() {
  return (
    <>
      <PageHeader eyebrow="SUAS OPORTUNIDADES" title="Meus editais" description="Do primeiro interesse ao resultado final, acompanhe sua jornada."
        action={<Link to="/editais/novo" className="button button-primary"><Plus size={18} aria-hidden="true" /> Novo edital</Link>} />
      <section className="panel" aria-labelledby="editais-title">
        <div className="panel-heading"><h2 id="editais-title"><Files size={18} aria-hidden="true" /> Seu espaço de editais</h2><span className="subtle-badge">Prévia</span></div>
        <EmptyState icon={Files} title="Cada conquista começa com uma oportunidade" description="Aqui você reunirá os editais que encontrou, seus favoritos e as seleções das quais quer participar."
          action={<Link to="/editais/novo" className="button button-secondary"><Plus size={17} aria-hidden="true" /> Conhecer o cadastro</Link>} />
      </section>
      <div className="helper-card"><ArrowDownToLine size={20} aria-hidden="true" /><div><h2>Encontrou agora? Analise depois.</h2><p>A caixa de entrada “Encontrados” permitirá salvar uma oportunidade rapidamente e completar as informações quando quiser.</p></div></div>
      <PhaseNotice>O cadastro e a listagem com dados reais serão implementados na Fase 3. Busca e filtros chegam na Fase 7.</PhaseNotice>
    </>
  )
}
