// Capa de acceso a Supabase para Disciplinario (expedientes).
import { supabase } from '../lib/supabase'
import { CaseStatus, DisciplineCase, RecursoEstado, RecursoResultado, RecursoTipo, Sancion } from './discipline'

type Row = {
  id: string
  code: string
  subject: string
  person: string | null
  opened_date: string | null
  stage_index: number
  days_left: number
  status: CaseStatus
  sancion: Sancion | null
  multa_monto: number | string | null
  recurso_tipo: RecursoTipo | null
  recurso_estado: RecursoEstado | null
  recurso_resultado: RecursoResultado | null
}

export function rowToCase(r: Row): DisciplineCase {
  return {
    id: r.id,
    code: r.code,
    subject: r.subject,
    person: r.person ?? '',
    openedDate: r.opened_date ?? '',
    stageIndex: r.stage_index,
    daysLeft: r.days_left,
    status: r.status,
    sancion: r.sancion ?? undefined,
    multaMonto: r.multa_monto != null ? Number(r.multa_monto) : undefined,
    recursoTipo: r.recurso_tipo ?? undefined,
    recursoEstado: r.recurso_estado ?? undefined,
    recursoResultado: r.recurso_resultado ?? undefined,
  }
}

export function caseToRow(c: Partial<DisciplineCase>): Record<string, unknown> {
  const row: Record<string, unknown> = {}
  const set = (k: string, v: unknown) => { if (v !== undefined) row[k] = v }
  set('code', c.code)
  set('subject', c.subject)
  set('person', c.person)
  set('opened_date', c.openedDate)
  set('stage_index', c.stageIndex)
  set('days_left', c.daysLeft)
  set('status', c.status)
  set('sancion', c.sancion ?? null)
  set('multa_monto', c.multaMonto ?? null)
  set('recurso_tipo', c.recursoTipo ?? null)
  set('recurso_estado', c.recursoEstado ?? null)
  set('recurso_resultado', c.recursoResultado ?? null)
  return row
}

export async function fetchCases(): Promise<DisciplineCase[]> {
  const { data, error } = await supabase.from('cases').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return (data as Row[]).map(rowToCase)
}

export async function insertCase(c: DisciplineCase): Promise<DisciplineCase> {
  const { data, error } = await supabase.from('cases').insert(caseToRow(c)).select().single()
  if (error) throw error
  return rowToCase(data as Row)
}

export async function patchCase(id: string, changes: Partial<DisciplineCase>): Promise<void> {
  const { error } = await supabase.from('cases').update(caseToRow(changes)).eq('id', id)
  if (error) throw error
}

export async function deleteCaseRow(id: string): Promise<void> {
  const { error } = await supabase.from('cases').delete().eq('id', id)
  if (error) throw error
}
