import { describe, expect, it } from 'vitest'
import { contextoDeAnimal, filasDeHistorial } from './animales/exportacionHistorial'
import {
  contextoDeSesion,
  filaDeItemSesion,
  filasDeDetalleSesion,
  resumenDeDetalleSesion,
} from './pesajes/exportacionDetalleSesion'
import {
  columnasSesionesParaExportar,
  describirFiltrosSesiones,
  filaDeSesion,
  filasDeSesionesParaExportar,
  filtrosInicialesSesiones,
  resumenDeSesiones,
} from './pesajes/exportacionSesiones'
import {
  contextoDeProveedor,
  describirFiltrosRanking,
  filaDeAnimalProveedor,
  filasDeRanking,
} from './reportes/exportacionProveedores'
import {
  contextoDeTransferencia,
  describirFiltrosTransferencias,
  filaDeAnimalTransferencia,
  filaDeTransferencia,
  filasDeTransferenciasParaExportar,
  filtrosInicialesTransferencias,
} from './transferencias/exportacionTransferencias'

// ---- sesiones de pesaje (listado) ----

const SESIONES = [
  { fecha: '2026-03-10', subGrupoId: 3, subGrupoDescripcion: 'Lote A', grupoDescripcion: 'Cría', cantidad: 12, total: 3600, promedio: 300, minimo: 250, maximo: 350 },
  { fecha: '2026-03-20', subGrupoId: null, subGrupoDescripcion: null, grupoDescripcion: null, cantidad: 8, total: 2000, promedio: 250, minimo: 200, maximo: 300 },
  { fecha: '2026-02-01', subGrupoId: 4, subGrupoDescripcion: 'Lote B', grupoDescripcion: null, cantidad: 5, total: 1000, promedio: 200, minimo: 180, maximo: 220 },
]
const FILTROS_SESIONES = { busqueda: '', lote: 'todos', desde: '', hasta: '' }

describe('exportación de sesiones de pesaje', () => {
  it('trae las 8 columnas del listado y marca las que la pantalla muestra (fecha y lote siempre)', () => {
    const todas = columnasSesionesParaExportar({})
    expect(todas.map((columna) => columna.clave)).toEqual([
      'codigo',
      'fecha',
      'lote',
      'animales',
      'pesoTotal',
      'promedio',
      'minimo',
      'maximo',
    ])
    expect(todas.filter((columna) => columna.porDefecto).map((columna) => columna.clave)).toEqual(['fecha', 'lote'])
    const visibles = columnasSesionesParaExportar({ codigo: true, cantidad: true, total: true, promedio: true, minimo: true, maximo: true })
    expect(visibles.every((columna) => columna.porDefecto)).toBe(true)
  })

  it('arma la fila con el código de sesión y el lote con su grupo (o "Sin lote")', () => {
    expect(filaDeSesion(SESIONES[0])).toEqual({
      codigo: 'S-260310-3',
      fecha: '2026-03-10',
      lote: 'Lote A — Cría',
      animales: 12,
      pesoTotal: 3600,
      promedio: 300,
      minimo: 250,
      maximo: 350,
    })
    expect(filaDeSesion(SESIONES[1]).lote).toBe('Sin lote')
    expect(filaDeSesion(SESIONES[2]).lote).toBe('Lote B')
  })

  it('filtra por búsqueda, lote e intervalo (mismo filtrado que el listado), de la más reciente a la más antigua', () => {
    const fechas = (filtros) => filasDeSesionesParaExportar(SESIONES, { ...FILTROS_SESIONES, ...filtros }).map((fila) => fila.fecha)

    expect(fechas({})).toEqual(['2026-03-20', '2026-03-10', '2026-02-01'])
    expect(fechas({ lote: 'sin-lote' })).toEqual(['2026-03-20'])
    expect(fechas({ lote: '3' })).toEqual(['2026-03-10'])
    expect(fechas({ busqueda: 'lote b' })).toEqual(['2026-02-01'])
    expect(fechas({ desde: '2026-03-01' })).toEqual(['2026-03-20', '2026-03-10'])
    expect(fechas({ desde: '2026-03-01', hasta: '2026-03-15' })).toEqual(['2026-03-10'])
  })

  it('los filtros iniciales son los de la pantalla', () => {
    expect(filtrosInicialesSesiones({ busqueda: 'a', lote: '3', desde: '2026-03-01', hasta: '', otro: 1 })).toEqual({
      busqueda: 'a',
      lote: '3',
      desde: '2026-03-01',
      hasta: '',
    })
  })

  it('describe solo los filtros que filtran algo, con fechas dd/mm/aaaa', () => {
    const lotes = [{ valor: '3', etiqueta: 'Lote A — Cría' }]

    expect(describirFiltrosSesiones(FILTROS_SESIONES, lotes)).toEqual([])
    expect(describirFiltrosSesiones({ busqueda: ' rec ', lote: '3', desde: '2026-03-01', hasta: '2026-03-15' }, lotes)).toEqual([
      { etiqueta: 'Búsqueda', valor: 'rec' },
      { etiqueta: 'Lote', valor: 'Lote A — Cría' },
      { etiqueta: 'Desde', valor: '01/03/2026' },
      { etiqueta: 'Hasta', valor: '15/03/2026' },
    ])
    expect(describirFiltrosSesiones({ ...FILTROS_SESIONES, lote: 'sin-lote' }, lotes)).toEqual([{ etiqueta: 'Lote', valor: 'Sin lote' }])
  })

  it('el resumen trae el total de sesiones y de animales pesados', () => {
    const filas = filasDeSesionesParaExportar(SESIONES, FILTROS_SESIONES)

    expect(resumenDeSesiones(filas)).toEqual([
      { etiqueta: 'Sesiones', valor: '3' },
      { etiqueta: 'Animales pesados', valor: '25' },
    ])
    expect(resumenDeSesiones([])).toEqual([
      { etiqueta: 'Sesiones', valor: '0' },
      { etiqueta: 'Animales pesados', valor: '0' },
    ])
  })
})

