import { describe, expect, it } from 'vitest'
import { contarFiltrosActivos, FILTROS_POR_DEFECTO, filtrarYOrdenarAnimales } from './listadoAnimales'

function animal(aniId, caravana, extra = {}) {
  return {
    aniId,
    aniCaravana: caravana,
    razaId: 1,
    subGrupoId: 10,
    proveedorId: null,
    pesoActual: 250,
    aniPesoInicial: 200,
    cantidadPesajes: 2,
    gananciaTotal: 50,
    gmdAcumulado: 1,
    gmd: 1,
    aptoVenta: false,
    aniFechaEgreso: null,
    ...extra,
  }
}

const ANIMALES = [
  animal(1, 'CAR-001', { pesoActual: 300, cantidadPesajes: 3, gananciaTotal: 100, aniPesoInicial: 200 }),
  animal(2, 'CAR-002', { pesoActual: 200, cantidadPesajes: 1, gananciaTotal: 10, aniPesoInicial: 190 }),
  animal(3, 'CAR-003', { pesoActual: 220, cantidadPesajes: 0, gananciaTotal: null, gmdAcumulado: null, gmd: null, aniPesoInicial: 220 }),
  animal(4, 'CAR-004', { pesoActual: 350, cantidadPesajes: 5, gananciaTotal: 150, aniPesoInicial: 200 }),
]

const BASE = { busqueda: '', lote: 'todos', estado: 'todos', estadoSalida: 'todos', orden: { campo: 'aniCaravana', direccion: 'asc' } }

function caravanas(filtros) {
  return filtrarYOrdenarAnimales(ANIMALES, { ...BASE, ...filtros }).map((a) => a.aniCaravana)
}

describe('listado de animales: filtros de pesajes y de peso actual', () => {
  it('filtra por con pesajes y sin pesajes', () => {
    expect(caravanas({ pesajes: 'con' })).toEqual(['CAR-001', 'CAR-002', 'CAR-004'])
    expect(caravanas({ pesajes: 'sin' })).toEqual(['CAR-003'])
    expect(caravanas({ pesajes: 'todos' })).toHaveLength(4)
  })

  it('filtra por peso actual mínimo y máximo', () => {
    expect(caravanas({ pesoMin: '250' })).toEqual(['CAR-001', 'CAR-004'])
    expect(caravanas({ pesoMax: '220' })).toEqual(['CAR-002', 'CAR-003'])
    expect(caravanas({ pesoMin: '210', pesoMax: '310' })).toEqual(['CAR-001', 'CAR-003'])
  })

  it('sin los filtros nuevos se comporta como antes', () => {
    expect(caravanas({})).toHaveLength(4)
  })
})

describe('listado de animales: orden por ganancia total, pesajes y peso de ingreso', () => {
  it('por ganancia total, con los que no tienen pesajes siempre al final', () => {
    expect(caravanas({ orden: { campo: 'gananciaTotal', direccion: 'desc' } })).toEqual(['CAR-004', 'CAR-001', 'CAR-002', 'CAR-003'])
    expect(caravanas({ orden: { campo: 'gananciaTotal', direccion: 'asc' } })).toEqual(['CAR-002', 'CAR-001', 'CAR-004', 'CAR-003'])
  })

  it('por cantidad de pesajes', () => {
    expect(caravanas({ orden: { campo: 'cantidadPesajes', direccion: 'desc' } })).toEqual(['CAR-004', 'CAR-001', 'CAR-002', 'CAR-003'])
    expect(caravanas({ orden: { campo: 'cantidadPesajes', direccion: 'asc' } })).toEqual(['CAR-003', 'CAR-002', 'CAR-001', 'CAR-004'])
  })

  it('por peso de ingreso y por GMD acumulado', () => {
    expect(caravanas({ orden: { campo: 'aniPesoInicial', direccion: 'asc' } })[0]).toBe('CAR-002')
    expect(caravanas({ orden: { campo: 'gmdAcumulado', direccion: 'asc' } }).at(-1)).toBe('CAR-003')
  })
})

describe('contarFiltrosActivos: pesajes y peso actual', () => {
  it('los valores por defecto incluyen los filtros nuevos sin filtrar', () => {
    expect(FILTROS_POR_DEFECTO).toMatchObject({ pesajes: 'todos', pesoMin: '', pesoMax: '' })
    expect(contarFiltrosActivos({})).toBe(0)
  })

  it('suma el de pesajes y cada límite de peso válido (uno a medio escribir no cuenta)', () => {
    expect(contarFiltrosActivos({ pesajes: 'con' })).toBe(1)
    expect(contarFiltrosActivos({ pesoMin: '250', pesoMax: '350' })).toBe(2)
    expect(contarFiltrosActivos({ pesoMin: '-', pesoMax: '' })).toBe(0)
    expect(contarFiltrosActivos({ pesajes: 'sin', pesoMin: '250', raza: '1' })).toBe(3)
  })
})
