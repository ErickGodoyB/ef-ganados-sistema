/**
 * Lo propio de la exportación del reporte "Rendimiento por proveedor": el
 * ranking (con "Solo animales activos" como filtro aplicado) y la lista de
 * animales de un proveedor (con el proveedor como contexto).
 */

import { posicionEnRanking } from './rankingProveedores'

// ---- ranking ----

export const COLUMNAS_RANKING = [
  { clave: 'posicion', titulo: 'Posición', tipo: 'entero', alineacion: 'centro', porDefecto: true },
  { clave: 'proveedor', titulo: 'Proveedor', tipo: 'texto', alineacion: 'izquierda', porDefecto: true },
  { clave: 'animales', titulo: 'Animales', tipo: 'entero', alineacion: 'centro', porDefecto: true },
  { clave: 'conDatos', titulo: 'Animales con datos', tipo: 'entero', alineacion: 'centro', porDefecto: true },
  { clave: 'gmdPromedio', titulo: 'GMD promedio (kg/día)', tipo: 'numero', decimales: 3, alineacion: 'centro', porDefecto: true },
  { clave: 'gananciaPromedio', titulo: 'Ganancia promedio (kg)', tipo: 'numero', decimales: 1, alineacion: 'centro', porDefecto: true },
  { clave: 'mejorAnimal', titulo: 'Mejor animal', tipo: 'texto', alineacion: 'izquierda', porDefecto: true },
  { clave: 'mejorAnimalGmd', titulo: 'GMD del mejor animal (kg/día)', tipo: 'numero', decimales: 3, alineacion: 'centro', porDefecto: true },
]

/**
 * Filas del ranking, en el orden recibido (el del servidor). La fila "Sin
 * proveedor" no tiene posición (queda vacía), igual que en pantalla.
 */
export function filasDeRanking(filas) {
  return filas.map((fila, indice) => ({
    posicion: posicionEnRanking(filas, indice),
    proveedor: fila.proveedorNombre,
    animales: fila.cantidadAnimales,
    conDatos: fila.animalesConDatos,
    gmdPromedio: fila.gmdPromedio,
    gananciaPromedio: fila.gananciaPromedioKg,
    mejorAnimal: fila.mejorAnimalCaravana,
    mejorAnimalGmd: fila.mejorAnimalGmd,
  }))
}

/** Filtro aplicado del ranking: si se comparan solo los animales activos o también los que ya salieron. */
export function describirFiltrosRanking(soloActivos) {
  return [{ etiqueta: 'Solo animales activos', valor: soloActivos ? 'Sí' : 'No' }]
}

// ---- animales de un proveedor ----

export const COLUMNAS_ANIMALES_PROVEEDOR = [
  { clave: 'caravana', titulo: 'Caravana', tipo: 'texto', alineacion: 'izquierda', porDefecto: true },
  { clave: 'raza', titulo: 'Raza', tipo: 'texto', alineacion: 'izquierda', porDefecto: true },
  { clave: 'lote', titulo: 'Lote', tipo: 'texto', alineacion: 'izquierda', porDefecto: true },
  { clave: 'ingreso', titulo: 'Ingreso', tipo: 'fecha', alineacion: 'centro', porDefecto: true },
  { clave: 'pesoInicial', titulo: 'Peso inicial (kg)', tipo: 'numero', decimales: 1, alineacion: 'centro', porDefecto: true },
  { clave: 'pesoActual', titulo: 'Peso actual (kg)', tipo: 'numero', decimales: 1, alineacion: 'centro', porDefecto: true },
  { clave: 'ganancia', titulo: 'Ganancia (kg)', tipo: 'numero', decimales: 1, alineacion: 'centro', porDefecto: true },
  { clave: 'gmd', titulo: 'GMD acumulado (kg/día)', tipo: 'numero', decimales: 3, alineacion: 'centro', porDefecto: true },
  { clave: 'estado', titulo: 'Estado', tipo: 'texto', alineacion: 'izquierda', porDefecto: true },
]

/** Una fila de exportación a partir de un animal de la lista del proveedor. */
export function filaDeAnimalProveedor(animal, textoEstado) {
  return {
    caravana: animal.caravana,
    raza: animal.razaDescripcion,
    lote: animal.loteDescripcion || 'Sin lote',
    ingreso: animal.aniFechaIngreso,
    pesoInicial: animal.aniPesoInicial,
    pesoActual: animal.pesoActual,
    ganancia: animal.gananciaKg,
    gmd: animal.gmdAcumulado,
    estado: textoEstado(animal.estado),
  }
}

/** Contexto para la línea de filtros: el proveedor y si se tomaron solo los animales activos. */
export function contextoDeProveedor(proveedorNombre, soloActivos) {
  return [
    { etiqueta: 'Proveedor', valor: proveedorNombre },
    { etiqueta: 'Solo animales activos', valor: soloActivos ? 'Sí' : 'No' },
  ]
}
