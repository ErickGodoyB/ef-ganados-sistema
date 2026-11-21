import { describe, expect, it } from 'vitest'
import {
  columnasParaExportar,
  describirFiltrosAnimales,
  filaDeAnimal,
  filasDeAnimalesParaExportar,
  filtrarAnimalesParaExportar,
  filtrosInicialesDeExportacion,
  totalesDeAnimales,
} from './exportacionAnimales'
import { FILTROS_POR_DEFECTO } from './listadoAnimales'

function animal(aniId, caravana, extra = {}) {
  return {
    aniId,
    aniCaravana: caravana,
    razaId: 1,
    razaDescripcion: 'Brangus',
    subGrupoId: 10,
    subGrupoDescripcion: 'Lote A',
    grupoDescripcion: 'Cría',
    duenioNombre: 'Juan Pérez',
    proveedorId: null,
    proveedorNombre: null,
    compradorNombre: null,
    aniPesoInicial: 200,
    pesoActual: 250,
    gmd: 1,
    aptoVenta: false,
    aniFechaIngreso: '2026-01-05',
    aniFechaEgreso: null,
    aniMotivoSalida: null,
    ...extra,
  }
}

const ANIMALES = [
  animal(1, 'CAR-001', { gmd: 1.5, pesoActual: 300 }),
  animal(2, 'CAR-002', { gmd: 0.5, razaId: 2, razaDescripcion: 'Nelore', pesoActual: 450, aptoVenta: true }),
  animal(3, 'CAR-003', { gmd: null, subGrupoId: null, subGrupoDescripcion: null, proveedorId: 4, proveedorNombre: 'Pedro Vera' }),
  animal(4, 'CAR-004', { gmd: 2.2, aniFechaEgreso: '2026-06-01', aniMotivoSalida: 'VENTA', compradorNombre: 'Lucía Flores' }),
]

const FILTROS = {
  busqueda: '',
  estadoSalida: 'todos',
  lote: 'todos',
  raza: 'todas',
  proveedor: 'todos',
  estado: 'todos',
  gmdMin: '',
  gmdMax: '',
  orden: 'caravana',
}

const OPCIONES = {
  lotes: [{ valor: '10', etiqueta: 'Lote A — Cría' }],
  razas: [{ valor: '1', etiqueta: 'Brangus' }, { valor: '2', etiqueta: 'Nelore' }],
  proveedores: [{ valor: '4', etiqueta: 'Pedro Vera' }],
}

describe('columnasParaExportar', () => {
  it('trae las 16 columnas, en orden', () => {
    expect(columnasParaExportar({}).map((columna) => columna.clave)).toEqual([
      'caravana',
      'raza',
      'grupo',
      'lote',
      'duenio',
      'proveedor',
      'pesajes',
      'ingreso',
      'pesoInicial',
      'pesoActual',
      'gananciaTotal',
      'gmd',
      'gmdAcumulado',
      'apto',
      'estado',
      'comprador',
    ])
  })

  it('marca de entrada las que el listado muestra (y la caravana siempre)', () => {
    const visibles = { raza: true, lote: true, pesoActual: true, gmd: true, estado: true, fechaIngreso: false, proveedor: false }

    const marcadas = columnasParaExportar(visibles)
      .filter((columna) => columna.porDefecto)
      .map((columna) => columna.clave)

    expect(marcadas).toEqual(['caravana', 'raza', 'lote', 'pesoActual', 'gmd', 'estado'])
  })

  it('si el listado tiene visibles el proveedor y el ingreso, también salen marcadas', () => {
    const marcadas = columnasParaExportar({ proveedor: true, fechaIngreso: true })
      .filter((columna) => columna.porDefecto)
      .map((columna) => columna.clave)

    expect(marcadas).toEqual(['caravana', 'proveedor', 'ingreso'])
  })

  it('define el tipo de cada columna (números con sus decimales, fecha y booleano)', () => {
    const porClave = Object.fromEntries(columnasParaExportar({}).map((columna) => [columna.clave, columna]))

    expect(porClave.pesoActual).toMatchObject({ tipo: 'numero', decimales: 1 })
    expect(porClave.gmd).toMatchObject({ tipo: 'numero', decimales: 3 })
    expect(porClave.ingreso.tipo).toBe('fecha')
    expect(porClave.apto.tipo).toBe('booleano')
  })
})

