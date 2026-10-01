import { ArrowLeft, FileText } from 'lucide-react'
import { Link } from 'react-router-dom'
import { EmptyState } from '../components/EmptyState'
import { PageHeader } from '../components/PageHeader'
import { PhaseNotice } from '../components/PhaseNotice'

export function EditalDetailsPage() {
  return (
    <>
      <Link to="/editais" className="back-link"><ArrowLeft size={16} aria-hidden="true" /> Meus editais</Link>
      <PageHeader eyebrow="CADA ETAPA, EM UM SÓ LUGAR" title="Detalhes do edital" description="Resumo, cronograma, documentos e arquivos da sua oportunidade." />
      <section className="panel"><EmptyState icon={FileText} title="Este espaço está sendo preparado" description="Após a conexão com o banco, esta página exibirá as informações do edital selecionado." /></section>
      <PhaseNotice>Esta rota ainda não consulta editais. Os detalhes e as ações de edição serão conectados na Fase 3.</PhaseNotice>
    </>
  )
}
