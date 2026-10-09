import { Star, MapPin, CalendarDays } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { Edital } from '../../types/edital'
import { EditalStatusBadge } from './EditalStatusBadge'
import { getEventosByEdital } from '../../services/eventos.service'
import { formatDate } from '../../lib/date'
import { useState, useEffect } from 'react'

interface EditalCardProps {
  edital: Edital
  onToggleFavorito: (id: string, favorito: boolean) => void
}

interface ProximoEventoCard {
  titulo: string
  data_inicio: string
  data_fim: string | null
  dia_inteiro: boolean
  concluido: boolean
}

export function EditalCard({ edital, onToggleFavorito }: EditalCardProps) {
  const localizacao = [edital.cidade, edital.estado].filter(Boolean).join(' - ')
  const [proximoEvento, setProximoEvento] = useState<ProximoEventoCard | null>(null)

  useEffect(() => {
    let mounted = true
    getEventosByEdital(edital.id).then((eventos) => {
      if (!mounted) return
      const naoConcluidos = eventos.filter((e) => !e.concluido).sort((a, b) => new Date(a.data_inicio).getTime() - new Date(b.data_inicio).getTime())
      if (naoConcluidos.length > 0) {
        const e = naoConcluidos[0]!
        setProximoEvento({
          titulo: e.titulo,
          data_inicio: e.data_inicio,
          data_fim: e.data_fim,
          dia_inteiro: e.dia_inteiro,
          concluido: e.concluido,
        })
      }
    }).catch(() => {})
    return () => { mounted = false }
  }, [edital.id])

  return (
    <article className="edital-card">
      <div className="edital-card-header">
        <div className="edital-card-title-row">
          <h3 className="edital-card-title">
            <Link to={`/editais/${edital.id}`}>{edital.titulo}</Link>
          </h3>
          <button
            type="button"
            className={`favorito-btn ${edital.favorito ? 'is-active' : ''}`}
            onClick={() => onToggleFavorito(edital.id, !edital.favorito)}
            aria-label={edital.favorito ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
            aria-pressed={edital.favorito}
          >
            <Star size={18} fill={edital.favorito ? 'currentColor' : 'none'} aria-hidden="true" />
          </button>
        </div>
        <EditalStatusBadge status={edital.status} />
      </div>

      <div className="edital-card-body">
        <p className="edital-card-instituicao">{edital.instituicao}</p>
        <p className="edital-card-categoria">{edital.categoria}</p>
        {localizacao && (
          <p className="edital-card-localizacao">
            <MapPin size={14} aria-hidden="true" />
            {localizacao}
          </p>
        )}
        {proximoEvento && (
          <div className="edital-card-proximo-prazo">
            <CalendarDays size={13} aria-hidden="true" />
            <span>
              Próximo: {proximoEvento.titulo} — {formatDate(proximoEvento.data_fim || proximoEvento.data_inicio)}
              {proximoEvento.concluido ? ' (Concluído)' : ''}
            </span>
          </div>
        )}
      </div>

      <div className="edital-card-actions">
        <Link to={`/editais/${edital.id}`} className="button button-secondary button-sm">
          Ver detalhes
        </Link>
        <Link to={`/editais/${edital.id}/editar`} className="button button-ghost button-sm">
          Editar
        </Link>
      </div>
    </article>
  )
}
