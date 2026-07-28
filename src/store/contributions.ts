// Modelo de aportes sindicales (cuotas por afiliado y periodo).
// Un aporte es la obligación de UN afiliado en UN mes. Al pagarse, alimenta el
// recaudo de Financiero (un solo libro contable, una sola fuente de verdad).

export type AporteStatus = 'Pendiente' | 'Pagado'
export type AporteMethod = 'Portal' | 'Nómina'

export type Aporte = {
  id: string
  affiliateId: string
  period: string // 'YYYY-MM'
  amount: number
  status: AporteStatus
  paidDate?: string
  method?: AporteMethod
}

// Cuota ordinaria = 0,3% de la asignación básica mensual (Art. 32 Estatutos).
// Es el porcentaje el que se parametriza, no un monto fijo.
export const DEFAULT_PORCENTAJE_CUOTA = 0.003

// Valor del aporte de un afiliado = asignación básica × porcentaje.
export function calcularCuota(asignacionBasica: number, porcentaje: number): number {
  return Math.round((asignacionBasica || 0) * porcentaje)
}

const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

export function periodLabel(period: string): string {
  const [year, month] = period.split('-')
  const name = MONTHS[Number(month) - 1] ?? ''
  return `${name.charAt(0).toUpperCase()}${name.slice(1)} ${year}`
}

export function currentPeriod(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

// Últimos n periodos (YYYY-MM), del más reciente al más antiguo.
export function recentPeriods(n: number): string[] {
  const d = new Date()
  let year = d.getFullYear()
  let month = d.getMonth() // 0-based
  const out: string[] = []
  for (let i = 0; i < n; i++) {
    out.push(`${year}-${String(month + 1).padStart(2, '0')}`)
    month -= 1
    if (month < 0) {
      month = 11
      year -= 1
    }
  }
  return out
}
