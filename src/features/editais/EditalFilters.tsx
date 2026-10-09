import { Search, SlidersHorizontal } from 'lucide-react'
import { useState } from 'react'
import { CATEGORIAS, MODALIDADE_LABELS, STATUS_LABELS } from './edital-options'

export interface EditalFilterValues {
  query: string
  categoria: string
  status: string
  modalidade: string
  favorito: boolean
  order: string
}

export function EditalFilters({ value, onChange, onClear }: { value: EditalFilterValues; onChange: (value: EditalFilterValues) => void; onClear: () => void }) {
  const [expanded, setExpanded] = useState(false)
  const count = [value.categoria, value.status, value.modalidade, value.favorito].filter(Boolean).length
  return (
    <section className="edital-filters" aria-label="Busca e filtros de editais">
      <div className="edital-search-row">
        <div className="search-field"><Search size={18} aria-hidden="true" /><label htmlFor="busca-editais" className="sr-only">Buscar editais</label><input id="busca-editais" type="search" placeholder="Buscar editais..." value={value.query} onChange={(event) => onChange({ ...value, query: event.target.value })} /></div>
        <button className="button button-secondary" type="button" aria-expanded={expanded} aria-controls="edital-filter-options" onClick={() => setExpanded(!expanded)}><SlidersHorizontal size={17} aria-hidden="true" />Filtros{count > 0 && ` (${count})`}</button>
      </div>
      <div id="edital-filter-options" hidden={!expanded}>
        <div className="edital-filter-grid">
          <label>Categoria<select value={value.categoria} onChange={(event) => onChange({ ...value, categoria: event.target.value })}><option value="">Todas as categorias</option>{CATEGORIAS.map((label) => <option key={label}>{label}</option>)}</select></label>
          <label>Status<select value={value.status} onChange={(event) => onChange({ ...value, status: event.target.value })}><option value="">Todos os status</option>{Object.entries(STATUS_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
          <label>Modalidade<select value={value.modalidade} onChange={(event) => onChange({ ...value, modalidade: event.target.value })}><option value="">Todas as modalidades</option>{Object.entries(MODALIDADE_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
          <label className="checkbox-label"><input type="checkbox" checked={value.favorito} onChange={(event) => onChange({ ...value, favorito: event.target.checked })} />Somente favoritos</label>
        </div>
      </div>
      <div className="edital-sort-row"><label htmlFor="ordem-editais">Ordenar por</label><select id="ordem-editais" value={value.order} onChange={(event) => onChange({ ...value, order: event.target.value })}><option value="recentes">Mais recentes</option><option value="antigos">Mais antigos</option><option value="titulo">Título A–Z</option><option value="instituicao">Instituição A–Z</option></select><button className="button button-ghost" type="button" onClick={onClear}>Limpar filtros</button></div>
    </section>
  )
}
