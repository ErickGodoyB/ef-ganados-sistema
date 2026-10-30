import { describe, expect, it } from 'vitest'
import { animalEsElegibleParaPesaje, motivoNoElegible } from './elegibilidadPesaje'

function crearAnimal(datos) {
  return {
    aniId: 1,
    aniCaravana: 'CAR-001',
    aniFechaIngreso: '2026-01-01',
    aniFechaEgreso: null,
    subGrupoId: 10,
    subGrupoDescripcion: 'Lote A',
    ...datos,
  }
}

describe('motivoNoElegible', () => {
  it('es elegible (null) un animal sin restricciones', () => {
    expect(motivoNoElegible(crearAnimal({}), '2026-10-29', new Set())).toBeNull()
  })

  it('un animal con salida registrada no es elegible', () => {
    const animal = crearAnimal({ aniFechaEgreso: '2026-05-01' })
    expect(motivoNoElegible(animal, '2026-10-29', new Set())).toBe('CAR-001 tiene salida registrada')
  })

  it('reproduce el caso reportado: TEST-25 con ingreso 2026-07-26 y fecha de pesaje 2026-07-05', () => {
    const animal = crearAnimal({ aniCaravana: 'TEST-25', aniFechaIngreso: '2026-07-26' })
    expect(motivoNoElegible(animal, '2026-07-05', new Set())).toBe(
      'TEST-25 ingresó el 26/07/2026, posterior a la fecha elegida',
    )
  })

  it('un animal cuyo ingreso es la misma fecha del pesaje SÍ es elegible (límite inclusive)', () => {
    const animal = crearAnimal({ aniFechaIngreso: '2026-07-05' })
    expect(motivoNoElegible(animal, '2026-07-05', new Set())).toBeNull()
  })

  it('un animal con un pesaje activo esa fecha no es elegible', () => {
    const animal = crearAnimal({ aniId: 42 })
    expect(motivoNoElegible(animal, '2026-10-29', new Set([42]))).toBe('CAR-001 ya tiene un pesaje el 29/10/2026')
  })

  it('un animal que no está en el conjunto de "ya pesados" sí es elegible', () => {
    const animal = crearAnimal({ aniId: 42 })
    expect(motivoNoElegible(animal, '2026-10-30', new Set([99]))).toBeNull()
  })

  it('con loteId, un animal de otro lote no es elegible', () => {
    const animal = crearAnimal({ subGrupoId: 99, subGrupoDescripcion: 'Lote B' })
    expect(motivoNoElegible(animal, '2026-10-29', new Set(), '10')).toBe('CAR-001 pertenece al lote Lote B')
  })

  it('con loteId igual al del animal, es elegible', () => {
    const animal = crearAnimal({ subGrupoId: 10 })
    expect(motivoNoElegible(animal, '2026-10-29', new Set(), '10')).toBeNull()
  })

  it('con loteId "sin-lote", solo son elegibles los animales sin subGrupoId', () => {
    const conLote = crearAnimal({ subGrupoId: 10, subGrupoDescripcion: 'Lote A' })
    const sinLote = crearAnimal({ subGrupoId: null, subGrupoDescripcion: null })
    expect(motivoNoElegible(conLote, '2026-10-29', new Set(), 'sin-lote')).toBe('CAR-001 pertenece al lote Lote A')
    expect(motivoNoElegible(sinLote, '2026-10-29', new Set(), 'sin-lote')).toBeNull()
  })

  it('sin loteId (pestaña Individual), un animal de cualquier lote es elegible', () => {
    const animal = crearAnimal({ subGrupoId: 99 })
    expect(motivoNoElegible(animal, '2026-10-29', new Set())).toBeNull()
  })

  it('la salida tiene prioridad sobre el lote y el ingreso', () => {
    const animal = crearAnimal({ aniFechaEgreso: '2026-05-01', subGrupoId: 99, aniFechaIngreso: '2026-12-01' })
    expect(motivoNoElegible(animal, '2026-10-29', new Set(), '10')).toBe('CAR-001 tiene salida registrada')
  })
})

describe('animalEsElegibleParaPesaje', () => {
  it('es true cuando motivoNoElegible es null', () => {
    expect(animalEsElegibleParaPesaje(crearAnimal({}), '2026-10-29', new Set())).toBe(true)
  })

  it('es false cuando hay un motivo', () => {
    const animal = crearAnimal({ aniFechaEgreso: '2026-05-01' })
    expect(animalEsElegibleParaPesaje(animal, '2026-10-29', new Set())).toBe(false)
  })
})
