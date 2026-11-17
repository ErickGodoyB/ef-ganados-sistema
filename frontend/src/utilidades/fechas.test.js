import { describe, expect, it } from 'vitest'
import {
  calcularAtajoIntervalo,
  diasEntreFechas,
  fechaHoyIso,
  primerDiaDelMesIso,
  rangoDeFechasEsValido,
  sumarDiasIso,
  textoDiasTranscurridos,
} from './fechas'

describe('diasEntreFechas', () => {
  it('cuenta los días entre dos fechas', () => {
    expect(diasEntreFechas('2026-10-30', '2026-11-11')).toBe(12)
  })

  it('es 0 para el mismo día', () => {
    expect(diasEntreFechas('2026-10-30', '2026-10-30')).toBe(0)
  })

  it('cruza fin de mes y de año', () => {
    expect(diasEntreFechas('2026-12-25', '2027-01-05')).toBe(11)
  })

  it('cuenta bien el 29 de febrero de un año bisiesto', () => {
    expect(diasEntreFechas('2028-02-28', '2028-03-01')).toBe(2)
    expect(diasEntreFechas('2027-02-28', '2027-03-01')).toBe(1)
  })

  it('no se corre por cambios de horario de verano (siempre días enteros)', () => {
    expect(diasEntreFechas('2026-03-01', '2026-04-01')).toBe(31)
    expect(diasEntreFechas('2026-10-01', '2026-11-01')).toBe(31)
  })

  it('es negativo si la segunda fecha es anterior', () => {
    expect(diasEntreFechas('2026-11-11', '2026-10-30')).toBe(-12)
  })

  it('devuelve null si falta una fecha o no es válida', () => {
    expect(diasEntreFechas(null, '2026-10-30')).toBeNull()
    expect(diasEntreFechas('2026-10-30', undefined)).toBeNull()
    expect(diasEntreFechas('', '2026-10-30')).toBeNull()
    expect(diasEntreFechas('30/10/2026', '2026-11-11')).toBeNull()
  })
})

describe('textoDiasTranscurridos', () => {
  it('usa el plural a partir de 2 días', () => {
    expect(textoDiasTranscurridos('2026-10-30', '2026-11-11')).toBe('hace 12 días')
  })

  it('usa el singular con 1 día', () => {
    expect(textoDiasTranscurridos('2026-10-30', '2026-10-31')).toBe('hace 1 día')
  })

  it('dice "mismo día" con 0 días', () => {
    expect(textoDiasTranscurridos('2026-10-30', '2026-10-30')).toBe('mismo día')
  })

  it('devuelve vacío si falta una fecha o la anterior es posterior', () => {
    expect(textoDiasTranscurridos(null, '2026-10-30')).toBe('')
    expect(textoDiasTranscurridos('2026-10-30', null)).toBe('')
    expect(textoDiasTranscurridos('2026-11-11', '2026-10-30')).toBe('')
  })
})

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
