/**
 * Funciones puras para buscar, filtrar y ordenar el listado de animales
 * (RF010). Separadas de Animales.jsx para poder razonar sobre la lógica
 * (y, si hace falta más adelante, testearla) sin depender de React.
 */

/** Lotes distintos presentes en los datos (para las opciones del filtro), ordenados alfabéticamente. */
export function obtenerLotesDisponibles(animales) {
  const lotes = new Set()
  for (const animal of animales) {
    if (animal.subGrupoDescripcion) {
      lotes.add(animal.subGrupoDescripcion)
    }
  }
  return [...lotes].sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }))
}

function valorDeOrden(animal, campo) {
  switch (campo) {
    case 'aniCaravana':
      return animal.aniCaravana?.toLowerCase() ?? ''
    case 'razaDescripcion':
      return animal.razaDescripcion?.toLowerCase() ?? null
    case 'lote':
      return animal.subGrupoDescripcion?.toLowerCase() ?? null
    case 'pesoActual':
      return animal.pesoActual
    case 'gmd':
      return animal.gmd
    case 'aptoVenta':
      return animal.aptoVenta
    case 'aniFechaIngreso':
      return animal.aniFechaIngreso
    default:
      return null
  }
}

/**
 * Compara dos animales por el campo de orden dado. Los valores nulos (ej.
 * GMD sin pesajes suficientes, o un lote sin asignar) siempre van al
 * final, sin importar si la dirección es ascendente o descendente.
 */
function compararAnimales(a, b, campo, direccion) {
  const signo = direccion === 'desc' ? -1 : 1
  const va = valorDeOrden(a, campo)
  const vb = valorDeOrden(b, campo)

  const vaEsNulo = va === null || va === undefined
  const vbEsNulo = vb === null || vb === undefined
  if (vaEsNulo && vbEsNulo) {
    return 0
  }
  if (vaEsNulo) {
    return 1
  }
  if (vbEsNulo) {
    return -1
  }

  if (typeof va === 'boolean') {
    return (Number(va) - Number(vb)) * signo
  }
  if (typeof va === 'number') {
    return (va - vb) * signo
  }
  return String(va).localeCompare(String(vb), 'es', { sensitivity: 'base' }) * signo
}

/**
 * Aplica, en orden, la búsqueda por caravana (sin distinguir mayúsculas,
 * ignorando espacios en los extremos), los filtros de lote y estado, y
 * finalmente el orden elegido. Devuelve un array nuevo; no modifica
 * "animales".
 */
export function filtrarYOrdenarAnimales(animales, { busqueda, lote, estado, orden }) {
  const termino = busqueda.trim().toLowerCase()

  const filtrados = animales.filter((animal) => {
    if (termino && !animal.aniCaravana?.toLowerCase().includes(termino)) {
      return false
    }
    if (lote !== 'todos' && animal.subGrupoDescripcion !== lote) {
      return false
    }
    if (estado === 'aptos' && !animal.aptoVenta) {
      return false
    }
    if (estado === 'no-aptos' && animal.aptoVenta) {
      return false
    }
    return true
  })

  return filtrados.sort((a, b) => compararAnimales(a, b, orden.campo, orden.direccion))
}
