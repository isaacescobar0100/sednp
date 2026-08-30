// Capa de acceso a Supabase para los catálogos de Parámetros:
// cargos, dependencias, tipos de vinculación y escalas salariales.
// Cada uno se administra como lista completa → se reemplaza al guardar.
import { supabase } from '../lib/supabase'
import { VinculacionType } from './catalogs'
import { Escala } from './payscale'

// ---- Cargos ------------------------------------------------------------------
export async function fetchCargos(): Promise<string[]> {
  const { data, error } = await supabase.from('cargos').select('name').order('name')
  if (error) throw error
  return (data as Array<{ name: string }>).map((r) => r.name)
}
export async function replaceCargos(list: string[]): Promise<void> {
  const del = await supabase.from('cargos').delete().neq('name', '')
  if (del.error) throw del.error
  if (list.length) {
    const ins = await supabase.from('cargos').insert(list.map((name) => ({ name })))
    if (ins.error) throw ins.error
  }
}

// ---- Dependencias ------------------------------------------------------------
export async function fetchDependencias(): Promise<string[]> {
  const { data, error } = await supabase.from('dependencias').select('name').order('name')
  if (error) throw error
  return (data as Array<{ name: string }>).map((r) => r.name)
}
export async function replaceDependencias(list: string[]): Promise<void> {
  const del = await supabase.from('dependencias').delete().neq('name', '')
  if (del.error) throw del.error
  if (list.length) {
    const ins = await supabase.from('dependencias').insert(list.map((name) => ({ name })))
    if (ins.error) throw ins.error
  }
}

// ---- Tipos de vinculación ----------------------------------------------------
export async function fetchVinculaciones(): Promise<VinculacionType[]> {
  const { data, error } = await supabase.from('vinculaciones').select('*')
  if (error) throw error
  return (data as Array<{ id: string; name: string; color: string | null }>).map((r) => ({ id: r.id, name: r.name, color: r.color ?? '' }))
}
export async function replaceVinculaciones(list: VinculacionType[]): Promise<void> {
  const del = await supabase.from('vinculaciones').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  if (del.error) throw del.error
  if (list.length) {
    const ins = await supabase.from('vinculaciones').insert(list.map((v) => ({ name: v.name, color: v.color })))
    if (ins.error) throw ins.error
  }
}

// ---- Escalas salariales ------------------------------------------------------
export async function fetchEscalas(): Promise<Escala[]> {
  const { data, error } = await supabase.from('escalas').select('*')
  if (error) throw error
  return (data as Array<{ id: string; nivel: string; grado: string; asignacion_basica: number | string }>)
    .map((r) => ({ id: r.id, nivel: r.nivel, grado: r.grado, asignacionBasica: Number(r.asignacion_basica) || 0 }))
}
export async function replaceEscalas(list: Escala[]): Promise<void> {
  const del = await supabase.from('escalas').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  if (del.error) throw del.error
  if (list.length) {
    const ins = await supabase.from('escalas').insert(list.map((e) => ({ nivel: e.nivel, grado: e.grado, asignacion_basica: e.asignacionBasica })))
    if (ins.error) throw ins.error
  }
}
