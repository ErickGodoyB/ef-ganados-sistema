/**
 * Piezas de filtrado de animales compartidas por las pantallas que filtran
 * el resumen de animales (GET /api/animales/resumen) por raza y por
 * ganancia diaria (GMD): el listado de Animales (paginas/animales/
 * listadoAnimales.js) y la pestaña "Nueva transferencia" (paginas/
 * transferencias/listadoTransferencia.js). Viven acá, y no en una de las
 * dos, para que las dos apliquen exactamente la misma regla (en particular
 * qué pasa con los animales sin GMD y con un límite a medio escribir).
 */

/**
 * Convierte el texto de un límite de GMD (acepta coma o punto decimal) a
 * número. Devuelve null si está vacío o no es un número: un límite a
 * medio escribir ("-", ",") se ignora en vez de vaciar la lista.
 */
export function parsearLimiteGmd(texto) {
  const normalizado = String(texto ?? '').trim().replace(',', '.')
  if (normalizado === '') {
    return null
  }
  const numero = Number(normalizado)
  return Number.isNaN(numero) ? null : numero
}

/** True si al menos uno de los dos límites de GMD (texto) es válido, es decir, si el filtro de GMD está efectivamente activo. */
export function hayFiltroGmd(gmdMin, gmdMax) {
  return parsearLimiteGmd(gmdMin) != null || parsearLimiteGmd(gmdMax) != null
}

/**
 * Regla del filtro de GMD (límites inclusivos, como texto). Sin ningún
 * límite válido, todos cumplen. Con al menos uno, los animales sin GMD
 * (null: todavía no tienen dos pesajes) NO cumplen, porque no se puede
 * saber si están dentro del rango.
 */
export function cumpleFiltroGmd(animal, gmdMin, gmdMax) {
  const minimo = parsearLimiteGmd(gmdMin)
  const maximo = parsearLimiteGmd(gmdMax)
  if (minimo == null && maximo == null) {
    return true
  }
  if (animal.gmd == null) {
    return false
  }
  if (minimo != null && animal.gmd < minimo) {
    return false
  }
  if (maximo != null && animal.gmd > maximo) {
    return false
  }
  return true
}

/** Regla del filtro de raza: 'todas' (o vacío) deja pasar a todos; si no, es el id de la raza como texto. */
export function cumpleFiltroRaza(animal, raza) {
  return !raza || raza === 'todas' || String(animal.razaId) === raza
}

/** Razas presentes entre los animales (para las opciones del filtro), identificadas por razaId y ordenadas alfabéticamente. */
export function obtenerRazasDisponibles(animales) {
  const vistas = new Map()
  for (const animal of animales) {
    if (animal.razaId != null && !vistas.has(animal.razaId)) {
      vistas.set(animal.razaId, { valor: String(animal.razaId), etiqueta: animal.razaDescripcion })
    }
  }
  return [...vistas.values()].sort((a, b) => a.etiqueta.localeCompare(b.etiqueta, 'es', { sensitivity: 'base' }))
}
