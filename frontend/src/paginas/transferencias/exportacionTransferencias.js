/**
 * Lo propio de la exportación de Transferencias: las columnas y filas del
 * listado (con sus filtros: búsqueda, intervalo de fechas y motivo, aplicados
 * sobre la lista completa), y las del detalle de una transferencia (sus
 * animales, con el contexto de la transferencia en la línea de filtros).
 */

import { formatearFechaIso, totalNumerico } from '../../utilidades/exportacion/formatos'
import { filtrarTransferencias } from './listadoTransferencias'
import { etiquetaMotivoTransferencia, MOTIVOS_ELEGIBLES } from './motivos'

/** Motivos que ofrece el filtro: los elegibles y "Devolución" (que solo genera el sistema, pero existe en el listado). */
export const MOTIVOS_FILTRO = [...MOTIVOS_ELEGIBLES, { valor: 'DEVOLUCION', etiqueta: 'Devolución' }]

// ---- listado ----

export const COLUMNAS_TRANSFERENCIAS = [
  { clave: 'fecha', titulo: 'Fecha', tipo: 'fecha', alineacion: 'centro', porDefecto: true },
  { clave: 'motivo', titulo: 'Motivo', tipo: 'texto', alineacion: 'izquierda', porDefecto: true },
  { clave: 'animales', titulo: 'Animales', tipo: 'entero', alineacion: 'centro', porDefecto: true },
  { clave: 'origen', titulo: 'Origen', tipo: 'texto', alineacion: 'izquierda', porDefecto: true },
  { clave: 'destino', titulo: 'Destino', tipo: 'texto', alineacion: 'izquierda', porDefecto: true },
  { clave: 'responsable', titulo: 'Responsable', tipo: 'texto', alineacion: 'izquierda', porDefecto: true },
  { clave: 'devuelta', titulo: 'Devuelta', tipo: 'booleano', alineacion: 'centro', porDefecto: true },
  { clave: 'nota', titulo: 'Nota', tipo: 'texto', alineacion: 'izquierda', porDefecto: true },
]

/** Una fila de exportación a partir de una transferencia del listado. */
export function filaDeTransferencia(transferencia) {
  return {
    fecha: transferencia.fecha,
    motivo: etiquetaMotivoTransferencia(transferencia.motivo),
    animales: transferencia.cantidadAnimales,
    origen: (transferencia.origenes ?? []).join(', '),
    destino: (transferencia.destinos ?? []).join(', '),
    responsable: transferencia.responsableNombre,
    devuelta: Boolean(transferencia.devuelta),
    nota: transferencia.nota,
  }
}

/** Filtros iniciales del modal: los de la pantalla (búsqueda e intervalo); el motivo arranca en "todos". */
export function filtrosInicialesTransferencias({ busqueda, desde, hasta }) {
  return { busqueda, desde, hasta, motivo: 'todos' }
}

/** Transferencias que cumplen los filtros del modal, como filas de exportación, en el orden recibido (la más reciente primero). */
export function filasDeTransferenciasParaExportar(transferencias, filtros) {
  return filtrarTransferencias(transferencias, filtros.busqueda)
    .filter((transferencia) => !filtros.desde || transferencia.fecha >= filtros.desde)
    .filter((transferencia) => !filtros.hasta || transferencia.fecha <= filtros.hasta)
    .filter((transferencia) => filtros.motivo === 'todos' || transferencia.motivo === filtros.motivo)
    .map(filaDeTransferencia)
}

/** Los filtros aplicados, para el encabezado del archivo (solo los que filtran algo). */
export function describirFiltrosTransferencias(filtros) {
  const lineas = []
  if (filtros.busqueda.trim() !== '') {
    lineas.push({ etiqueta: 'Búsqueda', valor: filtros.busqueda.trim() })
  }
  if (filtros.desde) {
    lineas.push({ etiqueta: 'Desde', valor: formatearFechaIso(filtros.desde) })
  }
  if (filtros.hasta) {
    lineas.push({ etiqueta: 'Hasta', valor: formatearFechaIso(filtros.hasta) })
  }
  if (filtros.motivo !== 'todos') {
    lineas.push({ etiqueta: 'Motivo', valor: etiquetaMotivoTransferencia(filtros.motivo) })
  }
  return lineas
}

// ---- detalle de una transferencia ----

export const COLUMNAS_DETALLE_TRANSFERENCIA = [
  { clave: 'caravana', titulo: 'Caravana', tipo: 'texto', alineacion: 'izquierda', porDefecto: true },
  { clave: 'raza', titulo: 'Raza', tipo: 'texto', alineacion: 'izquierda', porDefecto: true },
  { clave: 'origen', titulo: 'Origen', tipo: 'texto', alineacion: 'izquierda', porDefecto: true },
  { clave: 'destino', titulo: 'Destino', tipo: 'texto', alineacion: 'izquierda', porDefecto: true },
  { clave: 'sigueEnDestino', titulo: 'Sigue en destino', tipo: 'booleano', alineacion: 'centro', porDefecto: true },
]

/** Una fila de exportación a partir de un animal del detalle de la transferencia. */
export function filaDeAnimalTransferencia(animal) {
  return {
    caravana: animal.caravana,
    raza: animal.razaDescripcion,
    origen: animal.origen,
    destino: animal.destino,
    sigueEnDestino: Boolean(animal.enDestino),
  }
}

/** Contexto de la transferencia, bajo el título: "Transferencia n.º 4 · Fecha … · Motivo … · Responsable …". */
export function contextoDeTransferencia(detalle) {
  return [
    { etiqueta: 'Transferencia', valor: `n.º ${detalle.traId}` },
    { etiqueta: 'Fecha', valor: formatearFechaIso(detalle.fecha) },
    { etiqueta: 'Motivo', valor: etiquetaMotivoTransferencia(detalle.motivo) },
    { etiqueta: 'Responsable', valor: detalle.responsableNombre },
  ]
}

/** Totales del cuadro final del listado: transferencias y animales movidos (suma de los de cada una). */
export function totalesDeTransferencias(filas) {
  const animales = filas.reduce((suma, fila) => suma + (fila.animales ?? 0), 0)
  return [totalNumerico('Transferencias', filas.length), totalNumerico('Animales movidos', animales)]
}

/** Totales del cuadro final del detalle: animales de la transferencia y cuántos siguen en el lote de destino. */
export function totalesDeDetalleTransferencia(filas) {
  return [
    totalNumerico('Animales', filas.length),
    totalNumerico('Siguen en el destino', filas.filter((fila) => fila.sigueEnDestino).length),
  ]
}
