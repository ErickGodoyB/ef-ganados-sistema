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

/**
 * Regla del filtro de peso actual (límites inclusivos, como texto, mismo
 * formato que los de GMD: coma o punto, y uno a medio escribir se ignora).
 * Todo animal tiene peso actual (si no tiene pesajes es el peso inicial), así
 * que con un límite válido nadie queda afuera por "no tener dato".
 */
export function cumpleFiltroPeso(animal, pesoMin, pesoMax) {
  const minimo = parsearLimiteGmd(pesoMin)
  const maximo = parsearLimiteGmd(pesoMax)
  if (minimo != null && animal.pesoActual < minimo) {
    return false
  }
  if (maximo != null && animal.pesoActual > maximo) {
    return false
  }
  return true
}

/** True si al menos uno de los dos límites de peso (texto) es válido. */
export function hayFiltroPeso(pesoMin, pesoMax) {
  return parsearLimiteGmd(pesoMin) != null || parsearLimiteGmd(pesoMax) != null
}

/** Regla del filtro de pesajes: 'todos' (o vacío), 'con' (al menos un pesaje activo) o 'sin' (ninguno), según cantidadPesajes del resumen. */
export function cumpleFiltroPesajes(animal, pesajes) {
  if (!pesajes || pesajes === 'todos') {
    return true
  }
  return pesajes === 'con' ? animal.cantidadPesajes > 0 : animal.cantidadPesajes === 0
}

/** Regla del filtro de proveedor: 'todos' (o vacío), 'sin-proveedor' o el id del proveedor como texto. */
export function cumpleFiltroProveedor(animal, proveedor) {
  if (!proveedor || proveedor === 'todos') {
    return true
  }
  return proveedor === 'sin-proveedor' ? animal.proveedorId == null : String(animal.proveedorId) === proveedor
}

/** Proveedores presentes entre los animales (para las opciones del filtro), identificados por proveedorId y ordenados por nombre. "Sin proveedor" es una opción fija. */
export function obtenerProveedoresDisponibles(animales) {
  const vistos = new Map()
  for (const animal of animales) {
    if (animal.proveedorId != null && !vistos.has(animal.proveedorId)) {
      vistos.set(animal.proveedorId, { valor: String(animal.proveedorId), etiqueta: animal.proveedorNombre })
    }
  }
  return [...vistos.values()].sort((a, b) => a.etiqueta.localeCompare(b.etiqueta, 'es', { sensitivity: 'base' }))
}

/**
 * Todos los filtros que comparten el listado de Animales y el modal "Nueva
 * transferencia" (raza, proveedor, GMD, peso actual y con/sin pesajes), en un
 * solo lugar: así los dos aplican exactamente las mismas reglas. Cada filtro
 * es opcional y, sin valor, deja pasar a todos.
 */
export function cumpleFiltrosComunes(
  animal,
  { raza = 'todas', proveedor = 'todos', gmdMin = '', gmdMax = '', pesoMin = '', pesoMax = '', pesajes = 'todos' } = {},
) {
  return (
    cumpleFiltroRaza(animal, raza) &&
    cumpleFiltroProveedor(animal, proveedor) &&
    cumpleFiltroGmd(animal, gmdMin, gmdMax) &&
    cumpleFiltroPeso(animal, pesoMin, pesoMax) &&
    cumpleFiltroPesajes(animal, pesajes)
  )
}

/**
 * Valor numérico de un animal del resumen para ordenar por el campo dado
 * (los que comparten el listado y el modal de transferencias): GMD del
 * último intervalo, peso actual, ganancia total, GMD acumulado, peso de
 * ingreso y cantidad de pesajes. Devuelve undefined si el campo no es uno de
 * esos (quien llama decide qué hacer). null significa "sin dato".
 */
export function valorNumericoDeAnimal(animal, campo) {
  switch (campo) {
    case 'gmd':
      return animal.gmd
    case 'pesoActual':
      return animal.pesoActual
    case 'gananciaTotal':
      return animal.gananciaTotal
    case 'gmdAcumulado':
      return animal.gmdAcumulado
    case 'aniPesoInicial':
      return animal.aniPesoInicial
    case 'cantidadPesajes':
      return animal.cantidadPesajes
    default:
      return undefined
  }
}
