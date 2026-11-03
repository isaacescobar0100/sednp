// PQRS: acceso a datos (Supabase). La radicación pública y la del afiliado van
// por RPCs; la directiva lee y gestiona la tabla directamente (con RLS).
import { supabase } from '../lib/supabase'
import type { Role } from './session'
import type { PqrsCanal, PqrsEstado, PqrsTipo } from './pqrs'

export type Pqrs = {
  id: string
  radicado: string
  tipo: PqrsTipo
  canal: PqrsCanal
  nombre: string
  documento: string
  email: string
  telefono: string
  asunto: string
  descripcion: string
  affiliateId: string | null
  estado: PqrsEstado
  responsable: Role
  respuesta: string
  respondidaAt: string | null
  respondidaPor: string
  venceAt: string | null
  createdAt: string
}

type Row = {
  id: string
  radicado: string
  tipo: PqrsTipo
  canal: PqrsCanal
  nombre: string
  documento: string | null
  email: string | null
  telefono: string | null
  asunto: string
  descripcion: string
  affiliate_id: string | null
  estado: PqrsEstado
  responsable: Role
  respuesta: string | null
  respondida_at: string | null
  respondida_por: string | null
  vence_at: string | null
  created_at: string
}

function rowToPqrs(r: Row): Pqrs {
  return {
    id: r.id,
    radicado: r.radicado,
    tipo: r.tipo,
    canal: r.canal,
    nombre: r.nombre,
    documento: r.documento ?? '',
    email: r.email ?? '',
    telefono: r.telefono ?? '',
    asunto: r.asunto,
    descripcion: r.descripcion,
    affiliateId: r.affiliate_id,
    estado: r.estado,
    responsable: r.responsable,
    respuesta: r.respuesta ?? '',
    respondidaAt: r.respondida_at,
    respondidaPor: r.respondida_por ?? '',
    venceAt: r.vence_at,
    createdAt: r.created_at,
  }
}

const COLUMNAS = 'id, radicado, tipo, canal, nombre, documento, email, telefono, asunto, descripcion, affiliate_id, estado, responsable, respuesta, respondida_at, respondida_por, vence_at, created_at'

// Los errores de las RPCs traen el mensaje del `raise exception` (ya en español).
function mensaje(error: { message?: string } | null, porDefecto: string): string {
  return error?.message?.trim() || porDefecto
}

// --- Directiva -----------------------------------------------------------------
export async function fetchPqrs(): Promise<Pqrs[]> {
  const { data, error } = await supabase.from('pqrs').select(COLUMNAS).order('created_at', { ascending: false })
  if (error) throw error
  return (data as Row[]).map(rowToPqrs)
}

export type RegistroInterno = {
  tipo: PqrsTipo
  canal: PqrsCanal
  nombre: string
  documento: string
  email: string
  telefono: string
  asunto: string
  descripcion: string
}

// PQRS recibida por otro medio (presencial, correo, teléfono, WhatsApp).
// El radicado, el plazo y el estado los asigna la base de datos.
export async function registrarPqrs(p: RegistroInterno): Promise<Pqrs> {
  const { data, error } = await supabase.from('pqrs').insert({
    tipo: p.tipo,
    canal: p.canal,
    nombre: p.nombre.trim(),
    documento: p.documento.trim() || null,
    email: p.email.trim(),
    telefono: p.telefono.trim() || null,
    asunto: p.asunto.trim(),
    descripcion: p.descripcion.trim(),
  }).select(COLUMNAS).single()
  if (error) throw new Error(mensaje(error, 'No se pudo registrar la PQRS.'))
  return rowToPqrs(data as Row)
}

export type CambioPqrs = Partial<{ estado: PqrsEstado; responsable: Role; respuesta: string; tipo: PqrsTipo }>

export async function actualizarPqrs(id: string, cambio: CambioPqrs): Promise<Pqrs> {
  const { data, error } = await supabase.from('pqrs').update(cambio).eq('id', id).select(COLUMNAS).single()
  if (error) throw new Error(mensaje(error, 'No se pudo actualizar la PQRS.'))
  return rowToPqrs(data as Row)
}

// --- Portal del afiliado ----------------------------------------------------------
export async function fetchMisPqrs(userId: string): Promise<Pqrs[]> {
  const { data, error } = await supabase.from('pqrs').select(COLUMNAS).eq('user_id', userId).order('created_at', { ascending: false })
  if (error) throw error
  return (data as Row[]).map(rowToPqrs)
}

export type Radicado = { radicado: string; venceAt: string | null }

export async function radicarPqrsAfiliado(tipo: PqrsTipo, asunto: string, descripcion: string): Promise<Radicado> {
  const { data, error } = await supabase.rpc('radicar_pqrs_afiliado', { p_tipo: tipo, p_asunto: asunto.trim(), p_descripcion: descripcion.trim() })
  if (error) throw new Error(mensaje(error, 'No se pudo radicar la PQRS.'))
  return data as Radicado
}

// --- Página web pública (anónimo) -------------------------------------------------
export type RadicacionPublica = {
  tipo: PqrsTipo
  nombre: string
  documento: string
  email: string
  telefono: string
  asunto: string
  descripcion: string
  aceptaDatos: boolean
}

export async function radicarPqrsPublica(slug: string, p: RadicacionPublica): Promise<Radicado> {
  const { data, error } = await supabase.rpc('radicar_pqrs', {
    p_slug: slug,
    p_tipo: p.tipo,
    p_nombre: p.nombre.trim(),
    p_documento: p.documento.trim(),
    p_email: p.email.trim(),
    p_telefono: p.telefono.trim(),
    p_asunto: p.asunto.trim(),
    p_descripcion: p.descripcion.trim(),
    p_acepta_datos: p.aceptaDatos,
  })
  if (error) throw new Error(mensaje(error, 'No se pudo radicar la PQRS. Intenta de nuevo.'))
  return data as Radicado
}

export type ConsultaPublica = {
  radicado: string
  tipo: PqrsTipo
  asunto: string
  estado: PqrsEstado
  createdAt: string
  venceAt: string | null
  respuesta: string | null
  respondidaAt: string | null
}

// Devuelve null si no hay una PQRS con ese radicado y ese correo.
export async function consultarPqrsPublica(slug: string, radicado: string, email: string): Promise<ConsultaPublica | null> {
  const { data, error } = await supabase.rpc('consultar_pqrs', { p_slug: slug, p_radicado: radicado.trim(), p_email: email.trim() })
  if (error) throw new Error(mensaje(error, 'No se pudo consultar. Intenta de nuevo.'))
  const d = (data || {}) as Partial<ConsultaPublica>
  return d.radicado ? (d as ConsultaPublica) : null
}
