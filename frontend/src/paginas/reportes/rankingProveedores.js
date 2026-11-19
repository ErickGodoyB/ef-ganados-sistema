/**
 * Funciones puras del reporte "Rendimiento por proveedor" (GET
 * /api/reportes/proveedores). El backend ya devuelve las filas en el orden
 * del ranking (GMD promedio de mayor a menor, los null al final, y la fila
 * "Sin proveedor" siempre última); acá solo se deriva lo que la pantalla
 * necesita mostrar a partir de ese orden, sin reordenar nada.
 */

/** La fila "Sin proveedor" es la única con proveedorId null: agrupa animales sin proveedor asignado, no es un proveedor real. */
export function esFilaSinProveedor(fila) {
  return fila.proveedorId == null
}

/**
 * Mayor GMD promedio entre todas las filas con dato (la base de la barra
 * proporcional). 0 si ninguna tiene dato o si todas son negativas: así la
 * barra nunca divide por cero ni se dibuja al revés.
 */
export function mayorGmdPromedio(filas) {
  const valores = filas.map((fila) => fila.gmdPromedio).filter((gmd) => gmd != null)
  return valores.length === 0 ? 0 : Math.max(0, ...valores)
}

/**
 * Largo de la barra de una fila, de 0 a 100, proporcional al mayor GMD
 * promedio. Sin dato (null) o con GMD negativa o cero, la barra queda en
 * 0: el número escrito al lado es lo que informa, la barra solo ayuda a
 * comparar de un vistazo.
 */
export function porcentajeDeBarra(gmdPromedio, maximo) {
  if (gmdPromedio == null || maximo <= 0 || gmdPromedio <= 0) {
    return 0
  }
  return Math.min(100, (gmdPromedio / maximo) * 100)
}

/**
 * ID del proveedor que lleva la etiqueta "Mejor rendimiento": el primero
 * del ranking, siempre que sea un proveedor real y tenga GMD promedio. Si
 * el primero no tiene dato, nadie lo tiene (los null van al final, así que
 * detrás no puede haber nadie con dato); la fila "Sin proveedor" nunca la
 * lleva. Devuelve undefined si nadie corresponde.
 */
export function proveedorConMejorRendimiento(filas) {
  const primera = filas[0]
  if (!primera || esFilaSinProveedor(primera) || primera.gmdPromedio == null) {
    return undefined
  }
  return primera.proveedorId
}

/**
 * Posición en el ranking (1, 2, 3…) de cada proveedor real, por su lugar
 * en la lista; la fila "Sin proveedor" no tiene posición (null), porque
 * no es un participante más de la comparación.
 */
export function posicionEnRanking(filas, indice) {
  return esFilaSinProveedor(filas[indice]) ? null : indice + 1
}
