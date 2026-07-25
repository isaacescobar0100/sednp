// Modelo y datos simulados del módulo Disciplinario.
// Un expediente avanza por etapas; el fallo final lo profiere Presidencia.

export const stages = ['Apertura', 'Investigación', 'Pliego de cargos', 'Decisión'] as const

export type CaseStatus = 'En trámite' | 'Sancionado' | 'Absuelto' | 'Archivado'

export type DisciplineCase = {
  id: string
  code: string
  subject: string
  person: string
  openedDate: string
  stageIndex: number // 0..3, índice en `stages`
  daysLeft: number
  status: CaseStatus
}

// Tono del término procesal según días restantes.
export function termTone(days: number): 'negative' | 'warning' | 'positive' {
  if (days <= 5) return 'negative'
  if (days <= 15) return 'warning'
  return 'positive'
}

export function todayLabel(): string {
  return new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }).replace('.', '')
}

// Expedientes VACÍO para pruebas reales.
export function seedCases(): DisciplineCase[] {
  return []
}

// Expedientes de ejemplo (sin uso mientras se prueba con datos reales).
export function sampleCases(): DisciplineCase[] {
  return [
    { id: 'exp-seed-0', code: 'EXP-2026-014', subject: 'Presunta omisión en trámite administrativo', person: 'Funcionario vinculado', openedDate: '18 abr 2026', stageIndex: 2, daysLeft: 4, status: 'En trámite' },
    { id: 'exp-seed-1', code: 'EXP-2026-011', subject: 'Queja por trato inadecuado', person: 'Funcionario vinculado', openedDate: '09 abr 2026', stageIndex: 1, daysLeft: 12, status: 'En trámite' },
    { id: 'exp-seed-2', code: 'EXP-2026-006', subject: 'Incumplimiento de horario laboral', person: 'Funcionario vinculado', openedDate: '21 mar 2026', stageIndex: 3, daysLeft: 28, status: 'En trámite' },
    { id: 'exp-seed-3', code: 'EXP-2025-021', subject: 'Uso indebido de recursos', person: 'Funcionario vinculado', openedDate: '02 dic 2025', stageIndex: 3, daysLeft: 0, status: 'Absuelto' },
  ]
}

// Siguiente código de expediente a partir de los existentes del año en curso.
export function nextCaseCode(cases: DisciplineCase[]): string {
  const year = 2026
  const nums = cases
    .map((c) => /^EXP-(\d{4})-(\d+)$/.exec(c.code))
    .filter((m): m is RegExpExecArray => m !== null && Number(m[1]) === year)
    .map((m) => Number(m[2]))
  const next = (nums.length ? Math.max(...nums) : 0) + 1
  return `EXP-${year}-${String(next).padStart(3, '0')}`
}
