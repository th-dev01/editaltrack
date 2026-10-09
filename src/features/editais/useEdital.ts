import { useEffect, useState } from 'react'
import { getEditalById } from '../../services/editais.service'
import type { Edital } from '../../types/edital'
import { editalErrorMessage, reportEditalError } from './edital-errors'

export function useEdital(id: string) {
  const [revision, setRevision] = useState(0)
  const [state, setState] = useState<{ id: string; revision: number; edital: Edital | null; error: string | null } | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    getEditalById(id, controller.signal).then((edital) => {
      if (!controller.signal.aborted) setState({ id, revision, edital, error: null })
    }).catch((error: unknown) => {
      if (controller.signal.aborted) return
      reportEditalError(error)
      setState({ id, revision, edital: null, error: editalErrorMessage(error, 'Não foi possível carregar o edital. Tente novamente.') })
    })
    return () => controller.abort()
  }, [id, revision])

  const loading = state?.id !== id || state.revision !== revision
  return {
    loading,
    edital: loading ? null : state.edital,
    error: loading ? null : state.error,
    retry: () => setRevision((value) => value + 1),
    setEdital: (edital: Edital) => setState({ id, revision, edital, error: null }),
  }
}
