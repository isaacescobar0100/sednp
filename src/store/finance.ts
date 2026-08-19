// Modelo y datos simulados del módulo Financiero (Tesorería).
// Un movimiento es un ingreso o un egreso del libro contable.

export type MovementKind = 'Ingreso' | 'Egreso'

// Ingresos entran 'Confirmado'. Egresos siguen: Por aprobar → Aprobado → Pagado
// (o Rechazado). La aprobación la hace Presidencia; registrar y pagar, Tesorería.
export type MovementStatus = 'Confirmado' | 'Por aprobar' | 'Aprobado' | 'Pagado' | 'Rechazado'

// Nivel de aprobación de un gasto según su cuantía en SMMLV (Art. 34).
export type NivelGasto = 'tesoreria' | 'junta' | 'jd_asamblea' | 'asamblea'

// Firmas requeridas para todo retiro de fondos (Art. 35): Presidente + Tesorero + Fiscal.
export type Firmas = { presidente?: boolean; tesorero?: boolean; fiscal?: boolean }

export type Movement = {
  id: string
  date: string
  concept: string
  category: string
  kind: MovementKind
  amount: number
  status: MovementStatus
  nivel?: NivelGasto // solo egresos
  firmas?: Firmas // solo egresos
  ordenPago?: string // consecutivo de la orden de pago al egresarse (Art. 26)
  actaAsamblea?: string // acta de refrendación de la Asamblea (gastos 4–10 y >10 SMMLV, Art. 34)
}

export const incomeCategories = ['Recaudo', 'Ingresos varios', 'Reintegros']
// Rubros de gasto = cuentas del presupuesto (alineadas al PUC sindical).
export const expenseCategories = ['Bienestar', 'Formación', 'Defensa', 'Operación']

// Presupuesto anual por rubro (Art. 11f/26): la Junta lo aprueba y se controla
// su ejecución contra los egresos comprometidos.
export type Presupuesto = { category: string; anual: number }

// Consecutivo de la orden de pago del año en curso: OP-2026-001.
export function nextOrdenPago(movements: Movement[]): string {
  const year = 2026
  const nums = movements
    .map((m) => /^OP-(\d{4})-(\d+)$/.exec(m.ordenPago || ''))
    .filter((x): x is RegExpExecArray => x !== null && Number(x[1]) === year)
    .map((x) => Number(x[2]))
  const next = (nums.length ? Math.max(...nums) : 0) + 1
  return `OP-${year}-${String(next).padStart(3, '0')}`
}

// Ejecución presupuestal por rubro: comprometido = egresos Aprobado o Pagado.
export function ejecucionPorRubro(movements: Movement[], presupuestos: Presupuesto[]): Array<{ category: string; anual: number; ejecutado: number; pct: number }> {
  return expenseCategories.map((category) => {
    const anual = presupuestos.find((p) => p.category === category)?.anual ?? 0
    const ejecutado = movements
      .filter((m) => m.kind === 'Egreso' && m.category === category && (m.status === 'Aprobado' || m.status === 'Pagado'))
      .reduce((s, m) => s + m.amount, 0)
    const pct = anual > 0 ? Math.round((ejecutado / anual) * 100) : 0
    return { category, anual, ejecutado, pct }
  })
}

// Presupuesto inicial en cero (se define en Parámetros).
export function seedPresupuestos(): Presupuesto[] {
  return expenseCategories.map((category) => ({ category, anual: 0 }))
}

// SMMLV por defecto (parámetro configurable — se actualiza cada enero).
export const DEFAULT_SMMLV = 1_423_500

export const nivelLabel: Record<NivelGasto, string> = {
  tesoreria: 'Caja menor · Tesorería (≤ 1 SMMLV)',
  junta: 'Junta Directiva (1–4 SMMLV)',
  jd_asamblea: 'Junta + Asamblea (4–10 SMMLV)',
  asamblea: 'Asamblea 2/3 (> 10 SMMLV)',
}

// Determina el nivel de aprobación de un gasto según su monto (Art. 34).
export function nivelGasto(amount: number, smmlv: number): NivelGasto {
  if (smmlv <= 0) return 'junta'
  const r = amount / smmlv
  if (r <= 1) return 'tesoreria'
  if (r <= 4) return 'junta'
  if (r <= 10) return 'jd_asamblea'
  return 'asamblea'
}

// Los niveles 4–10 y >10 SMMLV requieren refrendación de la Asamblea (acta).
export function requiereActaAsamblea(nivel?: NivelGasto): boolean {
  return nivel === 'jd_asamblea' || nivel === 'asamblea'
}

// Total ya comprometido (aprobado o pagado) de un rubro, para control de saldo.
export function ejecutadoRubro(movements: Movement[], category: string): number {
  return movements
    .filter((m) => m.kind === 'Egreso' && m.category === category && (m.status === 'Aprobado' || m.status === 'Pagado'))
    .reduce((s, m) => s + m.amount, 0)
}

export function firmasCount(f?: Firmas): number {
  if (!f) return 0
  return (f.presidente ? 1 : 0) + (f.tesorero ? 1 : 0) + (f.fiscal ? 1 : 0)
}

export type FirmaKey = 'presidente' | 'tesorero' | 'fiscal'
export const firmaLabel: Record<FirmaKey, string> = { presidente: 'Presidente', tesorero: 'Tesorero', fiscal: 'Fiscal' }

