/**
 * Lo propio de la exportación del listado de Animales: las columnas
 * disponibles, el armado de las filas, los filtros del modal (y cómo se
 * aplican) y su descripción para el encabezado del archivo. El filtrado y el
 * orden reutilizan filtrarYOrdenarAnimales (el mismo del listado), así que el
 * archivo siempre aplica las mismas reglas que la pantalla.
 */

import { formatearFechaIso } from '../../utilidades/exportacion/formatos'
import { filtrarYOrdenarAnimales } from './listadoAnimales'
import { etiquetaMotivoSalida } from './tiposSalida'

/**
 * Columnas exportables. "claveListado" es la clave de la misma columna en el
 * listado (columnas.js), para marcar de entrada las que la pantalla muestra;
 * las que el listado no tiene (grupo, dueño, peso inicial, apto, comprador)
 * arrancan sin marcar.
 */
const DEFINICION_COLUMNAS = [
  { clave: 'caravana', titulo: 'Caravana', tipo: 'texto', alineacion: 'izquierda', claveListado: 'aniCaravana' },
  { clave: 'raza', titulo: 'Raza', tipo: 'texto', alineacion: 'izquierda', claveListado: 'raza' },
  { clave: 'grupo', titulo: 'Grupo', tipo: 'texto', alineacion: 'izquierda' },
  { clave: 'lote', titulo: 'Lote', tipo: 'texto', alineacion: 'izquierda', claveListado: 'lote' },
  { clave: 'duenio', titulo: 'Dueño', tipo: 'texto', alineacion: 'izquierda' },
  { clave: 'proveedor', titulo: 'Proveedor', tipo: 'texto', alineacion: 'izquierda', claveListado: 'proveedor' },
  { clave: 'ingreso', titulo: 'Ingreso', tipo: 'fecha', alineacion: 'centro', claveListado: 'fechaIngreso' },
  { clave: 'pesoInicial', titulo: 'Peso inicial (kg)', tipo: 'numero', alineacion: 'centro', decimales: 1 },
  { clave: 'pesoActual', titulo: 'Peso actual (kg)', tipo: 'numero', alineacion: 'centro', decimales: 1, claveListado: 'pesoActual' },
  { clave: 'gmd', titulo: 'GMD (kg/día)', tipo: 'numero', alineacion: 'centro', decimales: 3, claveListado: 'gmd' },
  { clave: 'apto', titulo: 'Apto para venta', tipo: 'booleano', alineacion: 'centro' },
  { clave: 'estado', titulo: 'Estado', tipo: 'texto', alineacion: 'izquierda', claveListado: 'estado' },
  { clave: 'comprador', titulo: 'Comprador', tipo: 'texto', alineacion: 'izquierda' },
]

/**
 * Columnas con "porDefecto": marcadas las que el listado tiene visibles ahora
 * (la caravana, que es obligatoria, siempre).
 *
 * @param {Record<string, boolean>} columnasVisibles Visibilidad de las columnas opcionales del listado.
 */
export function columnasParaExportar(columnasVisibles) {
  return DEFINICION_COLUMNAS.map(({ claveListado, ...columna }) => ({
    ...columna,
    porDefecto: claveListado === 'aniCaravana' || (claveListado != null && Boolean(columnasVisibles[claveListado])),
  }))
}

/** Estado en texto: "Activo", o el motivo de salida con su fecha ("Venta el 01/06/2026"). */
function textoEstado(animal) {
  if (animal.aniFechaEgreso == null) {
    return 'Activo'
  }
  const motivo = animal.aniMotivoSalida ? etiquetaMotivoSalida(animal.aniMotivoSalida) : 'Salida'
  return `${motivo} el ${formatearFechaIso(animal.aniFechaEgreso)}`
}

/** Una fila de exportación (valores crudos, un valor por clave de columna) a partir de un animal del resumen. */
export function filaDeAnimal(animal) {
  return {
    caravana: animal.aniCaravana,
    raza: animal.razaDescripcion,
    grupo: animal.grupoDescripcion,
    lote: animal.subGrupoDescripcion,
    duenio: animal.duenioNombre,
    proveedor: animal.proveedorNombre,
    ingreso: animal.aniFechaIngreso,
    pesoInicial: animal.aniPesoInicial,
    pesoActual: animal.pesoActual,
    gmd: animal.gmd,
    apto: animal.aptoVenta,
    estado: textoEstado(animal),
    comprador: animal.compradorNombre,
  }
}

