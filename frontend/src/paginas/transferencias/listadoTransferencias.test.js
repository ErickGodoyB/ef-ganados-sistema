import { describe, expect, it } from 'vitest'
import { filtrarTransferencias } from './listadoTransferencias'

const TRANSFERENCIAS = [
  {
    traId: 3,
    motivo: 'DEVOLUCION',
    responsableNombre: 'Luis Gómez',
    origenes: ['Lote B'],
    destinos: ['Lote A'],
  },
  {
    traId: 2,
    motivo: 'SELECCION',
    responsableNombre: 'Ana Pérez',
    origenes: ['Lote A', 'Sin lote'],
    destinos: ['Recría Norte'],
  },
  {
    traId: 1,
    motivo: 'SANITARIO',
    responsableNombre: 'Ana Pérez',
    origenes: ['Lote C'],
    destinos: ['Lote B'],
  },
]

function ids(resultado) {
  return resultado.map((transferencia) => transferencia.traId)
}

describe('filtrarTransferencias', () => {
  it('sin texto (o con solo espacios) devuelve todas, en el mismo orden', () => {
    expect(ids(filtrarTransferencias(TRANSFERENCIAS, ''))).toEqual([3, 2, 1])
    expect(ids(filtrarTransferencias(TRANSFERENCIAS, '   '))).toEqual([3, 2, 1])
  })

  it('busca en los lotes de origen y de destino', () => {
    expect(ids(filtrarTransferencias(TRANSFERENCIAS, 'lote c'))).toEqual([1])
    expect(ids(filtrarTransferencias(TRANSFERENCIAS, 'recría'))).toEqual([2])
    // "Lote B" figura como origen de una y como destino de otra.
    expect(ids(filtrarTransferencias(TRANSFERENCIAS, 'lote b'))).toEqual([3, 1])
  })

  it('encuentra "Sin lote" entre los orígenes', () => {
    expect(ids(filtrarTransferencias(TRANSFERENCIAS, 'sin lote'))).toEqual([2])
  })

  it('busca en el responsable', () => {
    expect(ids(filtrarTransferencias(TRANSFERENCIAS, 'ana'))).toEqual([2, 1])
    expect(ids(filtrarTransferencias(TRANSFERENCIAS, 'gomez'))).toEqual([3])
  })

  it('busca en el motivo, por su etiqueta y por su valor', () => {
    expect(ids(filtrarTransferencias(TRANSFERENCIAS, 'sanitario'))).toEqual([1])
    expect(ids(filtrarTransferencias(TRANSFERENCIAS, 'SELECCION'))).toEqual([2])
    expect(ids(filtrarTransferencias(TRANSFERENCIAS, 'devolución'))).toEqual([3])
  })

  it('no distingue mayúsculas ni tildes (en ninguno de los dos lados)', () => {
    expect(ids(filtrarTransferencias(TRANSFERENCIAS, 'SELECCIÓN'))).toEqual([2])
    expect(ids(filtrarTransferencias(TRANSFERENCIAS, 'recria'))).toEqual([2])
    expect(ids(filtrarTransferencias(TRANSFERENCIAS, 'PEREZ'))).toEqual([2, 1])
  })

  it('sin coincidencias devuelve una lista vacía, y no rompe con campos faltantes', () => {
    expect(filtrarTransferencias(TRANSFERENCIAS, 'zzz')).toEqual([])
    expect(filtrarTransferencias([{ traId: 9, motivo: 'OTRO' }], 'otro')).toHaveLength(1)
  })
})
