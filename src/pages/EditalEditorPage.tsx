import { ArrowLeft, CalendarDays, FileText, ListChecks, Paperclip } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PageHeader } from '../components/PageHeader'
import { PhaseNotice } from '../components/PhaseNotice'

interface EditalEditorPageProps {
  mode: 'create' | 'edit'
}

const sections = [
  { icon: FileText, title: 'Informações do edital', description: 'Título, instituição, categoria, links e seu interesse.', phase: 'Fase 3' },
  { icon: CalendarDays, title: 'Cronograma', description: 'Todas as etapas, com suas datas e prazos.', phase: 'Fase 4' },
  { icon: ListChecks, title: 'Documentação', description: 'O que você precisa providenciar e enviar.', phase: 'Fase 5' },
  { icon: Paperclip, title: 'PDF e arquivos', description: 'O edital original e seus anexos, juntos.', phase: 'Fase 6' },
]

export function EditalEditorPage({ mode }: EditalEditorPageProps) {
  const editing = mode === 'edit'

  return (
    <>
      <Link to="/editais" className="back-link"><ArrowLeft size={16} aria-hidden="true" /> Meus editais</Link>
      <PageHeader eyebrow="UM NOVO CAMINHO" title={editing ? 'Editar edital' : 'Novo edital'} description={editing ? 'Um espaço para manter as informações da sua oportunidade atualizadas.' : 'Comece pelo essencial. Os detalhes podem vir depois.'} />
      <PhaseNotice>Estrutura da tela preparada. O formulário e o salvamento serão ativados na Fase 3, após a autenticação.</PhaseNotice>
      <section className="panel mt-6" aria-labelledby="editor-title">
        <div className="panel-heading"><h2 id="editor-title">O que você vai organizar</h2><span className="subtle-badge">Em preparação</span></div>
        <div className="section-preview-list">
          {sections.map(({ icon: Icon, title, description, phase }) => (
            <div key={title} className="section-preview-item">
              <span className="step-icon"><Icon size={20} aria-hidden="true" /></span>
              <div className="min-w-0 flex-1"><h3>{title}</h3><p>{description}</p></div>
              <span className="phase-tag">{phase}</span>
            </div>
          ))}
        </div>
      </section>
      <p className="text-muted mt-5 text-sm">No cadastro inicial, apenas título, instituição e categoria serão obrigatórios.</p>
    </>
  )
}
