// Capa de acceso a Supabase para Documental (metadatos; el archivo va en Storage).
import { supabase } from '../lib/supabase'
import { Doc, DocType } from './documents'

type Row = {
  id: string
  code: string
  title: string
  type: DocType
  file_name: string | null
  file_size: number | string | null
  storage_path: string | null
  date: string | null
}

function rowToDoc(r: Row): Doc {
  return {
    id: r.id,
    code: r.code,
    title: r.title,
    type: r.type,
    fileName: r.file_name ?? '',
    fileSize: Number(r.file_size) || 0,
    storagePath: r.storage_path ?? undefined,
    date: r.date ?? '',
  }
}

function docToRow(d: Partial<Doc>): Record<string, unknown> {
  const row: Record<string, unknown> = {}
  const set = (k: string, v: unknown) => { if (v !== undefined) row[k] = v }
  set('code', d.code); set('title', d.title); set('type', d.type)
  set('file_name', d.fileName); set('file_size', d.fileSize)
  set('storage_path', d.storagePath); set('date', d.date)
  return row
}

export async function fetchDocs(): Promise<Doc[]> {
  const { data, error } = await supabase.from('docs').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return (data as Row[]).map(rowToDoc)
}

export async function insertDoc(d: Doc): Promise<Doc> {
  const { data, error } = await supabase.from('docs').insert(docToRow(d)).select().single()
  if (error) throw error
  return rowToDoc(data as Row)
}

export async function patchDoc(id: string, changes: Partial<Doc>): Promise<void> {
  const { error } = await supabase.from('docs').update(docToRow(changes)).eq('id', id)
  if (error) throw error
}

export async function deleteDocRow(id: string): Promise<void> {
  const { error } = await supabase.from('docs').delete().eq('id', id)
  if (error) throw error
}
