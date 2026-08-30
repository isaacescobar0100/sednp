// Capa de acceso a Supabase para Comunicaciones.
import { supabase } from '../lib/supabase'
import { CommStatus, Comunicado } from './comms'

type Row = {
  id: string
  subject: string
  audience: string | null
  recipients: number | null
  date: string | null
  status: CommStatus
}

function rowToComunicado(r: Row): Comunicado {
  return {
    id: r.id,
    subject: r.subject,
    audience: r.audience ?? '',
    recipients: r.recipients ?? 0,
    date: r.date ?? '',
    status: r.status,
  }
}

export async function fetchComunicados(): Promise<Comunicado[]> {
  const { data, error } = await supabase.from('comunicados').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return (data as Row[]).map(rowToComunicado)
}

export async function insertComunicado(c: Omit<Comunicado, 'id'>): Promise<Comunicado> {
  const { data, error } = await supabase.from('comunicados')
    .insert({ subject: c.subject, audience: c.audience, recipients: c.recipients, date: c.date, status: c.status })
    .select().single()
  if (error) throw error
  return rowToComunicado(data as Row)
}

export async function deleteComunicadoRow(id: string): Promise<void> {
  const { error } = await supabase.from('comunicados').delete().eq('id', id)
  if (error) throw error
}
