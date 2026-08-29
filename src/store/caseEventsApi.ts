// Bitácora de actuaciones disciplinarias (append-only) en Supabase.
import { supabase } from '../lib/supabase'

export type CaseEvent = {
  id: string
  caseId: string
  tipo: string
  fecha: string
  actorRole: string
  nota: string
  soportePath?: string
}

// Datos para registrar una actuación (sin id; se genera en la BD).
export type NewCaseEvent = {
  caseId: string
  tipo: string
  fecha: string
  actorRole: string
  nota?: string
  soportePath?: string
}

type Row = {
  id: string
  case_id: string
  tipo: string
  fecha: string | null
  actor_role: string | null
  nota: string | null
  soporte_path: string | null
}

function rowToEvent(r: Row): CaseEvent {
  return {
    id: r.id,
    caseId: r.case_id,
    tipo: r.tipo,
    fecha: r.fecha ?? '',
    actorRole: r.actor_role ?? '',
    nota: r.nota ?? '',
    soportePath: r.soporte_path ?? undefined,
  }
}

export async function fetchCaseEvents(): Promise<CaseEvent[]> {
  const { data, error } = await supabase.from('case_events').select('*').order('created_at', { ascending: true })
  if (error) throw error
  return (data as Row[]).map(rowToEvent)
}

export async function insertCaseEvent(e: NewCaseEvent): Promise<CaseEvent> {
  const row = {
    case_id: e.caseId,
    tipo: e.tipo,
    fecha: e.fecha,
    actor_role: e.actorRole,
    nota: e.nota ?? '',
    soporte_path: e.soportePath ?? null,
  }
  const { data, error } = await supabase.from('case_events').insert(row).select().single()
  if (error) throw error
  return rowToEvent(data as Row)
}
