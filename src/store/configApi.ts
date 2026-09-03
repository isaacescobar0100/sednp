// Capa de acceso a Supabase para la configuración de Financiero:
// parámetros del sistema, presupuesto por rubro, catálogo PUC y caja menor.
import { supabase } from '../lib/supabase'
import { CajaGasto, Cuenta, CuentaNaturaleza, CuentaTipo, Presupuesto } from './finance'

// ---- Parámetros (fila única id=1) --------------------------------------------
export type Params = {
  porcentajeCuota: number
  smmlv: number
  caucionVence: string
  juntaDesde: string
  cajaFondo: number
}

export async function fetchParams(): Promise<Params | null> {
  const { data, error } = await supabase.from('params').select('*').eq('id', 1).maybeSingle()
  if (error) throw error
  if (!data) return null
  return {
    porcentajeCuota: Number(data.porcentaje_cuota) || 0,
    smmlv: Number(data.smmlv) || 0,
    caucionVence: data.caucion_vence ?? '',
    juntaDesde: data.junta_desde ?? '',
    cajaFondo: Number(data.caja_fondo) || 0,
  }
}

export async function upsertParams(changes: Partial<Params>): Promise<void> {
  const row: Record<string, unknown> = {}
  if (changes.porcentajeCuota !== undefined) row.porcentaje_cuota = changes.porcentajeCuota
  if (changes.smmlv !== undefined) row.smmlv = changes.smmlv
  if (changes.caucionVence !== undefined) row.caucion_vence = changes.caucionVence
  if (changes.juntaDesde !== undefined) row.junta_desde = changes.juntaDesde
  if (changes.cajaFondo !== undefined) row.caja_fondo = changes.cajaFondo
  if (Object.keys(row).length === 0) return
  // La fila de parámetros es única por sindicato (RLS la limita a la del usuario).
  const { error } = await supabase.from('params').update(row).eq('id', 1)
  if (error) throw error
}

// ---- Presupuesto por rubro ---------------------------------------------------
export async function fetchPresupuestos(): Promise<Presupuesto[]> {
  const { data, error } = await supabase.from('presupuestos').select('*')
  if (error) throw error
  return (data as Array<{ category: string; anual: number | string }>).map((p) => ({ category: p.category, anual: Number(p.anual) || 0 }))
}

export async function upsertPresupuesto(category: string, anual: number): Promise<void> {
  // Actualiza el rubro del sindicato actual; si no existe todavía, lo crea.
  const upd = await supabase.from('presupuestos').update({ anual }).eq('category', category).select('category')
  if (upd.error) throw upd.error
  if ((upd.data?.length ?? 0) === 0) {
    const ins = await supabase.from('presupuestos').insert({ category, anual })
    if (ins.error) throw ins.error
  }
}

export async function deletePresupuesto(category: string): Promise<void> {
  const { error } = await supabase.from('presupuestos').delete().eq('category', category)
  if (error) throw error
}

// ---- Catálogo de cuentas (PUC) ----------------------------------------------
type CuentaRow = { codigo: string; nombre: string; tipo: CuentaTipo; naturaleza: CuentaNaturaleza; activa: boolean }

export async function fetchCuentas(): Promise<Cuenta[]> {
  const { data, error } = await supabase.from('cuentas').select('*').order('codigo', { ascending: true })
  if (error) throw error
  return (data as CuentaRow[]).map((c) => ({ codigo: c.codigo, nombre: c.nombre, tipo: c.tipo, naturaleza: c.naturaleza, activa: c.activa }))
}

// Reemplaza el catálogo completo (borra e inserta la lista deseada).
export async function replaceCuentas(list: Cuenta[]): Promise<void> {
  const del = await supabase.from('cuentas').delete().neq('codigo', '')
  if (del.error) throw del.error
  if (list.length > 0) {
    const ins = await supabase.from('cuentas').insert(list)
    if (ins.error) throw ins.error
  }
}

// ---- Caja menor --------------------------------------------------------------
export async function fetchCajaGastos(): Promise<CajaGasto[]> {
  const { data, error } = await supabase.from('caja_gastos').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return (data as Array<{ id: string; date: string; concepto: string; monto: number | string; soporte: string | null }>)
    .map((g) => ({ id: g.id, date: g.date, concepto: g.concepto, monto: Number(g.monto) || 0, soporte: g.soporte ?? '' }))
}

export async function insertCajaGasto(g: CajaGasto): Promise<CajaGasto> {
  const { data, error } = await supabase.from('caja_gastos').insert({ date: g.date, concepto: g.concepto, monto: g.monto, soporte: g.soporte }).select().single()
  if (error) throw error
  const r = data as { id: string; date: string; concepto: string; monto: number | string; soporte: string | null }
  return { id: r.id, date: r.date, concepto: r.concepto, monto: Number(r.monto) || 0, soporte: r.soporte ?? '' }
}

export async function clearCajaGastos(): Promise<void> {
  const { error } = await supabase.from('caja_gastos').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  if (error) throw error
}
