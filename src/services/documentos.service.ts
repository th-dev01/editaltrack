import { supabase } from '../lib/supabase'
import type { CreateDocumentoEditalInput, DocumentoEdital, UpdateDocumentoEditalInput } from '@edital-types/edital'

// Helper para acessar o cliente Supabase ignorando tipos estritos de tabela
// A tabela documentos_edital será criada via migration e ainda não está nos tipos gerados
function getClient() {
  if (!supabase) throw new Error('Supabase não configurado')
  return supabase!
}

const isUuid = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)

export async function getDocumentosByEdital(editalId: string): Promise<DocumentoEdital[]> {
  if (!isUuid(editalId)) return []
  // @ts-expect-error - documentos_edital table not in generated types yet (migration pending)
  const query = getClient().from('documentos_edital').select('*').eq('edital_id', editalId).order('ordem', { ascending: true }).order('created_at', { ascending: true })
  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as unknown as DocumentoEdital[]
}

export async function getDocumentoById(id: string): Promise<DocumentoEdital | null> {
  if (!isUuid(id)) return null
  // @ts-expect-error - documentos_edital table not in generated types yet (migration pending)
  const { data, error } = await getClient().from('documentos_edital').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return data as unknown as DocumentoEdital | null
}

export async function createDocumento(input: CreateDocumentoEditalInput): Promise<DocumentoEdital> {
  const db = getClient()
  const { data: { user }, error: authError } = await db.auth.getUser()
  if (authError) throw authError
  if (!user) throw new Error('Sessão necessária')

  const payload = {
    ...input,
    user_id: user.id,
    providenciado: input.providenciado ?? false,
    enviado: input.enviado ?? false,
    obrigatorio: input.obrigatorio ?? true,
    ordem: input.ordem ?? 0,
  } as Record<string, unknown>

  // @ts-expect-error - documentos_edital table not in generated types yet (migration pending)
  const { data, error } = await getClient().from('documentos_edital').insert(payload).select('*').single()
  if (error) throw error
  return data as unknown as DocumentoEdital
}

export async function updateDocumento(id: string, input: UpdateDocumentoEditalInput): Promise<DocumentoEdital> {
  const payload: Record<string, unknown> = { ...input }
  // Garantir regra: enviado => providenciado
  if (input.enviado === true) {
    payload.providenciado = true
  }
  if (input.providenciado === false) {
    payload.enviado = false
  }

  // @ts-expect-error - documentos_edital table not in generated types yet (migration pending)
  const { data, error } = await getClient().from('documentos_edital').update(payload).eq('id', id).select('*').single()
  if (error) throw error
  return data as unknown as DocumentoEdital
}

export async function deleteDocumento(id: string): Promise<void> {
  // @ts-expect-error - documentos_edital table not in generated types yet (migration pending)
  const { data, error } = await getClient().from('documentos_edital').delete().eq('id', id).select('id').single()
  if (error) throw error
  if (!data) throw new Error('Documento não encontrado')
}

export async function toggleProvidenciado(id: string, providenciado: boolean): Promise<DocumentoEdital> {
  return updateDocumento(id, { providenciado, enviado: providenciado ? undefined : false })
}

export async function toggleEnviado(id: string, enviado: boolean): Promise<DocumentoEdital> {
  return updateDocumento(id, { enviado, providenciado: enviado ? true : undefined })
}

export async function createDocumentosBatch(editalId: string, documentos: CreateDocumentoEditalInput[]): Promise<DocumentoEdital[]> {
  const db = getClient()
  const { data: { user }, error: authError } = await db.auth.getUser()
  if (authError) throw authError
  if (!user) throw new Error('Sessão necessária')

  // Buscar documentos existentes para evitar duplicatas
  const existentes = await getDocumentosByEdital(editalId)
  const nomesExistentes = new Set(existentes.map(d => d.nome.toLowerCase().trim()))

  const novos = documentos
    .filter(d => !nomesExistentes.has(d.nome.toLowerCase().trim()))
    .map((d, index) => ({
      ...d,
      user_id: user.id,
      edital_id: editalId,
      providenciado: d.providenciado ?? false,
      enviado: d.enviado ?? false,
      obrigatorio: d.obrigatorio ?? true,
      ordem: d.ordem ?? existentes.length + index,
    }))

  if (novos.length === 0) return []

  // @ts-expect-error - documentos_edital table not in generated types yet (migration pending)
  const { data, error } = await getClient().from('documentos_edital').insert(novos).select('*')
  if (error) throw error
  return (data ?? []) as unknown as DocumentoEdital[]
}

export async function getDocumentosPendentes(limite = 5): Promise<{ id: string; edital_id: string; edital_titulo: string; edital_numero: string | null; nome: string; obrigatorio: boolean }[]> {
  const db = getClient()
  const { data: { user }, error: authError } = await db.auth.getUser()
  if (authError) throw authError
  if (!user) throw new Error('Sessão necessária')

  // @ts-expect-error - documentos_edital table not in generated types yet (migration pending)
  const query = db.from('documentos_edital')
    .select(`
      id,
      edital_id,
      nome,
      obrigatorio,
      providenciado,
      editais!inner (
        titulo,
        numero_edital
      )
    `)
    .eq('user_id', user.id)
    // @ts-expect-error - documentos_edital table not in generated types yet
    .eq('obrigatorio', true)
    // @ts-expect-error - documentos_edital table not in generated types yet
    .eq('providenciado', false)
    .order('created_at', { ascending: true })
    .limit(limite)

  const { data, error } = await query
  if (error) throw error

  type DocumentoPendenteComEdital = {
    id: string
    edital_id: string
    nome: string
    obrigatorio: boolean
    editais: { titulo: string; numero_edital: string | null }
  }
  const documentos = (data ?? []) as unknown as DocumentoPendenteComEdital[]

  return documentos.map((e) => ({
    id: e.id,
    edital_id: e.edital_id,
    edital_titulo: e.editais.titulo,
    edital_numero: e.editais.numero_edital,
    nome: e.nome,
    obrigatorio: e.obrigatorio,
  }))
}
