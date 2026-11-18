import { describe, expect, it } from 'vitest'
import {
  agruparLotesPorGrupo,
  calcularGmdPromedio,
  descripcionesDeOrigen,
  filtrarAnimales,
  idsDeMayorGmd,
  obtenerLotesDeOrigen,
  OPCIONES_ORDEN,
  ordenarAnimales,
  ordenarPorGmd,
  ordenDesdeValor,
} from './animalesCandidatos'

function animal(aniId, caravana, extra = {}) {
  return {
    aniId,
    aniCaravana: caravana,
    razaId: 1,
    razaDescripcion: 'Brangus',
    subGrupoId: 10,
    subGrupoDescripcion: 'Lote A',
    grupoDescripcion: 'Invernada',
    gmd: 1,
    aniFechaEgreso: null,
    ...extra,
  }
}

const ANIMALES = [
  animal(1, 'CAR-001', { gmd: 1.5 }),
  animal(2, 'CAR-002', { gmd: 0.5, razaId: 2, razaDescripcion: 'Nelore' }),
  animal(3, 'CAR-003', { gmd: null, subGrupoId: 11, subGrupoDescripcion: 'Lote B' }),
  animal(4, 'CAR-004', { gmd: 2.2, subGrupoId: null, subGrupoDescripcion: null, grupoDescripcion: null }),
  animal(5, 'CAR-005', { gmd: 3, aniFechaEgreso: '2026-06-01' }),
]

describe('filtrarAnimales', () => {
  it('sin filtros trae solo los activos (excluye los que tienen salida)', () => {
    expect(filtrarAnimales(ANIMALES, {}).map((a) => a.aniId)).toEqual([1, 2, 3, 4])
  })

  it('filtra por lote de origen, incluyendo "sin-lote"', () => {
    expect(filtrarAnimales(ANIMALES, { origen: '10' }).map((a) => a.aniId)).toEqual([1, 2])
    expect(filtrarAnimales(ANIMALES, { origen: '11' }).map((a) => a.aniId)).toEqual([3])
    expect(filtrarAnimales(ANIMALES, { origen: 'sin-lote' }).map((a) => a.aniId)).toEqual([4])
  })

  it('filtra por raza', () => {
    expect(filtrarAnimales(ANIMALES, { raza: '2' }).map((a) => a.aniId)).toEqual([2])
  })

  it('filtra por GMD mínima y máxima (inclusivas) y deja afuera a los que no tienen GMD', () => {
    expect(filtrarAnimales(ANIMALES, { gmdMin: '1' }).map((a) => a.aniId)).toEqual([1, 4])
    expect(filtrarAnimales(ANIMALES, { gmdMax: '1,5' }).map((a) => a.aniId)).toEqual([1, 2])
    expect(filtrarAnimales(ANIMALES, { gmdMin: '0,5', gmdMax: '1,5' }).map((a) => a.aniId)).toEqual([1, 2])
  })

  it('un límite ilegible se ignora: no vacía la lista ni excluye a los que no tienen GMD', () => {
    expect(filtrarAnimales(ANIMALES, { gmdMin: '-' }).map((a) => a.aniId)).toEqual([1, 2, 3, 4])
  })

  it('combina los filtros', () => {
    expect(filtrarAnimales(ANIMALES, { origen: '10', gmdMin: '1' }).map((a) => a.aniId)).toEqual([1])
  })
})

describe('ordenarPorGmd', () => {
  it('de mayor a menor por defecto, con los que no tienen GMD al final', () => {
    const activos = filtrarAnimales(ANIMALES, {})
    expect(ordenarPorGmd(activos).map((a) => a.aniId)).toEqual([4, 1, 2, 3])
  })

  it('de menor a mayor, también con los que no tienen GMD al final', () => {
    const activos = filtrarAnimales(ANIMALES, {})
    expect(ordenarPorGmd(activos, 'asc').map((a) => a.aniId)).toEqual([2, 1, 4, 3])
  })

  it('a igual GMD ordena por caravana y no modifica el arreglo original', () => {
    const empate = [animal(7, 'CAR-010', { gmd: 1 }), animal(8, 'CAR-009', { gmd: 1 })]
    expect(ordenarPorGmd(empate).map((a) => a.aniId)).toEqual([8, 7])
    expect(empate.map((a) => a.aniId)).toEqual([7, 8])
  })
})

