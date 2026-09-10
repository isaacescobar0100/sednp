// Libro de Actas y Resoluciones: registros institucionales INMUTABLES
// (conceptos del Fiscal, resoluciones de afiliación, etc.) en Supabase.
import { supabase } from '../lib/supabase'

export type Acto = {
  id: string
  tipo: string
  numero: string
  titulo: string
  cuerpo: string
  referencia: string
  affiliateId?: string
  resultado?: string
  actorRole: string
  soportePath?: string
  fecha: string
}

// Datos para registrar un acto (sin id; se genera en la BD).
export type NewActo = {
  tipo: string
  numero: string
  titulo: string
  cuerpo?: string
  referencia?: string
  affiliateId?: string
  resultado?: string
  actorRole: string
  soportePath?: string
  fecha: string
}

type Row = {
  id: string
  tipo: string
  numero: string | null
  titulo: string | null
  cuerpo: string | null
  referencia: string | null
  affiliate_id: string | null
  resultado: string | null
  actor_role: string | null
  soporte_path: string | null
  fecha: string | null
}

function rowToActo(r: Row): Acto {
  return {
    id: r.id,
    tipo: r.tipo,
    numero: r.numero ?? '',
    titulo: r.titulo ?? '',
    cuerpo: r.cuerpo ?? '',
    referencia: r.referencia ?? '',
    affiliateId: r.affiliate_id ?? undefined,
    resultado: r.resultado ?? undefined,
    actorRole: r.actor_role ?? '',
    soportePath: r.soporte_path ?? undefined,
    fecha: r.fecha ?? '',
  }
}

export async function fetchActos(): Promise<Acto[]> {
  const { data, error } = await supabase.from('actos').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return (data as Row[]).map(rowToActo)
}

export async function insertActo(a: NewActo): Promise<Acto> {
  const row = {
    tipo: a.tipo,
    numero: a.numero,
    titulo: a.titulo,
    cuerpo: a.cuerpo ?? '',
    referencia: a.referencia ?? '',
    affiliate_id: a.affiliateId ?? null,
    resultado: a.resultado ?? null,
    actor_role: a.actorRole,
    soporte_path: a.soportePath ?? null,
    fecha: a.fecha,
  }
  const { data, error } = await supabase.from('actos').insert(row).select().single()
  if (error) throw error
  return rowToActo(data as Row)
}

// Consecutivo por tipo: PREFIJO-AÑO-NNN (p. ej. CF-2026-001).
export function nextActoNumero(actos: Acto[], prefix: string): string {
  const year = new Date().getFullYear()
  const head = `${prefix}-${year}-`
  const n = actos.filter((a) => a.numero.startsWith(head)).length + 1
  return `${head}${String(n).padStart(3, '0')}`
}
