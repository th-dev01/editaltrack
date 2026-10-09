import { supabase } from '../lib/supabase'
import type { CreateEditalInput, Edital, UpdateEditalInput } from '../types/edital'

function client() {
  if (!supabase) throw new Error('Supabase não configurado')
  return supabase
}

const isUuid = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)

export async function getEditais(signal?: AbortSignal): Promise<Edital[]> {
  const result: Edital[] = []
  const pageSize = 500
  // A API tem limite por resposta. Paginar evita omitir registros nos filtros locais.
  for (let offset = 0; ; offset += pageSize) {
    let query = client().from('editais').select('*')
      .order('created_at', { ascending: false }).order('id', { ascending: false })
      .range(offset, offset + pageSize - 1)
    if (signal) query = query.abortSignal(signal)
    const { data, error } = await query
    if (error) throw error
    result.push(...data)
    if (data.length < pageSize) return result
  }
}

export async function getEditalById(id: string, signal?: AbortSignal): Promise<Edital | null> {
  if (!isUuid(id)) return null
  let query = client().from('editais').select('*').eq('id', id)
  if (signal) query = query.abortSignal(signal)
  const { data, error } = await query.maybeSingle()
  if (error) throw error
  return data
}

export async function createEdital(input: CreateEditalInput): Promise<Edital> {
  const db = client()
  // getUser valida o usuário no Auth; não duplica a gestão de sessão do provider.
  const { data: { user }, error: authError } = await db.auth.getUser()
  if (authError) throw authError
  if (!user) throw new Error('Sessão necessária')
  const { data, error } = await db.from('editais').insert({ ...input, user_id: user.id }).select('*').single()
  if (error) throw error
  return data
}

export async function updateEdital(id: string, input: UpdateEditalInput): Promise<Edital> {
  const { data, error } = await client().from('editais').update(input).eq('id', id).select('*').single()
  if (error) throw error
  return data
}

export async function deleteEdital(id: string): Promise<void> {
  const { data, error } = await client().from('editais').delete().eq('id', id).select('id').single()
  if (error) throw error
  if (!data) throw new Error('Edital não encontrado')
}

export function toggleFavorito(id: string, favorito: boolean): Promise<Edital> {
  return updateEdital(id, { favorito })
}
