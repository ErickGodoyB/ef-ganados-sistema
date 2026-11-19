import { describe, expect, it } from 'vitest'
import {
  AVISO_DATOS_PERSONALES,
  COLUMNAS_PERSONAS,
  describirFiltrosPersonas,
  filaDePersona,
  filasDePersonasParaExportar,
} from './exportacionPersonas'

const PERSONAS = [
  {
    perId: 1,
    perNombre: 'Juan',
    perApellido: 'Pérez',
    perTipo: 'PROPIETARIO',
    perCi: '1111111',
    perRuc: '80000000-1',
    perTelefono: '0981111111',
    perCorreo: 'juan@test.com',
    perDireccion: 'Calle 123',
    cantidadAnimales: 4,
    cantidadComoComprador: 0,
    cantidadComoProveedor: 0,
    cantidadPesajes: 7,
  },
  {
    perId: 2,
    perNombre: 'Ana',
    perApellido: 'Gómez',
    perTipo: 'PROVEEDOR',
    perCi: '2222222',
    perRuc: null,
    perTelefono: null,
    perCorreo: null,
    perDireccion: null,
    cantidadAnimales: 0,
    cantidadComoComprador: 0,
    cantidadPesajes: 0,
  },
]

describe('COLUMNAS_PERSONAS', () => {
  it('trae las 12 columnas pedidas, en orden', () => {
    expect(COLUMNAS_PERSONAS.map((columna) => columna.clave)).toEqual([
      'nombre',
      'apellido',
      'tipo',
      'ci',
      'ruc',
      'telefono',
      'correo',
      'direccion',
      'animales',
      'compras',
      'comoProveedor',
      'pesajes',
    ])
  })

  it('las cantidades son enteros y quedan marcados de entrada los datos del listado', () => {
    expect(COLUMNAS_PERSONAS.filter((columna) => columna.tipo === 'entero')).toHaveLength(4)
    const marcadas = COLUMNAS_PERSONAS.filter((columna) => columna.porDefecto).map((columna) => columna.clave)
    expect(marcadas).not.toContain('ruc')
    expect(marcadas).not.toContain('correo')
    expect(marcadas).not.toContain('direccion')
    expect(marcadas).toContain('nombre')
  })
})

describe('filaDePersona', () => {
  it('arma la fila con la etiqueta del tipo y las cantidades', () => {
    expect(filaDePersona(PERSONAS[0])).toEqual({
      nombre: 'Juan',
      apellido: 'Pérez',
      tipo: 'Propietario',
      ci: '1111111',
      ruc: '80000000-1',
      telefono: '0981111111',
      correo: 'juan@test.com',
      direccion: 'Calle 123',
      animales: 4,
      compras: 0,
      comoProveedor: 0,
      pesajes: 7,
    })
  })

  it('una cantidad que falta (cantidadComoProveedor) cuenta como 0', () => {
    const { cantidadComoProveedor, ...sinCampo } = PERSONAS[1]
    expect(cantidadComoProveedor).toBeUndefined()

    expect(filaDePersona(sinCampo).comoProveedor).toBe(0)
    expect(filaDePersona(PERSONAS[1]).tipo).toBe('Proveedor')
  })
})

describe('filasDePersonasParaExportar', () => {
  it('filtra por búsqueda y tipo (como el listado) y ordena por nombre', () => {
    expect(filasDePersonasParaExportar(PERSONAS, { busqueda: '', tipo: 'todos' }).map((f) => f.nombre)).toEqual([
      'Ana',
      'Juan',
    ])
    expect(filasDePersonasParaExportar(PERSONAS, { busqueda: 'juan', tipo: 'todos' }).map((f) => f.nombre)).toEqual(['Juan'])
    expect(filasDePersonasParaExportar(PERSONAS, { busqueda: '', tipo: 'PROVEEDOR' }).map((f) => f.nombre)).toEqual(['Ana'])
    expect(filasDePersonasParaExportar(PERSONAS, { busqueda: '2222222', tipo: 'todos' })).toHaveLength(1)
  })
})

describe('describirFiltrosPersonas', () => {
  it('sin filtros no hay líneas', () => {
    expect(describirFiltrosPersonas({ busqueda: '', tipo: 'todos' })).toEqual([])
  })

  it('describe la búsqueda y el tipo con su etiqueta', () => {
    expect(describirFiltrosPersonas({ busqueda: ' Juan ', tipo: 'PROVEEDOR' })).toEqual([
      { etiqueta: 'Búsqueda', valor: 'Juan' },
      { etiqueta: 'Tipo', valor: 'Proveedor' },
    ])
  })
})

describe('AVISO_DATOS_PERSONALES', () => {
  it('es el texto pedido', () => {
    expect(AVISO_DATOS_PERSONALES).toBe('El archivo contiene datos personales')
  })
})
