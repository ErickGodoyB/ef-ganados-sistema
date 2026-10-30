import { describe, expect, it } from 'vitest'
import { calcularAtajoIntervalo, fechaHoyIso, primerDiaDelMesIso, rangoDeFechasEsValido, sumarDiasIso } from './fechas'

describe('rangoDeFechasEsValido', () => {
  it('es válido si falta "desde"', () => {
    expect(rangoDeFechasEsValido('', '2026-10-29')).toBe(true)
  })

  it('es válido si falta "hasta"', () => {
    expect(rangoDeFechasEsValido('2026-10-01', '')).toBe(true)
  })

  it('es válido si ambos faltan', () => {
    expect(rangoDeFechasEsValido('', '')).toBe(true)
  })

  it('es válido si "desde" es anterior a "hasta"', () => {
    expect(rangoDeFechasEsValido('2026-10-01', '2026-10-29')).toBe(true)
  })

  it('es válido si "desde" es igual a "hasta"', () => {
    expect(rangoDeFechasEsValido('2026-10-29', '2026-10-29')).toBe(true)
  })

  it('es inválido si "desde" es posterior a "hasta"', () => {
    expect(rangoDeFechasEsValido('2026-10-29', '2026-10-01')).toBe(false)
  })
})

describe('fechaHoyIso', () => {
  it('formatea una fecha dada como aaaa-mm-dd', () => {
    expect(fechaHoyIso(new Date(2026, 9, 29))).toBe('2026-10-29')
  })

  it('rellena con cero mes y día de un solo dígito', () => {
    expect(fechaHoyIso(new Date(2026, 0, 5))).toBe('2026-01-05')
  })
})

describe('sumarDiasIso', () => {
  it('suma días dentro del mismo mes', () => {
    expect(sumarDiasIso('2026-10-10', 5)).toBe('2026-10-15')
  })

  it('resta días cruzando a fin de mes anterior', () => {
    expect(sumarDiasIso('2026-10-03', -5)).toBe('2026-09-28')
  })

  it('resta 0 días devuelve la misma fecha', () => {
    expect(sumarDiasIso('2026-10-10', 0)).toBe('2026-10-10')
  })
})

describe('primerDiaDelMesIso', () => {
  it('devuelve el día 01 del mismo mes y año', () => {
    expect(primerDiaDelMesIso('2026-10-29')).toBe('2026-10-01')
  })
})

describe('calcularAtajoIntervalo', () => {
  const hoy = '2026-10-29'

  it('"hoy" devuelve desde y hasta iguales a hoy', () => {
    expect(calcularAtajoIntervalo('hoy', hoy)).toEqual({ desde: '2026-10-29', hasta: '2026-10-29' })
  })

  it('"7dias" devuelve un rango de 7 días inclusive (hoy y los 6 anteriores)', () => {
    expect(calcularAtajoIntervalo('7dias', hoy)).toEqual({ desde: '2026-10-23', hasta: '2026-10-29' })
  })

  it('"30dias" devuelve un rango de 30 días inclusive', () => {
    expect(calcularAtajoIntervalo('30dias', hoy)).toEqual({ desde: '2026-09-30', hasta: '2026-10-29' })
  })

  it('"esteMes" devuelve desde el día 1 del mes actual hasta hoy', () => {
    expect(calcularAtajoIntervalo('esteMes', hoy)).toEqual({ desde: '2026-10-01', hasta: '2026-10-29' })
  })

  it('un atajo desconocido devuelve un rango vacío', () => {
    expect(calcularAtajoIntervalo('otro', hoy)).toEqual({ desde: '', hasta: '' })
  })
})
