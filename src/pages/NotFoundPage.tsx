import { ArrowLeft, Compass } from 'lucide-react'
import { Link } from 'react-router-dom'
import { EmptyState } from '../components/EmptyState'
import { PageHeader } from '../components/PageHeader'

export function NotFoundPage() {
  return (
    <>
      <PageHeader eyebrow="404" title="Este caminho não foi encontrado." description="Mas sua próxima oportunidade ainda está por aqui." />
      <section className="panel"><EmptyState icon={Compass} title="Vamos voltar ao seu espaço?" description="O endereço pode ter mudado ou a página pode não existir."
        action={<Link to="/" className="button button-primary"><ArrowLeft size={17} aria-hidden="true" /> Voltar ao início</Link>} /></section>
    </>
  )
}
