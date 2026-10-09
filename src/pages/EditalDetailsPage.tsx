import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useParams, Link, useLocation } from 'react-router-dom'
import {
  ArrowLeft,
  Star,
  Pencil,
  Archive,
  Trash2,
  MapPin,
  FileText,
} from 'lucide-react'
import { PageHeader } from '../components/PageHeader'
import { EditalStatusBadge } from '../features/editais/EditalStatusBadge'
import { DeleteEditalDialog } from '../features/editais/DeleteEditalDialog'
import { ExternalLinkButton } from '../features/editais/ExternalLinkButton'
import { EventoList } from '../features/editais/EventoList'
import { getEditalById, updateEdital, deleteEdital, toggleFavorito } from '../services/editais.service'
import { MODALIDADE_LABELS } from '../features/editais/edital-options'
import type { Edital } from '../types/edital'

export function EditalDetailsPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { id } = useParams<{ id: string }>()
  const successMessage = (location.state as { successMessage?: string } | null)?.successMessage

  const [edital, setEdital] = useState<Edital | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [favoriting, setFavoriting] = useState(false)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  const loadEdital = useCallback(async () => {
    if (!id || !mountedRef.current) return
    setLoading(true)
    setError(null)
    try {
      const data = await getEditalById(id)
      if (!mountedRef.current) return
      if (!data) {
        setNotFound(true)
        return
      }
      setEdital(data)
    } catch {
      if (mountedRef.current) setError('Não foi possível carregar o edital. Tente novamente.')
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [id])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadEdital()
  }, [loadEdital])

  async function handleToggleFavorito() {
    if (!edital) return
    setFavoriting(true)
    try {
      await toggleFavorito(edital.id, !edital.favorito)
      await loadEdital()
    } catch {
      setError('Não foi possível atualizar o favorito. Tente novamente.')
    } finally {
      setFavoriting(false)
    }
  }

  async function handleArquivar() {
    if (!edital) return
    try {
      await updateEdital(edital.id, { status: 'arquivado' })
      await loadEdital()
    } catch {
      setError('Não foi possível arquivar o edital. Tente novamente.')
    }
  }

  async function handleDelete() {
    if (!edital) return
    setDeleting(true)
    try {
      await deleteEdital(edital.id)
      navigate('/editais', { replace: true })
    } catch {
      setError('Não foi possível excluir o edital. Tente novamente.')
      setDeleting(false)
      setShowDeleteDialog(false)
    }
  }

  if (notFound) {
    return (
      <>
        <Link to="/editais" className="back-link">
          <ArrowLeft size={16} aria-hidden="true" />
          Meus editais
        </Link>
        <div className="not-found-state">
          <h1>Edital não encontrado.</h1>
          <p>O edital que você tentou acessar não existe ou não pertence a você.</p>
          <Link to="/editais" className="button button-primary">
            Voltar para meus editais
          </Link>
        </div>
      </>
    )
  }

  if (loading) {
    return (
      <>
        <Link to="/editais" className="back-link">
          <ArrowLeft size={16} aria-hidden="true" />
          Meus editais
        </Link>
        <div className="loading-state">
          <div className="loading-spinner" aria-hidden="true" />
          <p>Carregando edital...</p>
        </div>
      </>
    )
  }

  if (error && !edital) {
    return (
      <>
        <Link to="/editais" className="back-link">
          <ArrowLeft size={16} aria-hidden="true" />
          Meus editais
        </Link>
        <div className="error-state">
          <p>{error}</p>
          <button type="button" className="button button-secondary" onClick={loadEdital}>
            Tentar novamente
          </button>
        </div>
      </>
    )
  }

  if (!edital) return null

  const localizacao = [edital.cidade, edital.estado].filter(Boolean).join(' - ')

  return (
    <>
      <Link to="/editais" className="back-link">
        <ArrowLeft size={16} aria-hidden="true" />
        Meus editais
      </Link>

      <PageHeader
        eyebrow="DETALHES DO EDITAL"
        title={edital.titulo}
        description={edital.numero_edital ? `Edital ${edital.numero_edital}` : ''}
        action={
          <div className="details-actions">
            <button
              type="button"
              className={`button button-secondary ${edital.favorito ? 'is-favorited' : ''}`}
              onClick={handleToggleFavorito}
              disabled={favoriting}
            >
              <Star size={16} fill={edital.favorito ? 'currentColor' : 'none'} aria-hidden="true" />
              {edital.favorito ? 'Favorito' : 'Favoritar'}
            </button>
            <Link to={`/editais/${edital.id}/editar`} className="button button-secondary">
              <Pencil size={16} aria-hidden="true" />
              Editar
            </Link>
          </div>
        }
      />

      {successMessage && (
        <div className="auth-feedback is-success mb-5" role="status">
          <p>{successMessage}</p>
        </div>
      )}

      {error && (
        <div className="form-error-banner" role="alert">
          {error}
        </div>
      )}

      <div className="details-layout">
        <div className="details-main">
          <section className="panel">
            <div className="panel-heading">
              <h2>
                <FileText size={18} aria-hidden="true" />
                Informações
              </h2>
              <EditalStatusBadge status={edital.status} />
            </div>
            <div className="details-content">
              <dl className="details-list">
                <div className="details-item">
                  <dt>Instituição</dt>
                  <dd>{edital.instituicao}</dd>
                </div>
                <div className="details-item">
                  <dt>Categoria</dt>
                  <dd>{edital.categoria}</dd>
                </div>
                {edital.cargo_curso && (
                  <div className="details-item">
                    <dt>Cargo / curso</dt>
                    <dd>{edital.cargo_curso}</dd>
                  </div>
                )}
                {localizacao && (
                  <div className="details-item">
                    <dt>Localização</dt>
                    <dd>
                      <MapPin size={14} aria-hidden="true" />
                      {localizacao}
                    </dd>
                  </div>
                )}
                {edital.modalidade && (
                  <div className="details-item">
                    <dt>Modalidade</dt>
                    <dd>{MODALIDADE_LABELS[edital.modalidade]}</dd>
                  </div>
                )}
                {edital.valor_inscricao != null && (
                  <div className="details-item">
                    <dt>Valor da inscrição</dt>
                    <dd>R$ {edital.valor_inscricao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</dd>
                  </div>
                )}
                <div className="details-item">
                  <dt>Possui isenção</dt>
                  <dd>{edital.possui_isencao ? 'Sim' : 'Não'}</dd>
                </div>
                <div className="details-item">
                  <dt>Inscrição realizada</dt>
                  <dd>{edital.inscricao_realizada ? 'Sim' : 'Não'}</dd>
                </div>
              </dl>

              {edital.descricao && (
                <div className="details-section">
                  <h3>Descrição</h3>
                  <p>{edital.descricao}</p>
                </div>
              )}

              {edital.observacoes && (
                <div className="details-section">
                  <h3>Observações</h3>
                  <p>{edital.observacoes}</p>
                </div>
              )}
            </div>
          </section>
        </div>

        <aside className="details-sidebar">
          <section className="panel">
            <div className="panel-heading">
              <h2>Links</h2>
            </div>
            <div className="details-links">
              {edital.link_pagina && (
                <ExternalLinkButton href={edital.link_pagina} label="Abrir página oficial" variant="primary" />
              )}
              {edital.link_inscricao && (
                <ExternalLinkButton href={edital.link_inscricao} label="Abrir inscrição" />
              )}
              {edital.link_pdf && (
                <ExternalLinkButton href={edital.link_pdf} label="Abrir PDF" />
              )}
              {!edital.link_pagina && !edital.link_inscricao && !edital.link_pdf && (
                <p className="text-muted">Nenhum link disponível.</p>
              )}
            </div>
          </section>

          <EventoList editalId={edital.id} onEventoChange={loadEdital} />

          <section className="panel">
            <div className="panel-heading">
              <h2>Ações</h2>
            </div>
            <div className="details-actions-list">
              <button
                type="button"
                className="button button-secondary w-full"
                onClick={handleArquivar}
                disabled={edital.status === 'arquivado'}
              >
                <Archive size={16} aria-hidden="true" />
                Arquivar
              </button>
              <button
                type="button"
                className="button button-danger w-full"
                onClick={() => setShowDeleteDialog(true)}
                disabled={deleting}
              >
                <Trash2 size={16} aria-hidden="true" />
                Excluir
              </button>
            </div>
          </section>
        </aside>
      </div>

      <DeleteEditalDialog
        open={showDeleteDialog}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteDialog(false)}
      />
    </>
  )
}