// ---- detalle de una sesión ----

const ITEMS = [
  {
    caravana: 'CAR-001',
    razaDescripcion: 'Brangus',
    peso: 260,
    pesoAnterior: 250,
    gmd: 1,
    fechaPesoAnterior: '2026-03-01',
    responsableNombre: 'Ana',
    observaciones: 'Ok',
  },
  {
    caravana: 'CAR-002',
    razaDescripcion: 'Nelore',
    peso: 300,
    pesoAnterior: 200,
    gmd: null,
    fechaPesoAnterior: '2026-03-10',
    responsableNombre: 'Ana',
    observaciones: null,
  },
]

describe('exportación del detalle de una sesión', () => {
  it('la fila trae los días y la diferencia contra el peso anterior', () => {
    expect(filaDeItemSesion(ITEMS[0], '2026-03-11')).toEqual({
      caravana: 'CAR-001',
      raza: 'Brangus',
      peso: 260,
      pesoAnterior: 250,
      fechaPesoAnterior: '2026-03-01',
      dias: 10,
      diferencia: 10,
      gmd: 1,
      responsable: 'Ana',
      observaciones: 'Ok',
    })
    expect(filasDeDetalleSesion(ITEMS, '2026-03-11')).toHaveLength(2)
  })

  it('sin peso anterior, los días y la diferencia quedan vacíos', () => {
    const fila = filaDeItemSesion({ ...ITEMS[0], pesoAnterior: null, fechaPesoAnterior: null }, '2026-03-11')

    expect(fila.dias).toBeNull()
    expect(fila.diferencia).toBeNull()
  })

  it('el contexto dice la sesión, el lote y la fecha', () => {
    expect(contextoDeSesion(SESIONES[0], '2026-03-10')).toEqual([
      { etiqueta: 'Sesión', valor: 'S-260310-3' },
      { etiqueta: 'Lote', valor: 'Lote A — Cría' },
      { etiqueta: 'Fecha', valor: '10/03/2026' },
    ])
    expect(contextoDeSesion(SESIONES[1], '2026-03-20')[1]).toEqual({ etiqueta: 'Lote', valor: 'Sin lote' })
  })

  it('el resumen trae cantidad, promedio, mínimo, máximo y GMD promedio (solo de los que tienen GMD)', () => {
    expect(resumenDeDetalleSesion(ITEMS)).toEqual([
      { etiqueta: 'Animales', valor: '2' },
      { etiqueta: 'Peso promedio', valor: '280,0 kg' },
      { etiqueta: 'Mínimo', valor: '260,0 kg' },
      { etiqueta: 'Máximo', valor: '300,0 kg' },
      { etiqueta: 'GMD promedio', valor: '1,000 kg/día' },
    ])
  })

  it('sin ninguna GMD, el resumen dice "—"', () => {
    expect(resumenDeDetalleSesion([{ ...ITEMS[1] }]).at(-1)).toEqual({ etiqueta: 'GMD promedio', valor: '—' })
  })
})

// ---- transferencias ----

