import { describe, expect, it } from 'vitest'
import { filaDestacada } from './rankingInicio'

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
