/**
 * Lo propio de la exportación del historial de pesajes de un animal (en su
 * detalle): columnas y filas, en orden cronológico (primero el ingreso, que
 * es el punto de partida) y la caravana como contexto. Sin filtros.
 */

import { calcularCodigoSesion } from '../../utilidades/codigoSesion'
import { totalNumerico } from '../../utilidades/exportacion/formatos'
import { diasEntreFechas } from '../../utilidades/fechas'
import { calcularDiferenciaPeso } from '../../utilidades/peso'

export const COLUMNAS_HISTORIAL = [
  { clave: 'fecha', titulo: 'Fecha', tipo: 'fecha', alineacion: 'centro', porDefecto: true },
  { clave: 'sesion', titulo: 'Sesión', tipo: 'texto', alineacion: 'izquierda', porDefecto: true },
  { clave: 'peso', titulo: 'Peso (kg)', tipo: 'numero', decimales: 1, alineacion: 'centro', porDefecto: true },
  { clave: 'pesoAnterior', titulo: 'Peso anterior (kg)', tipo: 'numero', decimales: 1, alineacion: 'centro', porDefecto: true },
  { clave: 'fechaPesoAnterior', titulo: 'Fecha del peso anterior', tipo: 'fecha', alineacion: 'centro', porDefecto: true },
  { clave: 'dias', titulo: 'Días', tipo: 'entero', alineacion: 'centro', porDefecto: true },
  { clave: 'diferencia', titulo: 'Diferencia (kg)', tipo: 'numero', decimales: 1, alineacion: 'centro', porDefecto: true },
  { clave: 'gmd', titulo: 'GMD (kg/día)', tipo: 'numero', decimales: 3, alineacion: 'centro', porDefecto: true },
  { clave: 'responsable', titulo: 'Responsable', tipo: 'texto', alineacion: 'izquierda', porDefecto: true },
  { clave: 'observaciones', titulo: 'Observaciones', tipo: 'texto', alineacion: 'izquierda', porDefecto: false },
]

/**
 * Filas del historial: el ingreso (fecha de ingreso y peso inicial, sin
 * anterior ni GMD) y después cada pesaje activo, del más antiguo al más
 * reciente. El código de sesión usa el lote ACTUAL del animal (igual que la
 * pantalla: no se sabe en qué lote estaba en el momento de cada pesaje).
 *
 * @param {object} animal Animal del resumen.
 * @param {object[]} pesajes Pesajes activos en orden cronológico (GET /api/animales/{id}/pesajes).
 */
export function filasDeHistorial(animal, pesajes) {
  const ingreso = {
    fecha: animal.aniFechaIngreso,
    sesion: 'Ingreso',
    peso: animal.aniPesoInicial,
    pesoAnterior: null,
    fechaPesoAnterior: null,
    dias: null,
    diferencia: null,
    gmd: null,
    responsable: null,
    observaciones: null,
  }
  const filas = pesajes.map((pesaje) => ({
    fecha: pesaje.fecha,
    sesion: calcularCodigoSesion(pesaje.fecha, animal.subGrupoId),
    peso: pesaje.peso,
    pesoAnterior: pesaje.pesoAnterior,
    fechaPesoAnterior: pesaje.fechaPesoAnterior,
    dias: diasEntreFechas(pesaje.fechaPesoAnterior, pesaje.fecha),
    diferencia: calcularDiferenciaPeso(pesaje.peso, pesaje.pesoAnterior),
    gmd: pesaje.gmd,
    responsable: pesaje.responsableNombre,
    observaciones: pesaje.observaciones,
  }))
  return [ingreso, ...filas]
}

/** Contexto del historial, bajo el título: "Animal CAR-001 · Raza Brangus". */
export function contextoDeAnimal(animal) {
  return [
    { etiqueta: 'Animal', valor: animal.aniCaravana },
    { etiqueta: 'Raza', valor: animal.razaDescripcion },
  ]
}

/**
 * Totales del cuadro final: pesajes (sin contar el ingreso), ganancia total y
 * GMD acumulado del animal. Los dos últimos son los del resumen del animal (los
 * calcula el servidor con la regla única del sistema), no se recalculan acá.
 */
export function totalesDeHistorial(animal, pesajes) {
  return [
    totalNumerico('Pesajes', pesajes.length),
    totalNumerico('Ganancia total', animal.gananciaTotal, { decimales: 1, unidad: 'kg' }),
    totalNumerico('GMD acumulado', animal.gmdAcumulado, { decimales: 3, unidad: 'kg/día' }),
  ]
}