describe('filaDeAnimal', () => {
  it('arma una fila con un valor por columna', () => {
    expect(filaDeAnimal(ANIMALES[1])).toEqual({
      caravana: 'CAR-002',
      raza: 'Nelore',
      grupo: 'Cría',
      lote: 'Lote A',
      duenio: 'Juan Pérez',
      proveedor: null,
      ingreso: '2026-01-05',
      pesoInicial: 200,
      pesoActual: 450,
      gmd: 0.5,
      apto: true,
      estado: 'Activo',
      comprador: null,
    })
  })

  it('el estado de un animal con salida dice el motivo y la fecha, y trae el comprador', () => {
    const fila = filaDeAnimal(ANIMALES[3])

    expect(fila.estado).toBe('Venta el 01/06/2026')
    expect(fila.comprador).toBe('Lucía Flores')
  })
})

describe('filtrarAnimalesParaExportar (mismo filtrado que el listado)', () => {
  const caravanas = (filtros) => filtrarAnimalesParaExportar(ANIMALES, { ...FILTROS, ...filtros }).map((a) => a.aniCaravana)

  it('sin filtros trae todos, por caravana', () => {
    expect(caravanas({})).toEqual(['CAR-001', 'CAR-002', 'CAR-003', 'CAR-004'])
  })

  it('filtra por estado de salida', () => {
    expect(caravanas({ estadoSalida: 'activos' })).toEqual(['CAR-001', 'CAR-002', 'CAR-003'])
    expect(caravanas({ estadoSalida: 'salidos' })).toEqual(['CAR-004'])
  })

  it('filtra por raza, lote, proveedor, aptitud y búsqueda', () => {
    expect(caravanas({ raza: '2' })).toEqual(['CAR-002'])
    expect(caravanas({ lote: 'sin-lote' })).toEqual(['CAR-003'])
    expect(caravanas({ proveedor: '4' })).toEqual(['CAR-003'])
    expect(caravanas({ proveedor: 'sin-proveedor' })).toEqual(['CAR-001', 'CAR-002', 'CAR-004'])
    expect(caravanas({ estado: 'aptos' })).toEqual(['CAR-002'])
    expect(caravanas({ busqueda: '003' })).toEqual(['CAR-003'])
  })

  it('filtra por GMD mínima y máxima (los que no tienen GMD quedan afuera)', () => {
    expect(caravanas({ gmdMin: '1' })).toEqual(['CAR-001', 'CAR-004'])
    expect(caravanas({ gmdMin: '0,5', gmdMax: '1,5' })).toEqual(['CAR-001', 'CAR-002'])
  })

  it('ordena por GMD o por peso actual, en las dos direcciones', () => {
    expect(caravanas({ orden: 'gmd-desc' })).toEqual(['CAR-004', 'CAR-001', 'CAR-002', 'CAR-003'])
    expect(caravanas({ orden: 'gmd-asc' })).toEqual(['CAR-002', 'CAR-001', 'CAR-004', 'CAR-003'])
    expect(caravanas({ orden: 'peso-desc' })[0]).toBe('CAR-002')
    // CAR-003 y CAR-004 empatan en 250 kg: el orden estable los deja por caravana.
    expect(caravanas({ orden: 'peso-asc' })).toEqual(['CAR-003', 'CAR-004', 'CAR-001', 'CAR-002'])
  })

  it('filasDeAnimalesParaExportar devuelve filas ya filtradas', () => {
    const filas = filasDeAnimalesParaExportar(ANIMALES, { ...FILTROS, raza: '1', estadoSalida: 'activos' })

    expect(filas.map((fila) => fila.caravana)).toEqual(['CAR-001', 'CAR-003'])
  })
})

