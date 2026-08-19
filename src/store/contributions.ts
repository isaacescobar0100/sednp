// Modelo de aportes sindicales (cuotas por afiliado y periodo).
// Un aporte es la obligación de UN afiliado en UN mes. Al pagarse, alimenta el
// recaudo de Financiero (un solo libro contable, una sola fuente de verdad).

export type AporteStatus = 'Pendiente' | 'Pagado'
export type AporteMethod = 'Portal' | 'Nómina'

export type AporteTipo = 'Ordinaria' | 'Extraordinaria'

export type Aporte = {
  id: string
  affiliateId: string
  period: string // 'YYYY-MM'
  amount: number
  tipo: AporteTipo
  status: AporteStatus
  acta?: string // acta de Asamblea que decretó la extraordinaria (Art. 33)
  anticipada?: boolean // descuento anticipado por vacaciones (Parágrafo Art. 32)
  paidDate?: string
  method?: AporteMethod
}

// Tope de la cuota extraordinaria: 3% de la asignación básica (Art. 33).
export const TOPE_EXTRAORDINARIA = 0.03

// Distribución del recaudo: 80% JDN / 20% subdirectivas (Art. 32).
export const DISTRIBUCION_JDN = 0.8

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

// Meses vencidos de un periodo respecto al mes en curso (para calcular mora).
export function mesesVencidos(period: string): number {
  const [cy, cm] = currentPeriod().split('-').map(Number)
  const [py, pm] = period.split('-').map(Number)
  return (cy - py) * 12 + (cm - pm)
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
