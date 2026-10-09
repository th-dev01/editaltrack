import { FileSearch } from 'lucide-react'
import { Link } from 'react-router-dom'
import { EmptyState } from '../../components/EmptyState'

export function EditalNotFound() {
  return <section className="panel"><EmptyState icon={FileSearch} title="Edital não encontrado." description="Volte à lista para acessar suas oportunidades." action={<Link to="/editais" className="button button-primary">Voltar para meus editais</Link>} /></section>
}
