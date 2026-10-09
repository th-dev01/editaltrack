import type { EditalFilterValues } from './EditalFilters'

export function getDefaultFilters(): EditalFilterValues {
  return { query: '', categoria: '', status: '', modalidade: '', favorito: false, order: 'recentes' }
}
