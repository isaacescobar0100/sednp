// Modelo y datos simulados del módulo Comités.

export type Committee = {
  id: string
  name: string
  lead: string // encargado / coordinación (nombre de afiliado)
  members: string[] // integrantes acompañantes (nombres de afiliados)
  next: string
  activity: string
  color: string
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

// Los cinco comités temáticos estatutarios (Art. 27 de los Estatutos).
export function seedCommittees(): Committee[] {
  const names = [
    'Educación y Desarrollo Humano',
    'Promoción y Fomento del Desarrollo Laboral y Profesional',
    'Planeación e Innovación',
    'Divulgación y Relaciones Públicas',
    'Bienestar, Fomento Cultural y de Seguridad y Salud en el Trabajo',
  ]
  return names.map((name, i) => ({
    id: `cmt-est-${i}`,
    name,
    lead: 'Por designar',
    members: [],
    next: 'Por programar',
    activity: 'Comité temático estatutario',
    color: committeeColor(i),
  }))
}

// Comités de ejemplo (sin uso mientras se prueba con datos reales).
export function sampleCommittees(): Committee[] {
  return [
    { id: 'com-seed-0', name: 'Planeación e Innovación', lead: 'Carlos Andrés Pardo', members: ['Diana Marcela Ortiz', 'Jorge Iván Salcedo'], next: '16 may · Laboratorio de proyectos', activity: 'Matriz de iniciativas 2026 actualizada', color: 'bg-night' },
    { id: 'com-seed-1', name: 'Bienestar', lead: 'Diana Marcela Ortiz', members: ['Ana Sofía Méndez'], next: '15 may · Virtual', activity: 'Convocatoria taller de salud mental', color: 'bg-gold' },
  ]
}
