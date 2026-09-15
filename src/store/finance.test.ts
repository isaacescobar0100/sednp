import { describe, it, expect } from 'vitest'
import { nivelGasto, requiereActaAsamblea, ejecucionPorRubro, movementsToCsv, type Movement } from './finance'

// Los rangos de gasto por SMMLV definen quién autoriza (Tesorería/Junta/Asamblea).
describe('nivelGasto (rangos de autorización por SMMLV)', () => {
  const smmlv = 1_000_000
  it('≤1 SMMLV → tesorería', () => {
    expect(nivelGasto(500_000, smmlv)).toBe('tesoreria')
    expect(nivelGasto(1_000_000, smmlv)).toBe('tesoreria')
  })
  it('>1 y ≤4 → junta', () => {
    expect(nivelGasto(1_000_001, smmlv)).toBe('junta')
    expect(nivelGasto(4_000_000, smmlv)).toBe('junta')
  })
  it('>4 y ≤10 → junta+asamblea', () => {
    expect(nivelGasto(4_000_001, smmlv)).toBe('jd_asamblea')
    expect(nivelGasto(10_000_000, smmlv)).toBe('jd_asamblea')
  })
  it('>10 → asamblea', () => {
    expect(nivelGasto(10_000_001, smmlv)).toBe('asamblea')
  })
  it('SMMLV inválido (0) no revienta → junta', () => {
    expect(nivelGasto(5_000_000, 0)).toBe('junta')
  })
})

describe('requiereActaAsamblea', () => {
  it('exige acta desde 4 SMMLV en adelante', () => {
    expect(requiereActaAsamblea('tesoreria')).toBe(false)
    expect(requiereActaAsamblea('junta')).toBe(false)
    expect(requiereActaAsamblea('jd_asamblea')).toBe(true)
    expect(requiereActaAsamblea('asamblea')).toBe(true)
  })
})

describe('ejecucionPorRubro (control presupuestal, sin dividir por cero)', () => {
  const movs: Movement[] = [
    { id: '1', date: '2026-01-01', concept: 'x', category: 'Bienestar', kind: 'Egreso', amount: 300_000, status: 'Pagado' },
    { id: '2', date: '2026-01-02', concept: 'y', category: 'Bienestar', kind: 'Egreso', amount: 200_000, status: 'Aprobado' },
  ]
  it('calcula % ejecutado con presupuesto', () => {
    const r = ejecucionPorRubro(movs, [{ category: 'Bienestar', anual: 1_000_000 }])
    const b = r.find((x) => x.category === 'Bienestar')!
    expect(b.ejecutado).toBe(500_000)
    expect(b.pct).toBe(50)
  })
  it('rubro con presupuesto 0 → pct 0 (no NaN/Infinity)', () => {
    const r = ejecucionPorRubro(movs, [{ category: 'Bienestar', anual: 0 }])
    expect(r.find((x) => x.category === 'Bienestar')!.pct).toBe(0)
  })
})

describe('movementsToCsv (SIIGO) usa el "tercero" del sindicato, no un valor fijo', () => {
  const movs: Movement[] = [
    { id: '1', date: '2026-01-01', concept: 'Aporte', category: 'Recaudo', kind: 'Ingreso', amount: 50_000, status: 'Confirmado' },
  ]
  it('inserta el tercero recibido en las filas', () => {
    const csv = movementsToCsv(movs, 'Mi Sindicato')
    expect(csv).toContain('Mi Sindicato')
    expect(csv).not.toContain('SERDNP')
  })
})
