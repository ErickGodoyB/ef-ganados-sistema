/**
 * Lo propio de la exportación del listado de sesiones de pesaje: columnas,
 * armado de filas, filtros del modal (búsqueda, lote e intervalo de fechas,
 * aplicados con filtrarYOrdenarSesiones, el mismo filtrado del listado), su
 * descripción para el encabezado y el resumen (total de sesiones y de
 * animales pesados).
 */

import { calcularCodigoSesion } from '../../utilidades/codigoSesion'
import { formatearFechaIso, formatearNumero } from '../../utilidades/exportacion/formatos'
import { filtrarYOrdenarSesiones } from './listadoSesiones'

/**
 * Columnas exportables, con la clave de la misma columna en el listado
 * ("claveListado", ver columnas.js) para marcar de entrada las que la
 * pantalla muestra. Fecha y Lote son obligatorias en el listado, así que
 * siempre arrancan marcadas.
 */
const DEFINICION_COLUMNAS = [
  { clave: 'codigo', titulo: 'Sesión', tipo: 'texto', alineacion: 'izquierda', claveListado: 'codigo' },
  { clave: 'fecha', titulo: 'Fecha', tipo: 'fecha', alineacion: 'centro', obligatoria: true },
  { clave: 'lote', titulo: 'Lote', tipo: 'texto', alineacion: 'izquierda', obligatoria: true },
  { clave: 'animales', titulo: 'Animales', tipo: 'entero', alineacion: 'centro', claveListado: 'cantidad' },
  { clave: 'pesoTotal', titulo: 'Peso total (kg)', tipo: 'numero', decimales: 1, alineacion: 'centro', claveListado: 'total' },
  { clave: 'promedio', titulo: 'Promedio (kg)', tipo: 'numero', decimales: 1, alineacion: 'centro', claveListado: 'promedio' },
  { clave: 'minimo', titulo: 'Mínimo (kg)', tipo: 'numero', decimales: 1, alineacion: 'centro', claveListado: 'minimo' },
  { clave: 'maximo', titulo: 'Máximo (kg)', tipo: 'numero', decimales: 1, alineacion: 'centro', claveListado: 'maximo' },
]

/** Columnas con "porDefecto": marcadas las que el listado muestra ahora (y las obligatorias). */
export function columnasSesionesParaExportar(columnasVisibles) {
  return DEFINICION_COLUMNAS.map(({ claveListado, obligatoria, ...columna }) => ({
    ...columna,
    porDefecto: Boolean(obligatoria) || (claveListado != null && Boolean(columnasVisibles[claveListado])),
  }))
}

/** "Lote — Grupo", o "Sin lote". */
function textoLote(sesion) {
  if (!sesion.subGrupoDescripcion) {
    return 'Sin lote'
  }
  return sesion.grupoDescripcion ? `${sesion.subGrupoDescripcion} — ${sesion.grupoDescripcion}` : sesion.subGrupoDescripcion
}

/** Una fila de exportación a partir de una sesión del resumen. */
export function filaDeSesion(sesion) {
  return {
    codigo: calcularCodigoSesion(sesion.fecha, sesion.subGrupoId),
    fecha: sesion.fecha,
    lote: textoLote(sesion),
    animales: sesion.cantidad,
    pesoTotal: sesion.total,
    promedio: sesion.promedio,
    minimo: sesion.minimo,
    maximo: sesion.maximo,
  }
}

/** Filtros iniciales del modal: los de la pantalla (búsqueda, lote y el intervalo desde/hasta). */
export function filtrosInicialesSesiones({ busqueda, lote, desde, hasta }) {
  return { busqueda, lote, desde, hasta }
}

/** Sesiones que cumplen los filtros del modal, como filas de exportación, de la más reciente a la más antigua (el orden del listado). */
export function filasDeSesionesParaExportar(sesiones, filtros) {
  return filtrarYOrdenarSesiones(sesiones, { ...filtros, orden: { campo: 'fecha', direccion: 'desc' } }).map(filaDeSesion)
}

/**
 * Los filtros aplicados, para el encabezado del archivo (solo los que
 * filtran algo). El nombre del lote sale de las opciones ofrecidas.
 *
 * @param {{valor: string, etiqueta: string}[]} lotes
 */
export function describirFiltrosSesiones(filtros, lotes) {
  const lineas = []
  if (filtros.busqueda.trim() !== '') {
    lineas.push({ etiqueta: 'Búsqueda', valor: filtros.busqueda.trim() })
  }
  if (filtros.lote !== 'todos') {
    lineas.push({
      etiqueta: 'Lote',
      valor: filtros.lote === 'sin-lote' ? 'Sin lote' : (lotes.find((opcion) => opcion.valor === filtros.lote)?.etiqueta ?? filtros.lote),
    })
  }
  if (filtros.desde) {
    lineas.push({ etiqueta: 'Desde', valor: formatearFechaIso(filtros.desde) })
  }
  if (filtros.hasta) {
    lineas.push({ etiqueta: 'Hasta', valor: formatearFechaIso(filtros.hasta) })
  }
  return lineas
}

/** Resumen de la cabecera: total de sesiones y de animales pesados (suma de los de cada sesión). */
export function resumenDeSesiones(filas) {
  const animales = filas.reduce((suma, fila) => suma + (fila.animales ?? 0), 0)
  return [
    { etiqueta: 'Sesiones', valor: formatearNumero(filas.length, 0) },
    { etiqueta: 'Animales pesados', valor: formatearNumero(animales, 0) },
  ]
}
