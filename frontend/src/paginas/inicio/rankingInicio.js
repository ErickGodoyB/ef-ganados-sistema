/**
 * Funciones puras del ranking de lotes y grupos de Inicio. El servidor ya
 * manda las filas en el orden del ranking (GMD promedio de mayor a menor, los
 * null al final); acá solo se eligen los dos destacados, sin reordenar nada.
 */

/**
 * La fila con el mayor valor del campo dado ('pesoPromedio' o 'gmdPromedio'),
 * o null si ninguna tiene dato o si el máximo está empatado (con empate no
 * hay un "mayor" claro: mejor mostrar "—" que elegir uno al azar). El empate
 * se compara con el valor tal cual lo manda el servidor.
 */
export function filaDestacada(filas, campo) {
  const conDato = filas.filter((fila) => fila[campo] != null)
  if (conDato.length === 0) {
    return null
  }
  const maximo = Math.max(...conDato.map((fila) => fila[campo]))
  const conMaximo = conDato.filter((fila) => fila[campo] === maximo)
  return conMaximo.length === 1 ? conMaximo[0] : null
}

/**
 * El mejor proveedor del reporte de rendimiento (GET /api/reportes/proveedores):
 * la primera fila con proveedorId y con GMD promedio. El servidor ya manda
 * las filas por GMD promedio de mayor a menor y la fila "Sin proveedor"
 * (proveedorId null) no es un proveedor real. Devuelve null si no hay.
 */
export function mejorProveedor(filas) {
  return filas.find((fila) => fila.proveedorId != null && fila.gmdPromedio != null) ?? null
}
