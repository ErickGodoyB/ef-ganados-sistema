import { describe, expect, it } from 'vitest'
import { motivoEsValido } from './anulacion'

describe('motivoEsValido', () => {
  it('rechaza un motivo vacío', () => {
    expect(motivoEsValido('')).toBe(false)
    expect(motivoEsValido('   ')).toBe(false)
  })

  it('rechaza un motivo de menos de 3 caracteres', () => {
    expect(motivoEsValido('ab')).toBe(false)
  })

  it('acepta un motivo de 3 caracteres (límite inclusive)', () => {
    expect(motivoEsValido('abc')).toBe(true)
  })

  it('acepta un motivo típico', () => {
    expect(motivoEsValido('Error de carga')).toBe(true)
  })

  it('rechaza un motivo de más de 255 caracteres', () => {
    expect(motivoEsValido('a'.repeat(256))).toBe(false)
  })

  it('acepta un motivo de exactamente 255 caracteres', () => {
    expect(motivoEsValido('a'.repeat(255))).toBe(true)
  })
})
