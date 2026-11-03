// PQRS: Peticiones, Quejas, Reclamos y Sugerencias.
// Reglas puras (sin red) compartidas por la web pública, el portal del afiliado y
// el módulo de la directiva. El plazo y el consecutivo los fija la base de datos
// (supabase/saas_stage29_pqrs.sql); aquí solo se calcula cuánto falta.

export type PqrsTipo = 'peticion' | 'queja' | 'reclamo' | 'sugerencia'
export type PqrsEstado = 'radicada' | 'en_tramite' | 'respondida' | 'archivada'
export type PqrsCanal = 'web' | 'portal' | 'presencial' | 'correo' | 'telefono' | 'whatsapp'

// Ley 1755 de 2015, art. 14: regla general de 15 días hábiles.
export const PLAZO_DIAS_HABILES = 15
// Desde cuántos días hábiles restantes se considera "por vencer".
export const UMBRAL_POR_VENCER = 3

export const TIPOS: Array<{ value: PqrsTipo; label: string; ayuda: string }> = [
  { value: 'peticion', label: 'Petición', ayuda: 'Solicitas información, un documento o una actuación del sindicato.' },
  { value: 'queja', label: 'Queja', ayuda: 'Inconformidad con la conducta de un directivo, afiliado o integrante del sindicato.' },
  { value: 'reclamo', label: 'Reclamo', ayuda: 'Inconformidad con un servicio o trámite que no se prestó o se prestó mal.' },
  { value: 'sugerencia', label: 'Sugerencia', ayuda: 'Una propuesta para mejorar el sindicato.' },
]

export const TIPO_LABEL: Record<PqrsTipo, string> = { peticion: 'Petición', queja: 'Queja', reclamo: 'Reclamo', sugerencia: 'Sugerencia' }
export const ESTADO_LABEL: Record<PqrsEstado, string> = { radicada: 'Radicada', en_tramite: 'En trámite', respondida: 'Respondida', archivada: 'Archivada' }
export const CANAL_LABEL: Record<PqrsCanal, string> = {
  web: 'Página web', portal: 'Portal del afiliado', presencial: 'Presencial', correo: 'Correo', telefono: 'Teléfono', whatsapp: 'WhatsApp',
}
// Canales que la directiva puede registrar a mano (los demás entran solos).
export const CANALES_INTERNOS: PqrsCanal[] = ['presencial', 'correo', 'telefono', 'whatsapp']

export function estaAbierta(estado: PqrsEstado): boolean {
  return estado === 'radicada' || estado === 'en_tramite'
}

// "AAAA-MM-DD" (o ISO completo) → fecha local a medianoche. null si no es válida.
export function aFechaLocal(valor: string | null | undefined): Date | null {
  if (!valor) return null
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(valor)
  if (!m) return null
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
}

function soloFecha(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function esHabil(d: Date): boolean {
  const dia = d.getDay()
  return dia !== 0 && dia !== 6
}

// Días hábiles (lunes a viernes) en el intervalo (desde, hasta].
function habilesEntre(desde: Date, hasta: Date): number {
  let n = 0
  const d = new Date(desde)
  while (d < hasta) {
    d.setDate(d.getDate() + 1)
    if (esHabil(d)) n++
  }
  return n
}

// Días hábiles que faltan para el vencimiento.
//   > 0 → quedan n días hábiles · 0 → vence hoy · < 0 → vencida hace n días hábiles.
export function diasHabilesRestantes(venceAt: string, hoy: Date = new Date()): number | null {
  const vence = aFechaLocal(venceAt)
  if (!vence) return null
  const h = soloFecha(hoy)
  if (vence.getTime() === h.getTime()) return 0
  if (vence > h) return habilesEntre(h, vence)
  return -Math.max(1, habilesEntre(vence, h))
}

export type Semaforo = 'cerrada' | 'vencida' | 'por_vencer' | 'a_tiempo'

export function semaforo(estado: PqrsEstado, venceAt: string | null | undefined, hoy: Date = new Date()): Semaforo {
  if (!estaAbierta(estado)) return 'cerrada'
  const n = venceAt ? diasHabilesRestantes(venceAt, hoy) : null
  if (n === null) return 'a_tiempo'
  if (n < 0) return 'vencida'
  if (n <= UMBRAL_POR_VENCER) return 'por_vencer'
  return 'a_tiempo'
}

export function textoPlazo(n: number | null): string {
  if (n === null) return 'Sin plazo'
  if (n < 0) return `Vencida hace ${-n} ${-n === 1 ? 'día hábil' : 'días hábiles'}`
  if (n === 0) return 'Vence hoy'
  return `${n} ${n === 1 ? 'día hábil' : 'días hábiles'}`
}

// Formatea una fecha ("AAAA-MM-DD") o un instante ISO (con hora, en hora local).
export function fmtFechaPqrs(valor: string | null | undefined): string {
  if (!valor) return '—'
  const d = valor.length > 10 ? new Date(valor) : aFechaLocal(valor)
  if (!d || Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
}
