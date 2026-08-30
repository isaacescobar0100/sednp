// Modelo y datos simulados del módulo Comunicaciones.

export type CommStatus = 'Entregado' | 'Programado'

export type Comunicado = {
  id: string
  subject: string
  body: string
  audience: string
  recipients: number
  date: string
  status: CommStatus
}

// Audiencias cuyo número de destinatarios se calcula del padrón real.
export type AudienceKey = 'todos' | 'activos' | 'pendientes'

export const audienceLabel: Record<AudienceKey, string> = {
  todos: 'Todos los afiliados',
  activos: 'Afiliados activos',
  pendientes: 'Afiliados pendientes',
}

export function nowLabel(): string {
  const d = new Date()
  const date = d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }).replace('.', '')
  const time = d.toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit', hour12: true })
  return `${date} · ${time}`
}

// Historial VACÍO para pruebas reales.
export function seedComunicados(): Comunicado[] {
  return []
}

// Comunicados de ejemplo (sin uso mientras se prueba con datos reales).
export function sampleComunicados(): Comunicado[] {
  return [
    { id: 'com-seed-0', subject: 'Convocatoria Asamblea Extraordinaria', body: '', audience: 'Todos los afiliados', recipients: 312, date: '29 abr 2026 · 9:12 a. m.', status: 'Entregado' },
  ]
}