/** Opciones de orden del modal (además del orden por caravana, que es el de siempre). */
export const OPCIONES_ORDEN_EXPORTACION = [
  { valor: 'caravana', etiqueta: 'Caravana', orden: { campo: 'aniCaravana', direccion: 'asc' } },
  { valor: 'gmd-desc', etiqueta: 'GMD, de mayor a menor', orden: { campo: 'gmd', direccion: 'desc' } },
  { valor: 'gmd-asc', etiqueta: 'GMD, de menor a mayor', orden: { campo: 'gmd', direccion: 'asc' } },
  { valor: 'peso-desc', etiqueta: 'Peso actual, de mayor a menor', orden: { campo: 'pesoActual', direccion: 'desc' } },
  { valor: 'peso-asc', etiqueta: 'Peso actual, de menor a mayor', orden: { campo: 'pesoActual', direccion: 'asc' } },
]

/**
 * Filtros iniciales del modal, copiados de los de la pantalla. El orden de la
 * pantalla solo se conserva si es uno de los del modal (GMD o peso, en
 * cualquier dirección); cualquier otro vuelve al orden por caravana.
 */
export function filtrosInicialesDeExportacion({ busqueda, estadoSalida, lote, raza, proveedor, estado, gmdMin, gmdMax, orden }) {
  const coincidente = OPCIONES_ORDEN_EXPORTACION.find(
    (opcion) => opcion.orden.campo === orden?.campo && opcion.orden.direccion === orden?.direccion,
  )
  return {
    busqueda,
    estadoSalida,
    lote,
    raza,
    proveedor,
    estado,
    gmdMin,
    gmdMax,
    orden: coincidente?.valor ?? 'caravana',
  }
}

/** Animales que cumplen los filtros del modal, en su orden (mismo filtrado que el listado). */
export function filtrarAnimalesParaExportar(animales, filtros) {
  const orden = OPCIONES_ORDEN_EXPORTACION.find((opcion) => opcion.valor === filtros.orden)?.orden
  return filtrarYOrdenarAnimales(animales, { ...filtros, orden: orden ?? OPCIONES_ORDEN_EXPORTACION[0].orden })
}

/** Animales que cumplen los filtros del modal, ya como filas de exportación. */
export function filasDeAnimalesParaExportar(animales, filtros) {
  return filtrarAnimalesParaExportar(animales, filtros).map(filaDeAnimal)
}

const ETIQUETAS_SALIDA ={ activos: 'Activos', salidos: 'Salidos' }
const ETIQUETAS_APTITUD = { aptos: 'Aptos para venta', 'no-aptos': 'No aptos' }

/**
 * Los filtros aplicados, para el encabezado del archivo. Solo aparecen los
 * que filtran algo (el estado de salida "Todos" no filtra). Los nombres de
 * lote, raza y proveedor salen de las opciones que se le ofrecieron al
 * usuario.
 *
 * @param {object} filtros Filtros del modal.
 * @param {{lotes: {valor: string, etiqueta: string}[], razas: {valor: string, etiqueta: string}[], proveedores: {valor: string, etiqueta: string}[]}} opciones
 */
export function describirFiltrosAnimales(filtros, { lotes, razas, proveedores }) {
  const buscar = (lista, valor) => lista.find((opcion) => opcion.valor === valor)?.etiqueta ?? valor
  const lineas = []
  if (filtros.busqueda.trim() !== '') {
    lineas.push({ etiqueta: 'Caravana', valor: filtros.busqueda.trim() })
  }
  if (filtros.estadoSalida !== 'todos') {
    lineas.push({ etiqueta: 'Estado de salida', valor: ETIQUETAS_SALIDA[filtros.estadoSalida] })
  }
  if (filtros.lote !== 'todos') {
    lineas.push({ etiqueta: 'Lote', valor: filtros.lote === 'sin-lote' ? 'Sin lote' : buscar(lotes, filtros.lote) })
  }
  if (filtros.raza !== 'todas') {
    lineas.push({ etiqueta: 'Raza', valor: buscar(razas, filtros.raza) })
  }
  if (filtros.proveedor !== 'todos') {
    lineas.push({
      etiqueta: 'Proveedor',
      valor: filtros.proveedor === 'sin-proveedor' ? 'Sin proveedor' : buscar(proveedores, filtros.proveedor),
    })
  }
  if (filtros.estado !== 'todos') {
    lineas.push({ etiqueta: 'Aptitud', valor: ETIQUETAS_APTITUD[filtros.estado] })
  }
  if (filtros.gmdMin.trim() !== '') {
    lineas.push({ etiqueta: 'GMD mínima', valor: filtros.gmdMin.trim() })
  }
  if (filtros.gmdMax.trim() !== '') {
    lineas.push({ etiqueta: 'GMD máxima', valor: filtros.gmdMax.trim() })
  }
  if (filtros.orden !== 'caravana') {
    lineas.push({ etiqueta: 'Orden', valor: OPCIONES_ORDEN_EXPORTACION.find((opcion) => opcion.valor === filtros.orden)?.etiqueta ?? '' })
  }
  return lineas
}
