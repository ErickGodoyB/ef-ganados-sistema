import { describe, expect, it } from 'vitest'
import { formatearFecha, formatearFechaCorta, formatearFechaHora, formatearGmd, formatearPeso } from './formato'

describe('formatearPeso', () => {
  it('formatea con una cifra decimal y el sufijo kg', () => {
    expect(formatearPeso(245)).toBe('245,0 kg')
  })
})

describe('formatearGmd', () => {
  it('devuelve "—" si es null', () => {
    expect(formatearGmd(null)).toBe('—')
  })

  it('devuelve "—" si es undefined', () => {
    expect(formatearGmd(undefined)).toBe('—')
  })

  it('formatea con dos cifras decimales y el sufijo kg/día', () => {
    expect(formatearGmd(1)).toBe('1,00 kg/día')
  })

  it('formatea un valor negativo', () => {
    expect(formatearGmd(-0.5)).toBe('-0,50 kg/día')
  })
})

describe('formatearFecha', () => {
  it('convierte aaaa-mm-dd a dd/mm/aaaa', () => {
    expect(formatearFecha('2026-07-26')).toBe('26/07/2026')
  })

  it('devuelve vacío si no hay fecha', () => {
    expect(formatearFecha(null)).toBe('')
    expect(formatearFecha(undefined)).toBe('')
    expect(formatearFecha('')).toBe('')
  })
})

describe('formatearFechaCorta', () => {
  it('convierte aaaa-mm-dd a dd/mm, sin año', () => {
    expect(formatearFechaCorta('2026-07-26')).toBe('26/07')
  })

  it('devuelve vacío si no hay fecha', () => {
    expect(formatearFechaCorta(null)).toBe('')
    expect(formatearFechaCorta('')).toBe('')
  })
})

describe('formatearFechaHora', () => {
  it('formatea fecha y hora, cortando segundos/nanosegundos', () => {
    expect(formatearFechaHora('2026-10-29T14:35:07.123456')).toBe('29/10/2026 14:35')
  })

  it('formatea fecha y hora sin segundos', () => {
    expect(formatearFechaHora('2026-10-29T14:35')).toBe('29/10/2026 14:35')
  })

  it('devuelve solo la fecha si no viene la hora', () => {
    expect(formatearFechaHora('2026-10-29')).toBe('29/10/2026')
  })

  it('devuelve vacío si no hay valor', () => {
    expect(formatearFechaHora(null)).toBe('')
    expect(formatearFechaHora('')).toBe('')
  })
})
