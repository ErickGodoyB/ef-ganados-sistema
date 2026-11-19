import { describe, expect, it } from 'vitest'
import { filaDestacada, mejorProveedor } from './rankingInicio'

describe('filaDestacada', () => {
  const FILAS = [
    { nombre: 'A', pesoPromedio: 300, gmdPromedio: 1.5 },
    { nombre: 'B', pesoPromedio: 450, gmdPromedio: 1.5 },
    { nombre: 'C', pesoPromedio: null, gmdPromedio: null },
  ]

  it('devuelve la fila con el mayor valor del campo', () => {
    expect(filaDestacada(FILAS, 'pesoPromedio').nombre).toBe('B')
  })

  it('con empate en el máximo no hay destacado', () => {
    expect(filaDestacada(FILAS, 'gmdPromedio')).toBeNull()
  })

  it('sin datos no hay destacado', () => {
    expect(filaDestacada([], 'pesoPromedio')).toBeNull()
    expect(filaDestacada([{ gmdPromedio: null }], 'gmdPromedio')).toBeNull()
  })

  it('una sola fila con dato es el destacado', () => {
    expect(filaDestacada([{ nombre: 'X', gmdPromedio: -0.2 }, { gmdPromedio: null }], 'gmdPromedio').nombre).toBe('X')
  })

  it('un empate entre valores menores no impide destacar al máximo único', () => {
    const filas = [{ nombre: 'A', gmdPromedio: 1 }, { nombre: 'B', gmdPromedio: 1 }, { nombre: 'C', gmdPromedio: 2 }]
    expect(filaDestacada(filas, 'gmdPromedio').nombre).toBe('C')
  })
})

describe('mejorProveedor', () => {
  it('es la primera fila con proveedor y con GMD promedio', () => {
    const filas = [
      { proveedorId: 5, proveedorNombre: 'Sin datos', gmdPromedio: null },
      { proveedorId: 4, proveedorNombre: 'Ana', gmdPromedio: 2 },
      { proveedorId: 6, proveedorNombre: 'Beto', gmdPromedio: 1 },
    ]

    expect(mejorProveedor(filas).proveedorNombre).toBe('Ana')
  })

  it('ignora la fila "Sin proveedor" aunque tenga GMD', () => {
    expect(mejorProveedor([{ proveedorId: null, gmdPromedio: 3 }])).toBeNull()
  })

  it('sin filas o sin datos devuelve null', () => {
    expect(mejorProveedor([])).toBeNull()
    expect(mejorProveedor([{ proveedorId: 1, gmdPromedio: null }])).toBeNull()
  })
})
