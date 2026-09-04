// Capa de acceso a Supabase para el módulo de Afiliados.
// Mapea entre la fila de la tabla (snake_case) y el modelo de la app (camelCase).
import { supabase } from '../lib/supabase'
import { Affiliate, AffiliateStatus } from './affiliates'

type Row = {
  id: string
  name: string
  doc: string
  role: string | null
  cargo_titular: string | null
  dependency: string | null
  type: string | null
  asignacion_basica: number | string
  email: string | null
  phone: string | null
  address: string | null
  foto_url: string | null
  beneficios: string[] | null
  medio: string | null
  motivo: string | null
  interes_comites: string | null
  solicitud_no: string | null
  concepto_fiscal: 'Positivo' | 'Negativo' | null
  aprobacion_acta: string | null
  aprobacion_fecha: string | null
  join_date: string | null
  status: AffiliateStatus
}

export function rowToAffiliate(r: Row): Affiliate {
  return {
    id: r.id,
    name: r.name,
    doc: r.doc,
    role: r.role ?? '',
    cargoTitular: r.cargo_titular ?? '',
    dependency: r.dependency ?? '',
    type: r.type ?? '',
    asignacionBasica: Number(r.asignacion_basica) || 0,
    email: r.email ?? '',
    phone: r.phone ?? '',
    address: r.address ?? '',
    fotoUrl: r.foto_url ?? '',
    password: '', // la contraseña la maneja Supabase Auth, no la tabla
    beneficios: Array.isArray(r.beneficios) ? r.beneficios : [],
    medio: r.medio ?? '',
    motivo: r.motivo ?? '',
    interesComites: r.interes_comites ?? '',
    solicitudNo: r.solicitud_no ?? '',
    conceptoFiscal: r.concepto_fiscal ?? undefined,
    aprobacionActa: r.aprobacion_acta ?? undefined,
    aprobacionFecha: r.aprobacion_fecha ?? undefined,
    joinDate: r.join_date ?? '',
    status: r.status,
  }
}

// Solo incluye los campos presentes (para inserts y updates parciales).
export function affiliateToRow(a: Partial<Affiliate>): Record<string, unknown> {
  const row: Record<string, unknown> = {}
  const set = (k: string, v: unknown) => { if (v !== undefined) row[k] = v }
  set('name', a.name)
  set('doc', a.doc)
  set('role', a.role)
  set('cargo_titular', a.cargoTitular)
  set('dependency', a.dependency)
  set('type', a.type)
  set('asignacion_basica', a.asignacionBasica)
  set('email', a.email)
  set('phone', a.phone)
  set('address', a.address)
  set('foto_url', a.fotoUrl)
  set('beneficios', a.beneficios)
  set('medio', a.medio)
  set('motivo', a.motivo)
  set('interes_comites', a.interesComites)
  set('solicitud_no', a.solicitudNo)
  set('concepto_fiscal', a.conceptoFiscal)
  set('aprobacion_acta', a.aprobacionActa)
  set('aprobacion_fecha', a.aprobacionFecha)
  set('join_date', a.joinDate)
  set('status', a.status)
  return row
}

export async function fetchAffiliates(): Promise<Affiliate[]> {
  const { data, error } = await supabase.from('affiliates').select('*').order('created_at', { ascending: true })
  if (error) throw error
  return (data as Row[]).map(rowToAffiliate)
}

export async function insertAffiliate(a: Affiliate): Promise<Affiliate> {
  const { data, error } = await supabase.from('affiliates').insert(affiliateToRow(a)).select().single()
  if (error) throw error
  return rowToAffiliate(data as Row)
}

export async function patchAffiliate(id: string, changes: Partial<Affiliate>): Promise<void> {
  const { error } = await supabase.from('affiliates').update(affiliateToRow(changes)).eq('id', id)
  if (error) throw error
}
