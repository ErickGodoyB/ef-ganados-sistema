/**
 * Cálculo del resumen de una sesión de pesaje (cantidad, total, promedio,
 * mínimo, máximo y GMD promedio), usado tanto por la lista en construcción
 * de PestanaPorLote como por el detalle ya guardado de ModalDetalleSesion.
 * Funciones puras, separadas de los componentes para poder probarlas sin
 * React.
 */

/** Resumen de un conjunto de pesos: 0 en todo si la lista está vacía (evita dividir por 0). */
export function calcularResumenPesos(pesos) {
  if (pesos.length === 0) {
    return { cantidad: 0, total: 0, promedio: 0, minimo: 0, maximo: 0 }
  }
  const total = pesos.reduce((acumulado, peso) => acumulado + peso, 0)
  return {
    cantidad: pesos.length,
    total,
    promedio: total / pesos.length,
    minimo: Math.min(...pesos),
    maximo: Math.max(...pesos),
  }
}

/**
 * GMD promedio de una sesión: solo cuenta los animales que tienen gmd no
 * nula -- el resto todavía no tiene con qué calcularla (un pesaje del
 * mismo día del ingreso, sin ningún pesaje anterior; ver
 * AnimalService.calcularGmdEntre en el backend), y promediar null como 0
 * inflaría el promedio hacia abajo sin sentido. "conGmd" es el "n" de la
 * leyenda "n de m animales con peso previo (incluye el peso de ingreso)";
 * "total" es el "m".
 */
export function calcularGmdPromedioSesion(gmds) {
  const validos = gmds.filter((gmd) => gmd != null)
  return {
    gmdPromedio: validos.length > 0 ? validos.reduce((acumulado, gmd) => acumulado + gmd, 0) / validos.length : null,
    conGmd: validos.length,
    total: gmds.length,
  }
}
