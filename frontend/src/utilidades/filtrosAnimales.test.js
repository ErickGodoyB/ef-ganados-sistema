import { describe, expect, it } from 'vitest'
import {
  cumpleFiltroGmd,
  cumpleFiltroRaza,
  hayFiltroGmd,
  obtenerRazasDisponibles,
  parsearLimiteGmd,
} from './filtrosAnimales'

describe('parsearLimiteGmd', () => {
  it('acepta coma o punto, y devuelve null si está vacío o no es un número', () => {
    expect(parsearLimiteGmd('1,5')).toBe(1.5)
    expect(parsearLimiteGmd(' 0.8 ')).toBe(0.8)
    expect(parsearLimiteGmd('-0,2')).toBe(-0.2)
    expect(parsearLimiteGmd('')).toBeNull()
    expect(parsearLimiteGmd(undefined)).toBeNull()
    expect(parsearLimiteGmd('-')).toBeNull()
    expect(parsearLimiteGmd(',')).toBeNull()
    expect(parsearLimiteGmd('abc')).toBeNull()
  })
})

describe('hayFiltroGmd', () => {
  it('es true si al menos un límite es válido, y false si están vacíos o a medio escribir', () => {
    expect(hayFiltroGmd('1', '')).toBe(true)
    expect(hayFiltroGmd('', '2,5')).toBe(true)
    expect(hayFiltroGmd('', '')).toBe(false)
    expect(hayFiltroGmd('-', ',')).toBe(false)
  })
})

describe('cumpleFiltroGmd', () => {
  it('sin límites válidos cumplen todos, incluso los que no tienen GMD', () => {
    expect(cumpleFiltroGmd({ gmd: null }, '', '')).toBe(true)
    expect(cumpleFiltroGmd({ gmd: null }, '-', ',')).toBe(true)
  })

  it('con algún límite válido, los animales sin GMD no cumplen', () => {
    expect(cumpleFiltroGmd({ gmd: null }, '0', '')).toBe(false)
    expect(cumpleFiltroGmd({ gmd: null }, '', '3')).toBe(false)
  })

  it('los límites son inclusivos', () => {
    expect(cumpleFiltroGmd({ gmd: 1 }, '1', '')).toBe(true)
    expect(cumpleFiltroGmd({ gmd: 1.5 }, '', '1,5')).toBe(true)
    expect(cumpleFiltroGmd({ gmd: 0.9 }, '1', '')).toBe(false)
    expect(cumpleFiltroGmd({ gmd: 1.6 }, '', '1,5')).toBe(false)
  })

  it('un límite válido sigue funcionando aunque el otro esté a medio escribir', () => {
    expect(cumpleFiltroGmd({ gmd: 2 }, '1', '-')).toBe(true)
    expect(cumpleFiltroGmd({ gmd: 0.5 }, '1', '-')).toBe(false)
  })

  it('acepta una GMD negativa (pérdida de peso) dentro del rango', () => {
    expect(cumpleFiltroGmd({ gmd: -0.3 }, '-0,5', '0')).toBe(true)
  })
})

describe('cumpleFiltroRaza', () => {
  it('"todas" (o vacío) deja pasar a todos; si no, compara por id de raza', () => {
    expect(cumpleFiltroRaza({ razaId: 2 }, 'todas')).toBe(true)
    expect(cumpleFiltroRaza({ razaId: 2 }, '')).toBe(true)
    expect(cumpleFiltroRaza({ razaId: 2 }, '2')).toBe(true)
    expect(cumpleFiltroRaza({ razaId: 2 }, '1')).toBe(false)
  })
})

describe('obtenerRazasDisponibles', () => {
  it('lista cada raza una vez, ordenada alfabéticamente', () => {
    const animales = [
      { razaId: 2, razaDescripcion: 'Nelore' },
      { razaId: 1, razaDescripcion: 'Brangus' },
      { razaId: 2, razaDescripcion: 'Nelore' },
      { razaId: null, razaDescripcion: null },
    ]
    expect(obtenerRazasDisponibles(animales)).toEqual([
      { valor: '1', etiqueta: 'Brangus' },
      { valor: '2', etiqueta: 'Nelore' },
    ])
  })
})