const TRANSFERENCIAS = [
  {
    traId: 3,
    fecha: '2026-03-20',
    motivo: 'DEVOLUCION',
    cantidadAnimales: 2,
    origenes: ['Lote B'],
    destinos: ['Lote A'],
    responsableNombre: 'Ana Pérez',
    devuelta: false,
    nota: null,
  },
  {
    traId: 2,
    fecha: '2026-03-10',
    motivo: 'SELECCION',
    cantidadAnimales: 5,
    origenes: ['Lote A', 'Sin lote'],
    destinos: ['Lote B'],
    responsableNombre: 'Juan Gómez',
    devuelta: true,
    nota: 'Los más pesados',
  },
  {
    traId: 1,
    fecha: '2026-02-01',
    motivo: 'SANITARIO',
    cantidadAnimales: 1,
    origenes: ['Lote A'],
    destinos: ['Lote C'],
    responsableNombre: 'Ana Pérez',
    devuelta: false,
    nota: 'Aislamiento',
  },
]
const FILTROS_TRANSFERENCIAS = { busqueda: '', desde: '', hasta: '', motivo: 'todos' }

describe('exportación de transferencias', () => {
  it('arma la fila con el motivo legible, los lotes unidos y devuelta como sí/no', () => {
    expect(filaDeTransferencia(TRANSFERENCIAS[1])).toEqual({
      fecha: '2026-03-10',
      motivo: 'Selección',
      animales: 5,
      origen: 'Lote A, Sin lote',
      destino: 'Lote B',
      responsable: 'Juan Gómez',
      devuelta: true,
      nota: 'Los más pesados',
    })
  })

  it('filtra por búsqueda, intervalo y motivo', () => {
    const ids = (filtros) =>
      filasDeTransferenciasParaExportar(TRANSFERENCIAS, { ...FILTROS_TRANSFERENCIAS, ...filtros }).map((fila) => fila.fecha)

    expect(ids({})).toEqual(['2026-03-20', '2026-03-10', '2026-02-01'])
    expect(ids({ busqueda: 'ana' })).toEqual(['2026-03-20', '2026-02-01'])
    expect(ids({ desde: '2026-03-01' })).toEqual(['2026-03-20', '2026-03-10'])
    expect(ids({ hasta: '2026-03-10' })).toEqual(['2026-03-10', '2026-02-01'])
    expect(ids({ motivo: 'SANITARIO' })).toEqual(['2026-02-01'])
    expect(ids({ busqueda: 'ana', motivo: 'DEVOLUCION', desde: '2026-03-01' })).toEqual(['2026-03-20'])
  })

  it('los filtros iniciales toman búsqueda e intervalo de la pantalla y el motivo en "todos"', () => {
    expect(filtrosInicialesTransferencias({ busqueda: 'x', desde: '2026-03-01', hasta: '' })).toEqual({
      busqueda: 'x',
      desde: '2026-03-01',
      hasta: '',
      motivo: 'todos',
    })
  })

  it('describe solo los filtros que filtran algo', () => {
    expect(describirFiltrosTransferencias(FILTROS_TRANSFERENCIAS)).toEqual([])
    expect(
      describirFiltrosTransferencias({ busqueda: 'ana', desde: '2026-03-01', hasta: '2026-03-31', motivo: 'DEVOLUCION' }),
    ).toEqual([
      { etiqueta: 'Búsqueda', valor: 'ana' },
      { etiqueta: 'Desde', valor: '01/03/2026' },
      { etiqueta: 'Hasta', valor: '31/03/2026' },
      { etiqueta: 'Motivo', valor: 'Devolución' },
    ])
  })

  it('el detalle: fila por animal (sigue en destino como sí/no) y contexto de la transferencia', () => {
    expect(
      filaDeAnimalTransferencia({ caravana: 'CAR-1', razaDescripcion: 'Brangus', origen: 'Lote A', destino: 'Lote B', enDestino: true }),
    ).toEqual({ caravana: 'CAR-1', raza: 'Brangus', origen: 'Lote A', destino: 'Lote B', sigueEnDestino: true })
    expect(contextoDeTransferencia(TRANSFERENCIAS[1])).toEqual([
      { etiqueta: 'Transferencia', valor: 'n.º 2' },
      { etiqueta: 'Fecha', valor: '10/03/2026' },
      { etiqueta: 'Motivo', valor: 'Selección' },
      { etiqueta: 'Responsable', valor: 'Juan Gómez' },
    ])
  })
})

// ---- reporte de proveedores ----

