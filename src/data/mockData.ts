export const monthlyRevenue = [
  { month: 'May', value: 11.8 },
  { month: 'Jun', value: 12.1 },
  { month: 'Jul', value: 12.4 },
  { month: 'Ago', value: 11.9 },
  { month: 'Sep', value: 12.7 },
  { month: 'Oct', value: 13.1 },
  { month: 'Nov', value: 13.4 },
  { month: 'Dic', value: 12.6 },
  { month: 'Ene', value: 13.2 },
  { month: 'Feb', value: 13.7 },
  { month: 'Mar', value: 14.0 },
  { month: 'Abr', value: 14.2 },
]

export const affiliateDistribution = [
  { name: 'LNR', value: 124, color: '#0F1B3D' },
  { name: 'Carrera administrativa', value: 146, color: '#C9973B' },
  { name: 'Provisional', value: 42, color: '#B23A3A' },
]

export const budgetExecution = [
  { category: 'Bienestar', value: 78 },
  { category: 'Formación', value: 64 },
  { category: 'Defensa', value: 72 },
  { category: 'Operación', value: 58 },
]

export const cashFlow = [
  { month: 'Ene', income: 12.4, expense: 7.9 },
  { month: 'Feb', income: 12.8, expense: 8.2 },
  { month: 'Mar', income: 13.6, expense: 8.7 },
  { month: 'Abr', income: 14.2, expense: 9.1 },
  { month: 'May', income: 13.9, expense: 8.5 },
  { month: 'Jun', income: 14.5, expense: 9.4 },
]

export const membershipTrend = [
  { month: 'May', total: 294 },
  { month: 'Jun', total: 297 },
  { month: 'Jul', total: 300 },
  { month: 'Ago', total: 302 },
  { month: 'Sep', total: 305 },
  { month: 'Oct', total: 306 },
  { month: 'Nov', total: 308 },
  { month: 'Dic', total: 309 },
  { month: 'Ene', total: 310 },
  { month: 'Feb', total: 311 },
  { month: 'Mar', total: 312 },
  { month: 'Abr', total: 312 },
]

export const affiliates = [
  { name: 'María Fernanda Rojas', id: '52.184.936', role: 'Profesional especializado', type: 'Carrera Administrativa', status: 'Activo' },
  { name: 'Carlos Andrés Pardo', id: '79.582.411', role: 'Asesor', type: 'LNR', status: 'Activo' },
  { name: 'Diana Marcela Ortiz', id: '1.026.443.218', role: 'Profesional universitario', type: 'Provisional', status: 'Suspendido' },
  { name: 'Jorge Iván Salcedo', id: '80.315.192', role: 'Gestor', type: 'Carrera Administrativa', status: 'Activo' },
  { name: 'Ana Sofía Méndez', id: '52.671.036', role: 'Contratista', type: 'LNR', status: 'Retirado' },
]

export const accountingEntries = [
  { date: '30 abr 2026', concept: 'Aportes sindicales — nómina abril', category: 'Recaudo', amount: 14200000, type: 'Ingreso' },
  { date: '28 abr 2026', concept: 'Taller de bienestar y salud mental', category: 'Bienestar', amount: 1850000, type: 'Egreso' },
  { date: '24 abr 2026', concept: 'Servicios de auditoría externa', category: 'Operación', amount: 980000, type: 'Egreso' },
  { date: '18 abr 2026', concept: 'Reintegro fondo solidario', category: 'Ingresos varios', amount: 420000, type: 'Ingreso' },
]

export const documents = [
  { title: 'Acta Asamblea General Ordinaria 2026', type: 'Acta', date: '12 abr 2026', code: 'ACT-AGO-2026-01', pages: 14 },
  { title: 'Resolución 004 — Plan anual de bienestar', type: 'Resolución', date: '28 mar 2026', code: 'RES-004-2026', pages: 5 },
  { title: 'Informe financiero primer trimestre', type: 'Informe', date: '15 abr 2026', code: 'INF-FIN-2026-01', pages: 11 },
  { title: 'Reglamento interno de trabajo sindical', type: 'Reglamento', date: '03 feb 2026', code: 'REG-INT-2026', pages: 18 },
]

export function formatCop(value: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(value)
}
