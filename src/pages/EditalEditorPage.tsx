import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PageHeader } from '../components/PageHeader'
import { EditalForm } from '../features/editais/EditalForm'
import { createEdital, updateEdital, getEditalById } from '../services/editais.service'
import type { EditalFormOutput } from '../features/editais/edital-schema'
import type { Edital } from '../types/edital'

interface EditalEditorPageProps {
  mode: 'create' | 'edit'
}

export function EditalEditorPage({ mode }: EditalEditorPageProps) {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const editing = mode === 'edit'

  const [edital, setEdital] = useState<Edital | null>(null)
  const [loading, setLoading] = useState(editing)
  const [error, setError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)
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
    if (editing) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadEdital()
    }
  }, [editing, loadEdital])

  async function handleSubmit(values: EditalFormOutput) {
    setError(null)
    try {
      if (editing && id) {
        await updateEdital(id, values)
        navigate(`/editais/${id}`, { replace: true, state: { successMessage: 'Edital atualizado com sucesso.' } })
      } else {
        const created = await createEdital(values)
        navigate(`/editais/${created.id}`, { replace: true, state: { successMessage: 'Edital cadastrado com sucesso.' } })
      }
    } catch {
      setError('Não foi possível salvar o edital. Tente novamente.')
    }
  }

  function handleCancel() {
    if (editing && id) {
      navigate(`/editais/${id}`)
    } else {
      navigate('/editais')
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

  return (
    <>
      <Link to={editing && id ? `/editais/${id}` : '/editais'} className="back-link">
        <ArrowLeft size={16} aria-hidden="true" />
        {editing ? 'Detalhes do edital' : 'Meus editais'}
      </Link>
      <PageHeader
        eyebrow={editing ? 'ATUALIZAR INFORMAÇÕES' : 'UM NOVO CAMINHO'}
        title={editing ? 'Editar edital' : 'Novo edital'}
        description={editing ? 'Atualize as informações da sua oportunidade.' : 'Comece pelo essencial. Os detalhes podem vir depois.'}
      />

      {error && (
        <div className="form-error-banner" role="alert">
          {error}
        </div>
      )}

      <div className="panel">
        <EditalForm
          initialValues={edital ?? undefined}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          submitLabel={editing ? 'Salvar alterações' : 'Cadastrar edital'}
          loadingLabel={editing ? 'Salvando...' : 'Cadastrando...'}
        />
      </div>
    </>
  )
}
