// Modelo y datos simulados del módulo Gobernanza: sesiones/actas y votaciones.

export type SessionStatus = 'Programada' | 'Realizada' | 'Cancelada'

export type GovSession = {
  id: string
  day: string // '08'
  month: string // 'MAY'
  title: string
  detail: string // '9:00 a. m. · Sala 4B'
  organ: string
  status: SessionStatus
  minutes?: string // resumen del acta, cuando está Realizada
  asistentes?: number // asistentes registrados (para verificar quórum de Asamblea)
  quorum?: boolean // si se alcanzó el quórum reglamentario
}

// Tipo de acto según el órgano (Art. 12/59): la Asamblea expide Acuerdos; la
// Junta Directiva, Resoluciones; los comités levantan Actas.
export function actoLabel(organ: string): 'Acuerdo' | 'Resolución' | 'Acta' {
  if (organ === 'Asamblea') return 'Acuerdo'
  if (organ === 'Junta Directiva') return 'Resolución'
  return 'Acta'
}

// Quórum reglamentario para deliberar: la mitad más uno (Art. 10).
export function quorumMinimo(activos: number): number {
  return Math.floor(activos / 2) + 1
}

// Si los afiliados superan 100, la Asamblea se realiza por Delegados y el
// quórum se calcula sobre el número de delegados, no sobre el total.
export const UMBRAL_DELEGADOS = 100

export type VoteStatus = 'En curso' | 'Cerrada'

export type Ballot = {
  id: string
  title: string
  closesAt: string
  favor: number
  contra: number
  abstencion: number
  status: VoteStatus
  outcome?: 'Aprobada' | 'Rechazada'
  votedBy?: string[] // ids de afiliados que ya votaron (portal del afiliado)
  secreta?: boolean // votación secreta (Art. 12b): no se revela el sentido individual
}

const MONTHS = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC']

// Convierte 'YYYY-MM-DD' (input date) en { day: '08', month: 'MAY' }.
export function dayMonthFromISO(iso: string): { day: string; month: string } {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!match) return { day: '--', month: '---' }
  const monthIndex = Number(match[2]) - 1
  return { day: match[3], month: MONTHS[monthIndex] ?? '---' }
}

// Lugares frecuentes de sesión (selector, para evitar texto libre).
export const meetingPlaces = ['Sala 4B', 'Sala 3A', 'Auditorio DNP', 'Sala de medios', 'Laboratorio de proyectos', 'Virtual']

const MONTHS_FULL = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

// Convierte 'YYYY-MM-DD' en fecha larga: '30 de abril'.
export function longDateLabel(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!m) return ''
  return `${Number(m[3])} de ${MONTHS_FULL[Number(m[2]) - 1] ?? ''}`
}

// Convierte la hora 'HH:MM' (input time) al formato '9:00 a. m.'.
export function formatTime(hhmm: string): string {
  const m = /^(\d{2}):(\d{2})$/.exec(hhmm)
  if (!m) return ''
  let hour = Number(m[1])
  const ampm = hour < 12 ? 'a. m.' : 'p. m.'
  hour = hour % 12
  if (hour === 0) hour = 12
  return `${hour}:${m[2]} ${ampm}`
}

// Sesiones VACÍO para pruebas reales.
export function seedSessions(): GovSession[] {
  return []
}

// Sesiones de ejemplo (sin uso mientras se prueba con datos reales).
export function sampleSessions(): GovSession[] {
  return [
    { id: 'ses-seed-0', day: '08', month: 'MAY', title: 'Junta Directiva Ordinaria', detail: '9:00 a. m. · Sala 4B', organ: 'Junta Directiva', status: 'Programada' },
    { id: 'ses-seed-1', day: '15', month: 'MAY', title: 'Comité de Bienestar', detail: '2:00 p. m. · Virtual', organ: 'Comité', status: 'Programada' },
    { id: 'ses-seed-2', day: '30', month: 'MAY', title: 'Asamblea extraordinaria', detail: '8:30 a. m. · Auditorio DNP', organ: 'Asamblea', status: 'Programada' },
    { id: 'ses-seed-3', day: '24', month: 'ABR', title: 'Sesión de Junta Directiva No. 08', detail: 'Sala 4B', organ: 'Junta Directiva', status: 'Realizada', minutes: 'Aprobación de plan de bienestar, seguimiento al recaudo y designación de comités.' },
  ]
}

// Votaciones VACÍO para pruebas reales.
export function seedBallots(): Ballot[] {
  return []
}

// Votación de ejemplo (sin uso mientras se prueba con datos reales).
export function sampleBallots(): Ballot[] {
  return [
    { id: 'vot-seed-0', title: 'Aprobación del plan de formación 2026', closesAt: '30 de abril · 5:00 p. m.', favor: 119, contra: 21, abstencion: 12, status: 'En curso' },
  ]
}

export function totalVotes(b: Ballot): number {
  return b.favor + b.contra + b.abstencion
}

export function votePct(value: number, total: number): number {
  return total === 0 ? 0 : Math.round((value / total) * 100)
}
