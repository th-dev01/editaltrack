import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { Plus, SearchX } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { PageHeader } from '../components/PageHeader'
import { EmptyState } from '../components/EmptyState'
import { EditalCard } from '../features/editais/EditalCard'
import { EditalFilters, type EditalFilterValues } from '../features/editais/EditalFilters'
import { getDefaultFilters } from '../features/editais/edital-filter-utils'
import { getEditais, toggleFavorito } from '../services/editais.service'
import type { Edital } from '../types/edital'
import { EDITAIS_STATUS } from '../features/editais/edital-options'

export function EditaisPage() {
  const [searchParams] = useSearchParams()
  const [editais, setEditais] = useState<Edital[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [filters, setFilters] = useState<EditalFilterValues>(() => {
    const defaults = getDefaultFilters()
    const requestedStatus = searchParams.get('status')
    return {
      ...defaults,
      status: EDITAIS_STATUS.find((status) => status === requestedStatus) ?? '',
      favorito: searchParams.get('favorito') === 'true',
    }
  })
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  const loadEditais = useCallback(async () => {
    if (!mountedRef.current) return
    setLoading(true)
    setError(null)
    try {
      const data = await getEditais()
      if (mountedRef.current) setEditais(data)
    } catch {
      if (mountedRef.current) setError('Não foi possível carregar seus editais. Tente novamente.')
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadEditais()
  }, [loadEditais])

  const filteredEditais = useMemo(() => {
    let result = [...editais]

    // Busca
    if (filters.query.trim()) {
      const query = filters.query.toLowerCase().trim()
      result = result.filter((e) =>
        e.titulo.toLowerCase().includes(query) ||
        e.instituicao.toLowerCase().includes(query) ||
        (e.numero_edital && e.numero_edital.toLowerCase().includes(query)) ||
        (e.cargo_curso && e.cargo_curso.toLowerCase().includes(query)) ||
        (e.cidade && e.cidade.toLowerCase().includes(query))
      )
    }

    // Filtros
    if (filters.categoria) result = result.filter((e) => e.categoria === filters.categoria)
    if (filters.status) result = result.filter((e) => e.status === filters.status)
    if (filters.modalidade) result = result.filter((e) => e.modalidade === filters.modalidade)
    if (filters.favorito) result = result.filter((e) => e.favorito)

    // Ordenação
    switch (filters.order) {
      case 'antigos':
        result.sort((a, b) => a.created_at.localeCompare(b.created_at))
        break
      case 'titulo':
        result.sort((a, b) => a.titulo.localeCompare(b.titulo, 'pt-BR'))
        break
      case 'instituicao':
        result.sort((a, b) => a.instituicao.localeCompare(b.instituicao, 'pt-BR'))
        break
      default: // recentes
        result.sort((a, b) => b.created_at.localeCompare(a.created_at))
    }

    return result
  }, [editais, filters])

  async function handleToggleFavorito(id: string, favorito: boolean) {
    setActionError(null)
    try {
      await toggleFavorito(id, favorito)
      await loadEditais()
    } catch {
      setActionError('Não foi possível atualizar o favorito. Tente novamente.')
    }
  }

  function clearFilters() {
    setFilters(getDefaultFilters())
  }

  return (
    <>
      <PageHeader
        eyebrow="SUAS OPORTUNIDADES"
        title="Meus editais"
        description="Do primeiro interesse ao resultado final, acompanhe sua jornada."
        action={
          <Link to="/editais/novo" className="button button-primary">
            <Plus size={18} aria-hidden="true" />
            Novo edital
          </Link>
        }
      />

      <EditalFilters
        value={filters}
        onChange={setFilters}
        onClear={clearFilters}
      />

      {actionError && <div className="form-error-banner" role="alert">{actionError}</div>}

      {loading ? (
        <div className="loading-state">
          <div className="loading-spinner" aria-hidden="true" />
          <p>Carregando editais...</p>
        </div>
      ) : error ? (
        <div className="error-state">
          <p>{error}</p>
          <button type="button" className="button button-secondary" onClick={loadEditais}>
            Tentar novamente
          </button>
        </div>
      ) : editais.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title="Nenhum edital cadastrado."
          description="Salve sua primeira oportunidade para começar a acompanhar seus processos."
          action={
            <Link to="/editais/novo" className="button button-primary">
              <Plus size={18} aria-hidden="true" />
              Novo edital
            </Link>
          }
        />
      ) : filteredEditais.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title="Nenhum edital corresponde aos filtros selecionados."
          description="Ajuste os filtros ou limpe-os para ver todos os editais."
          action={
            <button type="button" className="button button-secondary" onClick={clearFilters}>
              Limpar filtros
            </button>
          }
        />
      ) : (
        <div className="editais-grid">
          {filteredEditais.map((edital) => (
            <EditalCard
              key={edital.id}
              edital={edital}
              onToggleFavorito={handleToggleFavorito}
            />
          ))}
        </div>
      )}
    </>
  )
}
