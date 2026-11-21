import { describe, expect, it } from 'vitest'
import { mostrarPorProveedor, resumenPorProveedor, SIN_PROVEEDOR } from './porProveedorSesion'

function item(proveedorId, proveedorNombre, peso, pesoAnterior, gmd) {
  return { proveedorId, proveedorNombre, peso, pesoAnterior, gmd }
}

const ITEMS = [
  item(4, 'Pedro Vera', 300, 280, 2),
  item(4, 'Pedro Vera', 320, 300, 3),
  item(5, 'Rosa Núñez', 250, 240, 1),
  item(null, null, 200, null, null),
  item(null, null, 220, 210, 0.5),
]

describe('resumenPorProveedor', () => {
  it('una fila por proveedor, con "Sin proveedor" para los que no tienen', () => {
    const filas = resumenPorProveedor(ITEMS)

    expect(filas.map((fila) => fila.nombre).sort()).toEqual(['Pedro Vera', 'Rosa Núñez', SIN_PROVEEDOR].sort())
    expect(filas.find((fila) => fila.proveedorId === null).nombre).toBe(SIN_PROVEEDOR)
  })

  it('calcula animales, peso promedio, diferencia promedio y GMD promedio', () => {
    const pedro = resumenPorProveedor(ITEMS).find((fila) => fila.nombre === 'Pedro Vera')

    expect(pedro.animales).toBe(2)
    expect(pedro.pesoPromedio).toBe(310)
    expect(pedro.diferenciaPromedio).toBe(20)
    expect(pedro.gmdPromedio).toBe(2.5)
  })

  it('la GMD y la diferencia promedian solo a los que tienen dato', () => {
    const sin = resumenPorProveedor(ITEMS).find((fila) => fila.proveedorId === null)

    expect(sin.animales).toBe(2)
    expect(sin.pesoPromedio).toBe(210)
    // Solo uno de los dos tiene peso anterior (diferencia 10) y GMD (0,5).
    expect(sin.diferenciaPromedio).toBe(10)
    expect(sin.gmdPromedio).toBe(0.5)
  })

  it('un proveedor sin ningún dato queda con diferencia y GMD en null', () => {
    const filas = resumenPorProveedor([item(1, 'A', 100, null, null), item(2, 'B', 100, 90, 1)])

    const a = filas.find((fila) => fila.nombre === 'A')
    expect(a.diferenciaPromedio).toBeNull()
    expect(a.gmdPromedio).toBeNull()
  })

  it('ordena por GMD promedio de mayor a menor, con los sin dato al final', () => {
    const filas = resumenPorProveedor([...ITEMS, item(9, 'Sin Datos SA', 100, null, null)])

    expect(filas.map((fila) => fila.nombre)).toEqual(['Pedro Vera', 'Rosa Núñez', SIN_PROVEEDOR, 'Sin Datos SA'])
  })

  it('el de mayor GMD promedio es "mejor"; solo uno', () => {
    const filas = resumenPorProveedor(ITEMS)

    expect(filas.filter((fila) => fila.mejor).map((fila) => fila.nombre)).toEqual(['Pedro Vera'])
  })

  it('con un empate en el máximo, ninguno es "mejor"', () => {
    const filas = resumenPorProveedor([item(1, 'A', 100, 90, 2), item(2, 'B', 100, 90, 2), item(3, 'C', 100, 90, 1)])

    expect(filas.some((fila) => fila.mejor)).toBe(false)
  })

  it('sin ninguna GMD, nadie es "mejor"', () => {
    expect(resumenPorProveedor([item(1, 'A', 100, null, null), item(2, 'B', 100, null, null)]).some((f) => f.mejor)).toBe(false)
  })

  it('sin animales devuelve una lista vacía', () => {
    expect(resumenPorProveedor([])).toEqual([])
  })
})

describe('mostrarPorProveedor', () => {
  it('solo con 2 o más proveedores (contando "Sin proveedor")', () => {
    expect(mostrarPorProveedor(resumenPorProveedor([]))).toBe(false)
    expect(mostrarPorProveedor(resumenPorProveedor([item(1, 'A', 100, 90, 1), item(1, 'A', 110, 100, 1)]))).toBe(false)
    expect(mostrarPorProveedor(resumenPorProveedor([item(1, 'A', 100, 90, 1), item(null, null, 110, 100, 1)]))).toBe(true)
    expect(mostrarPorProveedor(resumenPorProveedor(ITEMS))).toBe(true)
  })
})
