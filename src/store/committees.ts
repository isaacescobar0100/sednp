// Modelo y datos simulados del módulo Comités.

// 'Temático' = comité del Art. 27; 'Estatutario' = órgano de control estatutario
// (Comité de Quejas y Reclamos, Comisión Estatutaria de Reclamos).
export type CommitteeTipo = 'Temático' | 'Estatutario'

export type Committee = {
  id: string
  name: string
  lead: string // encargado / coordinación (nombre de afiliado)
  members: string[] // integrantes acompañantes (nombres de afiliados)
  next: string
  activity: string
  color: string
  tipo?: CommitteeTipo
}

const COLORS = ['bg-night', 'bg-gold', 'bg-brick', 'bg-emerald-600']

export function committeeColor(index: number): string {
  return COLORS[index % COLORS.length]
}

// Total de personas del comité: el encargado (si está definido) + los integrantes.
export function memberCount(c: Committee): number {
  const members = Array.isArray(c.members) ? c.members.length : 0
  return members + (c.lead && c.lead !== 'Por designar' ? 1 : 0)
}

// Los cinco comités temáticos (Art. 27) y los dos órganos estatutarios de
// quejas y reclamos que participan en el procedimiento disciplinario (Art. 43).
export function seedCommittees(): Committee[] {
  const tematicos = [
    'Educación y Desarrollo Humano',
    'Promoción y Fomento del Desarrollo Laboral y Profesional',
    'Planeación e Innovación',
    'Divulgación y Relaciones Públicas',
    'Bienestar, Fomento Cultural y de Seguridad y Salud en el Trabajo',
  ].map((name, i) => ({
    id: `cmt-est-${i}`,
    name,
    lead: 'Por designar',
    members: [] as string[],
    next: 'Por programar',
    activity: 'Comité temático estatutario',
    color: committeeColor(i),
    tipo: 'Temático' as CommitteeTipo,
  }))

  const estatutarios: Committee[] = [
    { id: 'cmt-org-quejas', name: 'Comité de Quejas y Reclamos', lead: 'Por designar', members: [], next: 'Por programar', activity: 'Instruye el procedimiento disciplinario (Art. 43)', color: 'bg-brick', tipo: 'Estatutario' },
    { id: 'cmt-org-reclamos', name: 'Comisión Estatutaria de Reclamos', lead: 'Por designar', members: [], next: 'Por programar', activity: 'Atiende reclamos estatutarios de los afiliados', color: 'bg-night', tipo: 'Estatutario' },
  ]

  return [...tematicos, ...estatutarios]
}

// Comités de ejemplo (sin uso mientras se prueba con datos reales).
export function sampleCommittees(): Committee[] {
  return [
    { id: 'com-seed-0', name: 'Planeación e Innovación', lead: 'Carlos Andrés Pardo', members: ['Diana Marcela Ortiz', 'Jorge Iván Salcedo'], next: '16 may · Laboratorio de proyectos', activity: 'Matriz de iniciativas 2026 actualizada', color: 'bg-night' },
    { id: 'com-seed-1', name: 'Bienestar', lead: 'Diana Marcela Ortiz', members: ['Ana Sofía Méndez'], next: '15 may · Virtual', activity: 'Convocatoria taller de salud mental', color: 'bg-gold' },
  ]
}
