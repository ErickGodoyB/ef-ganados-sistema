import { describe, expect, it } from 'vitest'
import { calcularGmdPromedioSesion, calcularResumenPesos } from './resumenSesion'

describe('calcularResumenPesos', () => {
  it('devuelve todo en 0 con una lista vacía', () => {
    expect(calcularResumenPesos([])).toEqual({ cantidad: 0, total: 0, promedio: 0, minimo: 0, maximo: 0 })
  })

  it('calcula cantidad, total, promedio, mínimo y máximo', () => {
    expect(calcularResumenPesos([200, 220, 300])).toEqual({
      cantidad: 3,
      total: 720,
      promedio: 240,
      minimo: 200,
      maximo: 300,
    })
  })

  it('funciona con un solo peso', () => {
    expect(calcularResumenPesos([150])).toEqual({ cantidad: 1, total: 150, promedio: 150, minimo: 150, maximo: 150 })
  })
})

describe('calcularGmdPromedioSesion', () => {
  it('devuelve gmdPromedio null si ningún animal tiene gmd', () => {
    expect(calcularGmdPromedioSesion([null, null])).toEqual({ gmdPromedio: null, conGmd: 0, total: 2 })
  })

  it('promedia solo los valores no nulos ("n de m")', () => {
    expect(calcularGmdPromedioSesion([1, null, 3])).toEqual({ gmdPromedio: 2, conGmd: 2, total: 3 })
  })

  it('con una lista vacía, devuelve 0 de 0', () => {
    expect(calcularGmdPromedioSesion([])).toEqual({ gmdPromedio: null, conGmd: 0, total: 0 })
  })

  it('cuenta también los gmd en 0 (dos pesajes el mismo día) como válidos', () => {
    expect(calcularGmdPromedioSesion([0, 2])).toEqual({ gmdPromedio: 1, conGmd: 2, total: 2 })
  })
})