export function formatCop(value: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(value)
}

// Versión compacta en millones para tarjetas: $14,2 M
export function formatCopShort(value: number): string {
  const millions = value / 1_000_000
  return `$${millions.toLocaleString('es-CO', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} M`
}

export function todayLabel(): string {
  return new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }).replace('.', '')
}

const MONTHS_LOWER = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

// Fecha de hoy en formato ISO (YYYY-MM-DD), para el valor por defecto del input.
export function todayISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Convierte 'YYYY-MM-DD' del input a la etiqueta '24 jul 2026'.
export function isoToLabel(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!m) return todayLabel()
  return `${m[3]} ${MONTHS_LOWER[Number(m[2]) - 1] ?? '---'} ${m[1]}`
}

const MONTH_INDEX: Record<string, number> = {
  ene: 0, feb: 1, mar: 2, abr: 3, may: 4, jun: 5, jul: 6, ago: 7, sep: 8, oct: 9, nov: 10, dic: 11,
}

// Agrega movimientos por mes (ingresos confirmados vs egresos pagados) en
// millones COP, ordenados cronológicamente. Vacío si no hay movimientos.
export function monthlyFlow(movements: Movement[]): Array<{ month: string; income: number; expense: number }> {
  const map = new Map<string, { month: string; income: number; expense: number; sort: number }>()
  for (const m of movements) {
    const parts = m.date.split(' ')
    if (parts.length < 3) continue
    const abbr = parts[1].slice(0, 3).toLowerCase()
    const idx = MONTH_INDEX[abbr]
    const year = Number(parts[2])
    if (idx === undefined || Number.isNaN(year)) continue
    const key = `${abbr}-${year}`
    const label = abbr.charAt(0).toUpperCase() + abbr.slice(1)
    const cur = map.get(key) ?? { month: label, income: 0, expense: 0, sort: year * 12 + idx }
    if (m.kind === 'Ingreso' && m.status === 'Confirmado') cur.income += m.amount / 1_000_000
    if (m.kind === 'Egreso' && m.status === 'Pagado') cur.expense += m.amount / 1_000_000
    map.set(key, cur)
  }
  return [...map.values()]
    .sort((a, b) => a.sort - b.sort)
    .map(({ month, income, expense }) => ({ month, income: +income.toFixed(2), expense: +expense.toFixed(2) }))
}

// Egresos comprometidos (aprobados o pagados) por categoría, en millones COP.
export function expensesByCategory(movements: Movement[]): Array<{ category: string; value: number }> {
  return expenseCategories.map((category) => ({
    category,
    value: +(
      movements
        .filter((m) => m.kind === 'Egreso' && m.category === category && (m.status === 'Aprobado' || m.status === 'Pagado'))
        .reduce((acc, m) => acc + m.amount, 0) / 1_000_000
    ).toFixed(2),
  }))
}

// Libro contable VACÍO para pruebas reales.
export function seedMovements(): Movement[] {
  return []
}

// Movimientos de ejemplo (sin uso mientras se prueba con datos reales).
export function sampleMovements(): Movement[] {
  const rows: Array<Omit<Movement, 'id'>> = [
    { date: '30 abr 2026', concept: 'Aportes sindicales — nómina abril', category: 'Recaudo', kind: 'Ingreso', amount: 14_200_000, status: 'Confirmado' },
    { date: '30 abr 2026', concept: 'Rendimientos financieros', category: 'Ingresos varios', kind: 'Ingreso', amount: 180_000, status: 'Confirmado' },
    { date: '28 abr 2026', concept: 'Taller de bienestar y salud mental', category: 'Bienestar', kind: 'Egreso', amount: 1_850_000, status: 'Pagado' },
    { date: '26 abr 2026', concept: 'Papelería y suministros de oficina', category: 'Operación', kind: 'Egreso', amount: 320_000, status: 'Por aprobar' },
    { date: '25 abr 2026', concept: 'Apoyo evento de formación sindical', category: 'Formación', kind: 'Egreso', amount: 1_200_000, status: 'Por aprobar' },
    { date: '24 abr 2026', concept: 'Servicios de auditoría externa', category: 'Operación', kind: 'Egreso', amount: 980_000, status: 'Pagado' },
    { date: '22 abr 2026', concept: 'Asesoría jurídica laboral', category: 'Defensa', kind: 'Egreso', amount: 2_400_000, status: 'Aprobado' },
    { date: '18 abr 2026', concept: 'Reintegro fondo solidario', category: 'Reintegros', kind: 'Ingreso', amount: 420_000, status: 'Confirmado' },
    { date: '15 abr 2026', concept: 'Arriendo sede sindical', category: 'Operación', kind: 'Egreso', amount: 1_600_000, status: 'Pagado' },
    { date: '12 abr 2026', concept: 'Refrigerios asamblea general', category: 'Bienestar', kind: 'Egreso', amount: 540_000, status: 'Rechazado' },
    { date: '31 mar 2026', concept: 'Aportes sindicales — nómina marzo', category: 'Recaudo', kind: 'Ingreso', amount: 13_600_000, status: 'Confirmado' },
  ]
  return rows.map((row, i) => ({ ...row, id: `mov-seed-${i}` }))
}
