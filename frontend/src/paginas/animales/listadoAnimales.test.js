import { describe, expect, it } from 'vitest'
import { filtrarYOrdenarAnimales } from './listadoAnimales'

const ORDEN = { campo: 'aniCaravana', direccion: 'asc' }

const ACTIVO = { aniId: 1, aniCaravana: 'CAR-ACTIVO', aptoVenta: false, aniFechaEgreso: null, subGrupoId: null }
const SALIDO = {
  aniId: 2,
  aniCaravana: 'CAR-SALIDO',
  aptoVenta: false,
  aniFechaEgreso: '2026-06-01',
  subGrupoId: null,
}

describe('filtrarYOrdenarAnimales: filtro de estado de salida', () => {
  it('"activos" deja afuera a los animales con salida registrada', () => {
    const resultado = filtrarYOrdenarAnimales([ACTIVO, SALIDO], {
      busqueda: '',
      lote: 'todos',
      estado: 'todos',
      estadoSalida: 'activos',
      orden: ORDEN,
    })

    expect(resultado.map((animal) => animal.aniCaravana)).toEqual(['CAR-ACTIVO'])
  })

  it('"salidos" deja afuera a los animales activos', () => {
    const resultado = filtrarYOrdenarAnimales([ACTIVO, SALIDO], {
      busqueda: '',
      lote: 'todos',
      estado: 'todos',
      estadoSalida: 'salidos',
      orden: ORDEN,
    })

    expect(resultado.map((animal) => animal.aniCaravana)).toEqual(['CAR-SALIDO'])
  })

  it('"todos" muestra tanto los activos como los salidos', () => {
    const resultado = filtrarYOrdenarAnimales([ACTIVO, SALIDO], {
      busqueda: '',
      lote: 'todos',
      estado: 'todos',
      estadoSalida: 'todos',
      orden: ORDEN,
    })

    expect(resultado.map((animal) => animal.aniCaravana)).toEqual(['CAR-ACTIVO', 'CAR-SALIDO'])
  })

  it('el filtro de estado de salida se combina con el de apto/no apto', () => {
    const activoApto = { ...ACTIVO, aniId: 3, aniCaravana: 'CAR-APTO', aptoVenta: true }

    const resultado = filtrarYOrdenarAnimales([ACTIVO, activoApto, SALIDO], {
      busqueda: '',
      lote: 'todos',
      estado: 'aptos',
      estadoSalida: 'activos',
      orden: ORDEN,
    })

    expect(resultado.map((animal) => animal.aniCaravana)).toEqual(['CAR-APTO'])
  })
})
