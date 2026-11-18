import { describe, expect, it } from 'vitest'
import { contarFiltrosActivos, FILTROS_POR_DEFECTO, filtrarYOrdenarAnimales } from './listadoAnimales'

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

const BASE = { busqueda: '', lote: 'todos', estado: 'todos', estadoSalida: 'todos', orden: ORDEN }

function animal(aniId, caravana, extra = {}) {
  return {
    aniId,
    aniCaravana: caravana,
    razaId: 1,
    razaDescripcion: 'Brangus',
    aptoVenta: false,
    aniFechaEgreso: null,
    subGrupoId: null,
    gmd: 1,
    ...extra,
  }
}

const CON_GMD = [
  animal(1, 'CAR-001', { gmd: 1.5 }),
  animal(2, 'CAR-002', { gmd: 0.5, razaId: 2, razaDescripcion: 'Nelore' }),
  animal(3, 'CAR-003', { gmd: null }),
  animal(4, 'CAR-004', { gmd: 2.2, razaId: 2, razaDescripcion: 'Nelore' }),
  animal(5, 'CAR-005', { gmd: -0.3 }),
]

function caravanas(resultado) {
  return resultado.map((a) => a.aniCaravana)
}

describe('filtrarYOrdenarAnimales: filtro de raza', () => {
  it('filtra por razaId', () => {
    expect(caravanas(filtrarYOrdenarAnimales(CON_GMD, { ...BASE, raza: '2' }))).toEqual(['CAR-002', 'CAR-004'])
  })

  it('"todas" (o sin el parámetro) no filtra por raza', () => {
    expect(filtrarYOrdenarAnimales(CON_GMD, { ...BASE, raza: 'todas' })).toHaveLength(5)
    expect(filtrarYOrdenarAnimales(CON_GMD, BASE)).toHaveLength(5)
  })
})

describe('filtrarYOrdenarAnimales: filtro de GMD', () => {
  it('con GMD mínima deja a los que la alcanzan y saca a los que no tienen GMD', () => {
    expect(caravanas(filtrarYOrdenarAnimales(CON_GMD, { ...BASE, gmdMin: '1' }))).toEqual(['CAR-001', 'CAR-004'])
  })

  it('con GMD máxima deja a los que no la superan (incluida una pérdida de peso) y saca a los que no tienen GMD', () => {
    expect(caravanas(filtrarYOrdenarAnimales(CON_GMD, { ...BASE, gmdMax: '1,5' }))).toEqual([
      'CAR-001',
      'CAR-002',
      'CAR-005',
    ])
  })

  it('con mínima y máxima, filtra el rango (inclusivo)', () => {
    expect(caravanas(filtrarYOrdenarAnimales(CON_GMD, { ...BASE, gmdMin: '0,5', gmdMax: '1,5' }))).toEqual([
      'CAR-001',
      'CAR-002',
    ])
  })

  it('un límite a medio escribir se ignora: no filtra y no saca a los que no tienen GMD', () => {
    expect(filtrarYOrdenarAnimales(CON_GMD, { ...BASE, gmdMin: '-' })).toHaveLength(5)
    expect(filtrarYOrdenarAnimales(CON_GMD, { ...BASE, gmdMax: ',' })).toHaveLength(5)
  })

  it('se combina con la raza y con el estado de salida', () => {
    const salido = animal(6, 'CAR-006', { gmd: 2, razaId: 2, razaDescripcion: 'Nelore', aniFechaEgreso: '2026-06-01' })
    const resultado = filtrarYOrdenarAnimales([...CON_GMD, salido], {
      ...BASE,
      estadoSalida: 'activos',
      raza: '2',
      gmdMin: '1',
    })
    expect(caravanas(resultado)).toEqual(['CAR-004'])
  })
})

describe('filtrarYOrdenarAnimales: orden por GMD', () => {
  it('de mayor a menor, con los que no tienen GMD al final', () => {
    const resultado = filtrarYOrdenarAnimales(CON_GMD, { ...BASE, orden: { campo: 'gmd', direccion: 'desc' } })
    expect(caravanas(resultado)).toEqual(['CAR-004', 'CAR-001', 'CAR-002', 'CAR-005', 'CAR-003'])
  })

  it('de menor a mayor, también con los que no tienen GMD al final', () => {
    const resultado = filtrarYOrdenarAnimales(CON_GMD, { ...BASE, orden: { campo: 'gmd', direccion: 'asc' } })
    expect(caravanas(resultado)).toEqual(['CAR-005', 'CAR-002', 'CAR-001', 'CAR-004', 'CAR-003'])
  })
})

describe('contarFiltrosActivos', () => {
  it('con los valores por defecto no hay filtros activos (el estado de salida "activos" es el valor por defecto)', () => {
    expect(contarFiltrosActivos({})).toBe(0)
    expect(contarFiltrosActivos(FILTROS_POR_DEFECTO)).toBe(0)
  })

  it('cuenta cada filtro que se aparta de su valor por defecto', () => {
    expect(contarFiltrosActivos({ ...FILTROS_POR_DEFECTO, busqueda: 'CAR' })).toBe(1)
    expect(contarFiltrosActivos({ ...FILTROS_POR_DEFECTO, lote: '10' })).toBe(1)
    expect(contarFiltrosActivos({ ...FILTROS_POR_DEFECTO, estado: 'aptos' })).toBe(1)
    expect(contarFiltrosActivos({ ...FILTROS_POR_DEFECTO, estadoSalida: 'salidos' })).toBe(1)
    expect(contarFiltrosActivos({ ...FILTROS_POR_DEFECTO, raza: '2' })).toBe(1)
    expect(contarFiltrosActivos({ ...FILTROS_POR_DEFECTO, raza: '2', lote: 'sin-lote', busqueda: 'x' })).toBe(3)
  })

  it('la GMD mínima y la máxima cuentan por separado, y un límite a medio escribir no cuenta', () => {
    expect(contarFiltrosActivos({ ...FILTROS_POR_DEFECTO, gmdMin: '1', gmdMax: '2' })).toBe(2)
    expect(contarFiltrosActivos({ ...FILTROS_POR_DEFECTO, gmdMin: '-', gmdMax: ',' })).toBe(0)
  })

  it('una búsqueda de solo espacios no cuenta', () => {
    expect(contarFiltrosActivos({ ...FILTROS_POR_DEFECTO, busqueda: '   ' })).toBe(0)
  })
})
