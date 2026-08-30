// Capa de acceso a Supabase para Comités.
import { supabase } from '../lib/supabase'
import { Committee, CommitteeTipo } from './committees'

type Row = {
  id: string
  name: string
  lead: string | null
  members: string[] | null
  next: string | null
  activity: string | null
  color: string | null
  tipo: CommitteeTipo | null
}

function rowToCommittee(r: Row): Committee {
  return {
    id: r.id,
    name: r.name,
    lead: r.lead ?? 'Por designar',
    members: Array.isArray(r.members) ? r.members : [],
    next: r.next ?? 'Por programar',
    activity: r.activity ?? '',
    color: r.color ?? 'bg-night',
    tipo: r.tipo ?? undefined,
  }
}

function committeeToRow(c: Partial<Committee>): Record<string, unknown> {
  const row: Record<string, unknown> = {}
  const set = (k: string, v: unknown) => { if (v !== undefined) row[k] = v }
  set('name', c.name); set('lead', c.lead); set('members', c.members)
  set('next', c.next); set('activity', c.activity); set('color', c.color); set('tipo', c.tipo)
  return row
}

export async function fetchCommittees(): Promise<Committee[]> {
  const { data, error } = await supabase.from('committees').select('*').order('name', { ascending: true })
  if (error) throw error
  return (data as Row[]).map(rowToCommittee)
}

export async function insertCommittee(c: Committee): Promise<Committee> {
  const { data, error } = await supabase.from('committees').insert(committeeToRow(c)).select().single()
  if (error) throw error
  return rowToCommittee(data as Row)
}

export async function patchCommittee(id: string, changes: Partial<Committee>): Promise<void> {
  const { error } = await supabase.from('committees').update(committeeToRow(changes)).eq('id', id)
  if (error) throw error
}

export async function deleteCommitteeRow(id: string): Promise<void> {
  const { error } = await supabase.from('committees').delete().eq('id', id)
  if (error) throw error
}
