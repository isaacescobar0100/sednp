import { describe, it, expect } from 'vitest'
import { quorumMinimo, votePct } from './governance'

describe('quorumMinimo (mayoría simple: mitad + 1)', () => {
  it('calcula el mínimo para varios tamaños', () => {
    expect(quorumMinimo(0)).toBe(1)
    expect(quorumMinimo(10)).toBe(6)
    expect(quorumMinimo(11)).toBe(6)
    expect(quorumMinimo(100)).toBe(51)
  })
})

describe('votePct (porcentaje de votos, sin dividir por cero)', () => {
  it('total 0 → 0 (no NaN)', () => {
    expect(votePct(0, 0)).toBe(0)
    expect(votePct(5, 0)).toBe(0)
  })
  it('calcula y redondea', () => {
    expect(votePct(5, 10)).toBe(50)
    expect(votePct(1, 3)).toBe(33)
  })
})
