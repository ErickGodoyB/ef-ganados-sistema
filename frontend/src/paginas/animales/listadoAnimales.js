/**
 * Funciones puras para buscar, filtrar y ordenar el listado de animales
 * (RF010). Separadas de Animales.jsx para poder razonar sobre la lógica
 * (y, si hace falta más adelante, testearla) sin depender de React.
 */

/**
 * Lotes distintos presentes en los datos (para las opciones del filtro),
 * identificados por subGrupoId (no por el nombre: puede haber lotes con el
 * mismo nombre en grupos distintos). La etiqueta de cada uno es
 * "Lote — Grupo" para poder distinguirlos; se devuelven ordenados
 * alfabéticamente por esa etiqueta. Los animales sin lote (subGrupoId
 * null) no entran acá: el filtro "Sin lote" es una opción fija, no
 * depende de los datos (ver Animales.jsx).
 */
export function obtenerLotesDisponibles(animales) {
  const vistos = new Map()
  for (const animal of animales) {
    if (animal.subGrupoId == null || vistos.has(animal.subGrupoId)) {
      continue
    }
    const etiqueta = animal.grupoDescripcion
      ? `${animal.subGrupoDescripcion} — ${animal.grupoDescripcion}`
      : animal.subGrupoDescripcion
    vistos.set(animal.subGrupoId, { valor: String(animal.subGrupoId), etiqueta })
  }
  return [...vistos.values()].sort((a, b) => a.etiqueta.localeCompare(b.etiqueta, 'es', { sensitivity: 'base' }))
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
 * ignorando espacios en los extremos), los filtros de lote (por
 * subGrupoId; "sin-lote" filtra los que tienen subGrupoId null) y estado,
 * y finalmente el orden elegido. Devuelve un array nuevo; no modifica
 * "animales".
 */
export function filtrarYOrdenarAnimales(animales, { busqueda, lote, estado, orden }) {
  const termino = busqueda.trim().toLowerCase()

  const filtrados = animales.filter((animal) => {
    if (termino && !animal.aniCaravana?.toLowerCase().includes(termino)) {
      return false
    }
    if (lote === 'sin-lote' && animal.subGrupoId != null) {
      return false
    }
    if (lote !== 'todos' && lote !== 'sin-lote' && String(animal.subGrupoId) !== lote) {
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
