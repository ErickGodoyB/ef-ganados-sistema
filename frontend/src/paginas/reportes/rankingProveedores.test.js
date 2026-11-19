import { describe, expect, it } from 'vitest'
import {
  esFilaSinProveedor,
  mayorGmdPromedio,
  porcentajeDeBarra,
  posicionEnRanking,
  proveedorConMejorRendimiento,
} from './rankingProveedores'

const FILAS = [
  { proveedorId: 5, proveedorNombre: 'Beto Beta', gmdPromedio: 3.5 },
  { proveedorId: 4, proveedorNombre: 'Ana Alfa', gmdPromedio: 2.5 },
  { proveedorId: 6, proveedorNombre: 'Carla Cero', gmdPromedio: null },
  { proveedorId: null, proveedorNombre: 'Sin proveedor', gmdPromedio: 2.0 },
]

describe('esFilaSinProveedor', () => {
  it('solo la fila con proveedorId null es "Sin proveedor"', () => {
    expect(FILAS.map(esFilaSinProveedor)).toEqual([false, false, false, true])
  })
})

describe('mayorGmdPromedio', () => {
  it('es el mayor GMD promedio entre las filas con dato', () => {
    expect(mayorGmdPromedio(FILAS)).toBe(3.5)
  })

  it('es 0 si ninguna fila tiene dato o si todas son negativas', () => {
    expect(mayorGmdPromedio([])).toBe(0)
    expect(mayorGmdPromedio([{ gmdPromedio: null }])).toBe(0)
    expect(mayorGmdPromedio([{ gmdPromedio: -0.4 }, { gmdPromedio: -1 }])).toBe(0)
  })
})

describe('porcentajeDeBarra', () => {
  it('es proporcional al mayor valor', () => {
    expect(porcentajeDeBarra(3.5, 3.5)).toBe(100)
    expect(porcentajeDeBarra(1.75, 3.5)).toBe(50)
  })

  it('sin dato, con valor negativo o cero, o sin máximo, la barra queda en 0', () => {
    expect(porcentajeDeBarra(null, 3.5)).toBe(0)
    expect(porcentajeDeBarra(-1, 3.5)).toBe(0)
    expect(porcentajeDeBarra(0, 3.5)).toBe(0)
    expect(porcentajeDeBarra(2, 0)).toBe(0)
  })
})

describe('proveedorConMejorRendimiento', () => {
  it('es el primero del ranking si es un proveedor con dato', () => {
    expect(proveedorConMejorRendimiento(FILAS)).toBe(5)
  })

  it('nadie lo lleva si el primero no tiene dato o si es "Sin proveedor"', () => {
    expect(proveedorConMejorRendimiento([{ proveedorId: 6, gmdPromedio: null }])).toBeUndefined()
    expect(proveedorConMejorRendimiento([{ proveedorId: null, gmdPromedio: 2 }])).toBeUndefined()
    expect(proveedorConMejorRendimiento([])).toBeUndefined()
  })
})

describe('posicionEnRanking', () => {
  it('numera a los proveedores y deja sin posición a "Sin proveedor"', () => {
    expect(FILAS.map((_, indice) => posicionEnRanking(FILAS, indice))).toEqual([1, 2, 3, null])
  })
})
