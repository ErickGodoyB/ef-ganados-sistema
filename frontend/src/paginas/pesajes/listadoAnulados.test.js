import { describe, expect, it } from 'vitest'
import { filtrarAnulados } from './listadoAnulados'

const ANULADOS = [
  { pesaId: 1, caravana: 'CAR-001' },
  { pesaId: 2, caravana: 'TEST-25' },
  { pesaId: 3, caravana: 'car-099' },
]

describe('filtrarAnulados', () => {
  it('devuelve todo si la búsqueda está vacía', () => {
    expect(filtrarAnulados(ANULADOS, '')).toEqual(ANULADOS)
    expect(filtrarAnulados(ANULADOS, '   ')).toEqual(ANULADOS)
  })

  it('filtra por caravana sin distinguir mayúsculas', () => {
    expect(filtrarAnulados(ANULADOS, 'car')).toEqual([ANULADOS[0], ANULADOS[2]])
  })

  it('filtra por coincidencia exacta', () => {
    expect(filtrarAnulados(ANULADOS, 'TEST-25')).toEqual([ANULADOS[1]])
  })

  it('devuelve vacío si no hay coincidencias', () => {
    expect(filtrarAnulados(ANULADOS, 'zzz')).toEqual([])
  })
})
