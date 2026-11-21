import { describe, expect, it } from 'vitest'
import {
  cumpleFiltroPesajes,
  cumpleFiltroPeso,
  cumpleFiltroProveedor,
  cumpleFiltrosComunes,
  hayFiltroPeso,
  obtenerProveedoresDisponibles,
  valorNumericoDeAnimal,
} from './filtrosAnimales'

const ANIMAL = {
  razaId: 1,
  proveedorId: 4,
  proveedorNombre: 'Pedro Vera',
  gmd: 1.2,
  pesoActual: 300,
  cantidadPesajes: 3,
  gananciaTotal: 100,
  gmdAcumulado: 1.1,
  aniPesoInicial: 200,
}

describe('cumpleFiltroPeso', () => {
  it('límites inclusivos, con coma o punto', () => {
    expect(cumpleFiltroPeso(ANIMAL, '300', '')).toBe(true)
    expect(cumpleFiltroPeso(ANIMAL, '300,5', '')).toBe(false)
    expect(cumpleFiltroPeso(ANIMAL, '', '300')).toBe(true)
    expect(cumpleFiltroPeso(ANIMAL, '', '299.9')).toBe(false)
    expect(cumpleFiltroPeso(ANIMAL, '250', '350')).toBe(true)
  })

  it('sin límites válidos (vacíos o a medio escribir) deja pasar a todos', () => {
    expect(cumpleFiltroPeso(ANIMAL, '', '')).toBe(true)
    expect(cumpleFiltroPeso(ANIMAL, '-', ',')).toBe(true)
  })
})

describe('hayFiltroPeso', () => {
  it('es true si al menos un límite es válido', () => {
    expect(hayFiltroPeso('300', '')).toBe(true)
    expect(hayFiltroPeso('', '')).toBe(false)
    expect(hayFiltroPeso('-', 'x')).toBe(false)
  })
})

describe('cumpleFiltroPesajes', () => {
  it('"con" pide al menos un pesaje y "sin" ninguno; "todos" (o vacío) deja pasar', () => {
    const sin = { cantidadPesajes: 0 }

    expect(cumpleFiltroPesajes(ANIMAL, 'con')).toBe(true)
    expect(cumpleFiltroPesajes(sin, 'con')).toBe(false)
    expect(cumpleFiltroPesajes(ANIMAL, 'sin')).toBe(false)
    expect(cumpleFiltroPesajes(sin, 'sin')).toBe(true)
    expect(cumpleFiltroPesajes(sin, 'todos')).toBe(true)
    expect(cumpleFiltroPesajes(sin, undefined)).toBe(true)
  })
})

describe('cumpleFiltroProveedor', () => {
  it('por id, "sin-proveedor" o todos', () => {
    expect(cumpleFiltroProveedor(ANIMAL, '4')).toBe(true)
    expect(cumpleFiltroProveedor(ANIMAL, '5')).toBe(false)
    expect(cumpleFiltroProveedor(ANIMAL, 'sin-proveedor')).toBe(false)
    expect(cumpleFiltroProveedor({ proveedorId: null }, 'sin-proveedor')).toBe(true)
    expect(cumpleFiltroProveedor({ proveedorId: null }, '4')).toBe(false)
    expect(cumpleFiltroProveedor({ proveedorId: null }, 'todos')).toBe(true)
  })
})

describe('obtenerProveedoresDisponibles', () => {
  it('lista cada proveedor una vez, por nombre, y no incluye a los animales sin proveedor', () => {
    const animales = [
      { proveedorId: 6, proveedorNombre: 'Rosa Núñez' },
      { proveedorId: 4, proveedorNombre: 'Pedro Vera' },
      { proveedorId: 4, proveedorNombre: 'Pedro Vera' },
      { proveedorId: null, proveedorNombre: null },
    ]

    expect(obtenerProveedoresDisponibles(animales)).toEqual([
      { valor: '6', etiqueta: 'Rosa Núñez' },
      { valor: '4', etiqueta: 'Pedro Vera' },
    ].sort((a, b) => a.etiqueta.localeCompare(b.etiqueta, 'es')))
  })
})

describe('cumpleFiltrosComunes', () => {
  it('sin ningún filtro deja pasar a todos', () => {
    expect(cumpleFiltrosComunes(ANIMAL)).toBe(true)
    expect(cumpleFiltrosComunes(ANIMAL, {})).toBe(true)
  })

  it('exige que se cumplan todos a la vez', () => {
    const filtros = { raza: '1', proveedor: '4', pesajes: 'con', gmdMin: '1', pesoMin: '250', pesoMax: '350' }

    expect(cumpleFiltrosComunes(ANIMAL, filtros)).toBe(true)
    expect(cumpleFiltrosComunes(ANIMAL, { ...filtros, raza: '2' })).toBe(false)
    expect(cumpleFiltrosComunes(ANIMAL, { ...filtros, proveedor: 'sin-proveedor' })).toBe(false)
    expect(cumpleFiltrosComunes(ANIMAL, { ...filtros, pesajes: 'sin' })).toBe(false)
    expect(cumpleFiltrosComunes(ANIMAL, { ...filtros, gmdMin: '2' })).toBe(false)
    expect(cumpleFiltrosComunes(ANIMAL, { ...filtros, pesoMin: '310' })).toBe(false)
    expect(cumpleFiltrosComunes(ANIMAL, { ...filtros, pesoMax: '290' })).toBe(false)
  })

  it('con un límite de GMD válido, un animal sin GMD queda afuera', () => {
    expect(cumpleFiltrosComunes({ ...ANIMAL, gmd: null }, { gmdMin: '0' })).toBe(false)
    expect(cumpleFiltrosComunes({ ...ANIMAL, gmd: null }, { gmdMin: '' })).toBe(true)
  })
})

describe('valorNumericoDeAnimal', () => {
  it('devuelve el valor de cada campo numérico de orden', () => {
    expect(valorNumericoDeAnimal(ANIMAL, 'gmd')).toBe(1.2)
    expect(valorNumericoDeAnimal(ANIMAL, 'pesoActual')).toBe(300)
    expect(valorNumericoDeAnimal(ANIMAL, 'gananciaTotal')).toBe(100)
    expect(valorNumericoDeAnimal(ANIMAL, 'gmdAcumulado')).toBe(1.1)
    expect(valorNumericoDeAnimal(ANIMAL, 'aniPesoInicial')).toBe(200)
    expect(valorNumericoDeAnimal(ANIMAL, 'cantidadPesajes')).toBe(3)
  })

  it('un campo que no es numérico devuelve undefined', () => {
    expect(valorNumericoDeAnimal(ANIMAL, 'raza')).toBeUndefined()
  })
})
