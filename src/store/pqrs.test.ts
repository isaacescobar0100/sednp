import { describe, it, expect } from 'vitest'
import { diasHabilesRestantes, semaforo, textoPlazo, estaAbierta } from './pqrs'

// Fechas de referencia (noviembre 2026): lun 2, mar 3, vie 6, sáb 7, dom 8, lun 9.
const martes = new Date(2026, 10, 3, 15, 30)
const sabado = new Date(2026, 10, 7, 10, 0)

describe('diasHabilesRestantes', () => {
  it('cuenta solo lunes a viernes hasta el vencimiento', () => {
    expect(diasHabilesRestantes('2026-11-06', martes)).toBe(3) // mié, jue, vie
    expect(diasHabilesRestantes('2026-11-09', martes)).toBe(4) // + lunes (salta el fin de semana)
  })
  it('devuelve 0 el mismo día del vencimiento, sin importar la hora', () => {
    expect(diasHabilesRestantes('2026-11-03', martes)).toBe(0)
  })
  it('es negativo cuando ya venció', () => {
    expect(diasHabilesRestantes('2026-11-02', martes)).toBe(-1)
  })
  it('un vencimiento del viernes ya está vencido el sábado aunque no haya días hábiles de por medio', () => {
    expect(diasHabilesRestantes('2026-11-06', sabado)).toBe(-1)
  })
  it('acepta un instante ISO y devuelve null si la fecha no es válida', () => {
    expect(diasHabilesRestantes('2026-11-06T00:00:00Z', martes)).toBe(3)
    expect(diasHabilesRestantes('no-es-fecha', martes)).toBeNull()
  })
})

describe('semaforo', () => {
  it('las respondidas y archivadas quedan cerradas aunque estén vencidas', () => {
    expect(semaforo('respondida', '2026-01-01', martes)).toBe('cerrada')
    expect(semaforo('archivada', '2026-01-01', martes)).toBe('cerrada')
  })
  it('clasifica las abiertas por días hábiles restantes', () => {
    expect(semaforo('radicada', '2026-11-02', martes)).toBe('vencida')
    expect(semaforo('en_tramite', '2026-11-03', martes)).toBe('por_vencer')
    expect(semaforo('radicada', '2026-11-06', martes)).toBe('por_vencer') // 3 días = umbral
    expect(semaforo('radicada', '2026-11-09', martes)).toBe('a_tiempo')
  })
})

describe('textoPlazo y estaAbierta', () => {
  it('redacta el plazo en singular y plural', () => {
    expect(textoPlazo(1)).toBe('1 día hábil')
    expect(textoPlazo(5)).toBe('5 días hábiles')
    expect(textoPlazo(0)).toBe('Vence hoy')
    expect(textoPlazo(-2)).toBe('Vencida hace 2 días hábiles')
  })
  it('solo radicada y en trámite cuentan como abiertas', () => {
    expect(estaAbierta('radicada')).toBe(true)
    expect(estaAbierta('en_tramite')).toBe(true)
    expect(estaAbierta('respondida')).toBe(false)
  })
})