const RANKING = [
  { proveedorId: 5, proveedorNombre: 'Beto Beta', cantidadAnimales: 2, animalesConDatos: 2, gmdPromedio: 3.5, gananciaPromedioKg: 60, mejorAnimalCaravana: 'B2', mejorAnimalGmd: 5 },
  { proveedorId: 6, proveedorNombre: 'Carla Cero', cantidadAnimales: 1, animalesConDatos: 0, gmdPromedio: null, gananciaPromedioKg: null, mejorAnimalCaravana: null, mejorAnimalGmd: null },
  { proveedorId: null, proveedorNombre: 'Sin proveedor', cantidadAnimales: 2, animalesConDatos: 1, gmdPromedio: 2, gananciaPromedioKg: 10, mejorAnimalCaravana: 'S1', mejorAnimalGmd: 2 },
]

describe('exportación del reporte por proveedor', () => {
  it('el ranking mantiene el orden, numera a los proveedores y deja "Sin proveedor" sin posición', () => {
    const filas = filasDeRanking(RANKING)

    expect(filas.map((fila) => fila.posicion)).toEqual([1, 2, null])
    expect(filas[0]).toEqual({
      posicion: 1,
      proveedor: 'Beto Beta',
      animales: 2,
      conDatos: 2,
      gmdPromedio: 3.5,
      gananciaPromedio: 60,
      mejorAnimal: 'B2',
      mejorAnimalGmd: 5,
    })
    expect(filas[1].gmdPromedio).toBeNull()
  })

  it('"Solo animales activos" va como filtro aplicado (Sí o No)', () => {
    expect(describirFiltrosRanking(true)).toEqual([{ etiqueta: 'Solo animales activos', valor: 'Sí' }])
    expect(describirFiltrosRanking(false)).toEqual([{ etiqueta: 'Solo animales activos', valor: 'No' }])
  })

  it('la fila de un animal del proveedor usa "Sin lote" y el estado en texto', () => {
    const fila = filaDeAnimalProveedor(
      {
        caravana: 'B1',
        razaDescripcion: 'Nelore',
        loteDescripcion: null,
        aniFechaIngreso: '2026-01-05',
        aniPesoInicial: 180,
        pesoActual: 200,
        gananciaKg: 20,
        gmdAcumulado: null,
        estado: 'MUERTE',
      },
      (estado) => (estado === 'MUERTE' ? 'Muerte' : estado),
    )

    expect(fila).toEqual({
      caravana: 'B1',
      raza: 'Nelore',
      lote: 'Sin lote',
      ingreso: '2026-01-05',
      pesoInicial: 180,
      pesoActual: 200,
      ganancia: 20,
      gmd: null,
      estado: 'Muerte',
    })
  })

  it('el contexto de un proveedor trae su nombre y si se tomaron solo los activos', () => {
    expect(contextoDeProveedor('Beto Beta', true)).toEqual([
      { etiqueta: 'Proveedor', valor: 'Beto Beta' },
      { etiqueta: 'Solo animales activos', valor: 'Sí' },
    ])
  })
})

// ---- historial de pesajes del animal ----

describe('exportación del historial de pesajes', () => {
  const ANIMAL = { aniCaravana: 'CAR-001', razaDescripcion: 'Brangus', subGrupoId: 3, aniFechaIngreso: '2026-01-01', aniPesoInicial: 200 }
  const PESAJES = [
    { fecha: '2026-01-11', peso: 220, pesoAnterior: 200, fechaPesoAnterior: '2026-01-01', gmd: 2, responsableNombre: 'Ana', observaciones: null },
    { fecha: '2026-01-31', peso: 250, pesoAnterior: 220, fechaPesoAnterior: '2026-01-11', gmd: 1.5, responsableNombre: 'Juan', observaciones: 'Ok' },
  ]

  it('empieza por el ingreso y sigue en orden cronológico, con días, diferencia y código de sesión', () => {
    const filas = filasDeHistorial(ANIMAL, PESAJES)

    expect(filas).toHaveLength(3)
    expect(filas[0]).toMatchObject({ fecha: '2026-01-01', sesion: 'Ingreso', peso: 200, pesoAnterior: null, dias: null, gmd: null })
    expect(filas[1]).toMatchObject({
      fecha: '2026-01-11',
      sesion: 'S-260111-3',
      peso: 220,
      pesoAnterior: 200,
      dias: 10,
      diferencia: 20,
      gmd: 2,
      responsable: 'Ana',
    })
    expect(filas[2]).toMatchObject({ fecha: '2026-01-31', dias: 20, diferencia: 30, observaciones: 'Ok' })
  })

  it('un animal sin pesajes exporta solo el ingreso', () => {
    expect(filasDeHistorial(ANIMAL, [])).toHaveLength(1)
  })

  it('el contexto es la caravana y la raza', () => {
    expect(contextoDeAnimal(ANIMAL)).toEqual([
      { etiqueta: 'Animal', valor: 'CAR-001' },
      { etiqueta: 'Raza', valor: 'Brangus' },
    ])
  })
})
