/**
 * Lo propio de la exportación del detalle de una sesión de pesaje: columnas,
 * armado de filas (con los días y la diferencia contra el peso anterior), el
 * contexto de la sesión para la línea de filtros y el resumen. Exporta los
 * animales de esa sesión, sin filtros.
 */

import { calcularCodigoSesion } from '../../utilidades/codigoSesion'
import { formatearNumero, formatearFechaIso, totalNumerico, totalTexto } from '../../utilidades/exportacion/formatos'
import { diasEntreFechas } from '../../utilidades/fechas'
import { calcularDiferenciaPeso } from '../../utilidades/peso'
import { calcularGmdPromedioSesion, calcularResumenPesos } from '../../utilidades/resumenSesion'
import { mostrarPorProveedor, resumenPorProveedor } from './porProveedorSesion'

export const COLUMNAS_DETALLE_SESION = [
  { clave: 'caravana', titulo: 'Caravana', tipo: 'texto', alineacion: 'izquierda', porDefecto: true },
  { clave: 'raza', titulo: 'Raza', tipo: 'texto', alineacion: 'izquierda', porDefecto: true },
  { clave: 'proveedor', titulo: 'Proveedor', tipo: 'texto', alineacion: 'izquierda', porDefecto: true },
  { clave: 'peso', titulo: 'Peso (kg)', tipo: 'numero', decimales: 1, alineacion: 'centro', porDefecto: true },
  { clave: 'pesoIngreso', titulo: 'Peso de ingreso (kg)', tipo: 'numero', decimales: 1, alineacion: 'centro', porDefecto: false },
  { clave: 'pesoAnterior', titulo: 'Peso anterior (kg)', tipo: 'numero', decimales: 1, alineacion: 'centro', porDefecto: true },
  { clave: 'fechaPesoAnterior', titulo: 'Fecha del peso anterior', tipo: 'fecha', alineacion: 'centro', porDefecto: true },
  { clave: 'dias', titulo: 'Días', tipo: 'entero', alineacion: 'centro', porDefecto: true },
  { clave: 'diferencia', titulo: 'Diferencia (kg)', tipo: 'numero', decimales: 1, alineacion: 'centro', porDefecto: true },
  { clave: 'gmd', titulo: 'GMD (kg/día)', tipo: 'numero', decimales: 3, alineacion: 'centro', porDefecto: true },
  { clave: 'responsable', titulo: 'Responsable', tipo: 'texto', alineacion: 'izquierda', porDefecto: true },
  { clave: 'observaciones', titulo: 'Observaciones', tipo: 'texto', alineacion: 'izquierda', porDefecto: true },
]

/**
 * Una fila de exportación a partir de un pesaje del detalle. Los días son los
 * transcurridos entre el peso anterior (el pesaje previo o, si no hay, el
 * ingreso) y la fecha de la sesión.
 *
 * @param {object} item Pesaje del detalle (GET /api/pesajes/sesiones/detalle).
 * @param {string} fechaIso Fecha de la sesión, aaaa-mm-dd.
 */
export function filaDeItemSesion(item, fechaIso) {
  return {
    caravana: item.caravana,
    raza: item.razaDescripcion,
    proveedor: item.proveedorNombre || 'Sin proveedor',
    peso: item.peso,
    pesoIngreso: item.pesoIngreso,
    pesoAnterior: item.pesoAnterior,
    fechaPesoAnterior: item.fechaPesoAnterior,
    dias: diasEntreFechas(item.fechaPesoAnterior, fechaIso),
    diferencia: calcularDiferenciaPeso(item.peso, item.pesoAnterior),
    gmd: item.gmd,
    responsable: item.responsableNombre,
    observaciones: item.observaciones,
  }
}

export function filasDeDetalleSesion(items, fechaIso) {
  return items.map((item) => filaDeItemSesion(item, fechaIso))
}

/** "Lote — Grupo", o "Sin lote". */
function textoLote(sesion) {
  if (!sesion.subGrupoDescripcion) {
    return 'Sin lote'
  }
  return sesion.grupoDescripcion ? `${sesion.subGrupoDescripcion} — ${sesion.grupoDescripcion}` : sesion.subGrupoDescripcion
}

/** Contexto de la sesión, en la línea chica bajo el título: "Sesión S-AAMMDD-N · Lote X · Fecha dd/mm/aaaa". */
export function contextoDeSesion(sesion, fechaIso) {
  return [
    { etiqueta: 'Sesión', valor: calcularCodigoSesion(fechaIso, sesion.subGrupoId) },
    { etiqueta: 'Lote', valor: textoLote(sesion) },
    { etiqueta: 'Fecha', valor: formatearFechaIso(fechaIso) },
  ]
}

/** Texto de un proveedor del bloque "Por proveedor" para el cuadro de totales: animales, peso promedio, diferencia promedio y GMD promedio. */
function textoDeProveedor(fila) {
  const partes = [
    `${formatearNumero(fila.animales, 0)} ${fila.animales === 1 ? 'animal' : 'animales'}`,
    `peso promedio ${formatearNumero(fila.pesoPromedio, 1)} kg`,
    `diferencia promedio ${fila.diferenciaPromedio == null ? '—' : `${formatearNumero(fila.diferenciaPromedio, 1)} kg`}`,
    `GMD promedio ${fila.gmdPromedio == null ? '—' : `${formatearNumero(fila.gmdPromedio, 3)} kg/día`}`,
  ]
  return fila.mejor ? `${partes.join(', ')} (mejor GMD)` : partes.join(', ')
}

/**
 * Totales del cuadro final: animales, peso promedio, mínimo, máximo y GMD
 * promedio (los mismos del detalle) y, si los animales de la sesión son de 2
 * o más proveedores, una entrada "Proveedor X" por cada uno (el bloque "Por
 * proveedor" de la pantalla).
 */
export function totalesDeDetalleSesion(items) {
  const pesos = calcularResumenPesos(items.map((item) => item.peso))
  const { gmdPromedio } = calcularGmdPromedioSesion(items.map((item) => item.gmd))
  const totales = [
    totalNumerico('Animales', pesos.cantidad),
    totalNumerico('Peso promedio', pesos.promedio, { decimales: 1, unidad: 'kg' }),
    totalNumerico('Mínimo', pesos.minimo, { decimales: 1, unidad: 'kg' }),
    totalNumerico('Máximo', pesos.maximo, { decimales: 1, unidad: 'kg' }),
    totalNumerico('GMD promedio', gmdPromedio, { decimales: 3, unidad: 'kg/día' }),
  ]
  const porProveedor = resumenPorProveedor(items)
  if (mostrarPorProveedor(porProveedor)) {
    totales.push(...porProveedor.map((fila) => totalTexto(`Proveedor ${fila.nombre}`, textoDeProveedor(fila))))
  }
  return totales
}
