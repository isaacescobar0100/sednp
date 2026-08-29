// Capa de acceso a Supabase para Aportes (cuotas por afiliado y periodo).
import { supabase } from '../lib/supabase'
import { Aporte, AporteMethod, AporteStatus, AporteTipo } from './contributions'

type Row = {
  id: string
  affiliate_id: string
  period: string
  amount: number | string
  tipo: AporteTipo
  status: AporteStatus
  acta: string | null
  anticipada: boolean | null
  paid_date: string | null
  method: AporteMethod | null
}

export function rowToAporte(r: Row): Aporte {
  return {
    id: r.id,
    affiliateId: r.affiliate_id,
    period: r.period,
    amount: Number(r.amount) || 0,
    tipo: r.tipo,
    status: r.status,
    acta: r.acta ?? undefined,
    anticipada: r.anticipada ?? false,
    paidDate: r.paid_date ?? undefined,
    method: r.method ?? undefined,
  }
}

// Fila para insert/update (sin id; solo campos presentes).
export function aporteToRow(a: Partial<Aporte>): Record<string, unknown> {
  const row: Record<string, unknown> = {}
  const set = (k: string, v: unknown) => { if (v !== undefined) row[k] = v }
  set('affiliate_id', a.affiliateId)
  set('period', a.period)
  set('amount', a.amount)
  set('tipo', a.tipo)
  set('status', a.status)
  set('acta', a.acta)
  set('anticipada', a.anticipada)
  set('paid_date', a.paidDate)
  set('method', a.method)
  return row
}

export async function fetchAportes(): Promise<Aporte[]> {
  const { data, error } = await supabase.from('aportes').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return (data as Row[]).map(rowToAporte)
}

// Inserta uno o varios aportes y devuelve las filas creadas (con su id real).
export async function insertAportes(list: Aporte[]): Promise<Aporte[]> {
  if (list.length === 0) return []
  const { data, error } = await supabase.from('aportes').insert(list.map(aporteToRow)).select()
  if (error) throw error
  return (data as Row[]).map(rowToAporte)
}

export async function patchAporte(id: string, changes: Partial<Aporte>): Promise<void> {
  const { error } = await supabase.from('aportes').update(aporteToRow(changes)).eq('id', id)
  if (error) throw error
}