describe('ordenarAnimales', () => {
  const conPeso = [
    animal(1, 'CAR-001', { pesoActual: 300, gmd: 1 }),
    animal(2, 'CAR-002', { pesoActual: 200, gmd: null }),
    animal(3, 'CAR-003', { pesoActual: 400, gmd: 2 }),
  ]

  it('por peso actual, de mayor a menor y de menor a mayor', () => {
    expect(ordenarAnimales(conPeso, { campo: 'pesoActual', direccion: 'desc' }).map((a) => a.aniId)).toEqual([3, 1, 2])
    expect(ordenarAnimales(conPeso, { campo: 'pesoActual', direccion: 'asc' }).map((a) => a.aniId)).toEqual([2, 1, 3])
  })

  it('por GMD deja a los que no tienen al final, en las dos direcciones', () => {
    expect(ordenarAnimales(conPeso, { campo: 'gmd', direccion: 'desc' }).map((a) => a.aniId)).toEqual([3, 1, 2])
    expect(ordenarAnimales(conPeso, { campo: 'gmd', direccion: 'asc' }).map((a) => a.aniId)).toEqual([1, 3, 2])
  })

  it('por defecto ordena por GMD de mayor a menor', () => {
    expect(ordenarAnimales(conPeso).map((a) => a.aniId)).toEqual([3, 1, 2])
  })

  it('las opciones del selector cubren GMD y peso actual en ambas direcciones y se traducen a campo/dirección', () => {
    expect(OPCIONES_ORDEN.map((o) => o.valor)).toEqual(['gmd:desc', 'gmd:asc', 'pesoActual:desc', 'pesoActual:asc'])
    expect(ordenDesdeValor('pesoActual:asc')).toEqual({ campo: 'pesoActual', direccion: 'asc' })
  })
})

describe('idsDeMayorGmd', () => {
  const activos = filtrarAnimales(ANIMALES, {})

  it('devuelve los N de mayor GMD, ignorando a los que no tienen', () => {
    expect(idsDeMayorGmd(activos, 2)).toEqual([4, 1])
    expect(idsDeMayorGmd(activos, 10)).toEqual([4, 1, 2])
  })

  it('deja afuera a los que no pueden seleccionarse (ej. ya están en el destino)', () => {
    expect(idsDeMayorGmd(activos, 2, (a) => a.aniId !== 4)).toEqual([1, 2])
  })

  it('con N inválido o cero devuelve una lista vacía', () => {
    expect(idsDeMayorGmd(activos, 0)).toEqual([])
    expect(idsDeMayorGmd(activos, NaN)).toEqual([])
    expect(idsDeMayorGmd(activos, -3)).toEqual([])
  })
})

describe('calcularGmdPromedio', () => {
  it('promedia solo a los que tienen GMD', () => {
    expect(calcularGmdPromedio([animal(1, 'A', { gmd: 1 }), animal(2, 'B', { gmd: 2 }), animal(3, 'C', { gmd: null })])).toBe(1.5)
  })

  it('devuelve null si ninguno tiene GMD o la lista está vacía', () => {
    expect(calcularGmdPromedio([animal(1, 'A', { gmd: null })])).toBeNull()
    expect(calcularGmdPromedio([])).toBeNull()
  })
})

describe('opciones de filtro y descripciones', () => {
  it('lista los lotes con "Lote — Grupo", sin repetir', () => {
    expect(obtenerLotesDeOrigen(ANIMALES)).toEqual([
      { valor: '10', etiqueta: 'Lote A — Invernada' },
      { valor: '11', etiqueta: 'Lote B — Invernada' },
    ])
  })

  it('agruparLotesPorGrupo ordena grupos y lotes, y deja "Sin grupo" al final', () => {
    const lotes = [
      { sbId: 1, sbDescripcion: 'Lote B', grupo: { grpDescripcion: 'Recría' } },
      { sbId: 2, sbDescripcion: 'Lote A', grupo: { grpDescripcion: 'Recría' } },
      { sbId: 3, sbDescripcion: 'Lote Z', grupo: null },
      { sbId: 4, sbDescripcion: 'Lote C', grupo: { grpDescripcion: 'Invernada' } },
    ]
    expect(agruparLotesPorGrupo(lotes).map((g) => [g.nombre, g.lotes.map((l) => l.sbId)])).toEqual([
      ['Invernada', [4]],
      ['Recría', [2, 1]],
      ['Sin grupo', [3]],
    ])
  })

  it('descripcionesDeOrigen usa "Sin lote" para los que no tienen lote', () => {
    expect(descripcionesDeOrigen([ANIMALES[0], ANIMALES[2], ANIMALES[3]])).toEqual(['Lote A', 'Lote B', 'Sin lote'])
  })
})