describe('filtrosInicialesDeExportacion', () => {
  const PANTALLA = { ...FILTROS, estadoSalida: 'activos', raza: '2', gmdMin: '0,8' }

  it('copia los filtros de la pantalla', () => {
    const iniciales = filtrosInicialesDeExportacion({ ...PANTALLA, orden: { campo: 'aniCaravana', direccion: 'asc' } })

    expect(iniciales).toMatchObject({ estadoSalida: 'activos', raza: '2', gmdMin: '0,8', orden: 'caravana' })
  })

  it('conserva el orden de la pantalla si es por GMD o peso, y si no vuelve a caravana', () => {
    expect(filtrosInicialesDeExportacion({ ...PANTALLA, orden: { campo: 'gmd', direccion: 'desc' } }).orden).toBe('gmd-desc')
    expect(filtrosInicialesDeExportacion({ ...PANTALLA, orden: { campo: 'pesoActual', direccion: 'asc' } }).orden).toBe('peso-asc')
    expect(filtrosInicialesDeExportacion({ ...PANTALLA, orden: { campo: 'lote', direccion: 'asc' } }).orden).toBe('caravana')
  })

  it('los valores por defecto de la pantalla sirven tal cual', () => {
    const iniciales = filtrosInicialesDeExportacion({ ...FILTROS_POR_DEFECTO, orden: { campo: 'aniCaravana', direccion: 'asc' } })

    expect(iniciales.busqueda).toBe('')
    expect(iniciales.estadoSalida).toBe('activos')
  })
})

describe('describirFiltrosAnimales', () => {
  it('sin filtros que filtren, no hay ninguno (el archivo dirá "Sin filtros")', () => {
    expect(describirFiltrosAnimales(FILTROS, OPCIONES)).toEqual([])
  })

  it('describe cada filtro con su etiqueta y el nombre legible', () => {
    const lineas = describirFiltrosAnimales(
      {
        busqueda: ' CAR ',
        estadoSalida: 'activos',
        lote: '10',
        raza: '2',
        proveedor: 'sin-proveedor',
        estado: 'aptos',
        gmdMin: '0,8',
        gmdMax: '1,5',
        orden: 'gmd-desc',
      },
      OPCIONES,
    )

    expect(lineas).toEqual([
      { etiqueta: 'Caravana', valor: 'CAR' },
      { etiqueta: 'Estado de salida', valor: 'Activos' },
      { etiqueta: 'Lote', valor: 'Lote A — Cría' },
      { etiqueta: 'Raza', valor: 'Nelore' },
      { etiqueta: 'Proveedor', valor: 'Sin proveedor' },
      { etiqueta: 'Aptitud', valor: 'Aptos para venta' },
      { etiqueta: 'GMD mínima', valor: '0,8' },
      { etiqueta: 'GMD máxima', valor: '1,5' },
      { etiqueta: 'Orden', valor: 'GMD, de mayor a menor' },
    ])
  })

  it('un proveedor y "sin lote" se nombran bien', () => {
    const lineas = describirFiltrosAnimales({ ...FILTROS, proveedor: '4', lote: 'sin-lote' }, OPCIONES)

    expect(lineas).toEqual([
      { etiqueta: 'Lote', valor: 'Sin lote' },
      { etiqueta: 'Proveedor', valor: 'Pedro Vera' },
    ])
  })
})

describe('totalesDeAnimales', () => {
  it('trae el total, los activos, el peso actual promedio y la GMD promedio (solo de los que tienen GMD)', () => {
    const filas = filasDeAnimalesParaExportar(ANIMALES, FILTROS)

    expect(totalesDeAnimales(filas)).toMatchObject([
      { etiqueta: 'Animales', valor: '4', numero: 4 },
      { etiqueta: 'Activos', valor: '3', numero: 3 },
      { etiqueta: 'Peso actual promedio', numero: 312.5, decimales: 1, unidad: 'kg', valor: '312,5 kg' },
      // CAR-003 no tiene GMD: (1,5 + 0,5 + 2,2) / 3.
      { etiqueta: 'GMD promedio', numero: (1.5 + 0.5 + 2.2) / 3, decimales: 3, unidad: 'kg/día', valor: '1,400 kg/día' },
    ])
  })

  it('sin animales: cero y promedios en "—"', () => {
    expect(totalesDeAnimales([])).toMatchObject([
      { valor: '0', numero: 0 },
      { valor: '0', numero: 0 },
      { valor: '—', numero: null },
      { valor: '—', numero: null },
    ])
  })
})
