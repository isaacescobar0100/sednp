// Capa de acceso a Supabase para Movimientos (libro contable de Tesorería).
import { supabase } from '../lib/supabase'
import { Movement, MovementKind, MovementStatus, NivelGasto } from './finance'

type Row = {
  id: string
  date: string
  concept: string
  category: string
  kind: MovementKind
  amount: number | string
  status: MovementStatus
  nivel: NivelGasto | null
  firma_presidente: boolean | null
  firma_tesorero: boolean | null
  firma_fiscal: boolean | null
  orden_pago: string | null
  acta_asamblea: string | null
}

export function rowToMovement(r: Row): Movement {
  return {
    id: r.id,
    date: r.date,
    concept: r.concept,
    category: r.category,
    kind: r.kind,
    amount: Number(r.amount) || 0,
    status: r.status,
    nivel: r.nivel ?? undefined,
    firmas: r.kind === 'Egreso'
      ? { presidente: !!r.firma_presidente, tesorero: !!r.firma_tesorero, fiscal: !!r.firma_fiscal }
      : undefined,
    ordenPago: r.orden_pago ?? undefined,
    actaAsamblea: r.acta_asamblea ?? undefined,
  }
}

export function movementToRow(m: Partial<Movement>): Record<string, unknown> {
  const row: Record<string, unknown> = {}
  const set = (k: string, v: unknown) => { if (v !== undefined) row[k] = v }
  set('date', m.date)
  set('concept', m.concept)
  set('category', m.category)
  set('kind', m.kind)
  set('amount', m.amount)
  set('status', m.status)
  set('nivel', m.nivel)
  set('orden_pago', m.ordenPago)
  set('acta_asamblea', m.actaAsamblea)
  if (m.firmas !== undefined) {
    row.firma_presidente = !!m.firmas?.presidente
    row.firma_tesorero = !!m.firmas?.tesorero
    row.firma_fiscal = !!m.firmas?.fiscal
  }
  return row
}

export async function fetchMovements(): Promise<Movement[]> {
  const { data, error } = await supabase.from('movements').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return (data as Row[]).map(rowToMovement)
}

export async function insertMovement(m: Movement): Promise<Movement> {
  const { data, error } = await supabase.from('movements').insert(movementToRow(m)).select().single()
  if (error) throw error
  return rowToMovement(data as Row)
}

export async function patchMovement(id: string, changes: Partial<Movement>): Promise<void> {
  const { error } = await supabase.from('movements').update(movementToRow(changes)).eq('id', id)
  if (error) throw error
}

export async function deleteMovementRow(id: string): Promise<void> {
  const { error } = await supabase.from('movements').delete().eq('id', id)
  if (error) throw error
}
