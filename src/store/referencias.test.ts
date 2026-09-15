import { describe, it, expect } from 'vitest'
import { setReferencias, cita } from './referencias'

describe('cita (referencias normativas configurables por sindicato)', () => {
  it('devuelve " (Art. X)" cuando la referencia está configurada', () => {
    setReferencias({ gasto_asamblea: 'Art. 34', cuota: 'Art. 32' })
    expect(cita('gasto_asamblea')).toBe(' (Art. 34)')
    expect(cita('cuota')).toBe(' (Art. 32)')
  })
  it('devuelve "" cuando la referencia no existe', () => {
    setReferencias({ gasto_asamblea: 'Art. 34' })
    expect(cita('inexistente')).toBe('')
  })
  it('un sindicato sin referencias no muestra ninguna cita', () => {
    setReferencias(null)
    expect(cita('gasto_asamblea')).toBe('')
    setReferencias({})
    expect(cita('cuota')).toBe('')
  })
  it('ignora valores en blanco', () => {
    setReferencias({ cuota: '   ' })
    expect(cita('cuota')).toBe('')
  })
})
