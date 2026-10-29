/**
 * Funciones puras para buscar, filtrar y ordenar el listado de sesiones de
 * pesaje (RF011). Separadas de Pesajes.jsx para poder razonar sobre la
 * lógica sin depender de React, igual que listadoAnimales.js.
 */

/**
 * Lotes distintos presentes en los datos (para las opciones del filtro),
 * identificados por subGrupoId (puede haber lotes con el mismo nombre en
 * grupos distintos). La etiqueta de cada uno es "Lote — Grupo"; se
 * devuelven ordenados alfabéticamente por esa etiqueta. Las sesiones "Sin
 * lote" (subGrupoId null) no entran acá: esa opción es fija, no depende de
 * los datos (ver Pesajes.jsx).
 */
export function obtenerLotesDisponibles(sesiones) {
  const vistos = new Map()
  for (const sesion of sesiones) {
    if (sesion.subGrupoId == null || vistos.has(sesion.subGrupoId)) {
      continue
    }
    const etiqueta = sesion.grupoDescripcion
      ? `${sesion.subGrupoDescripcion} — ${sesion.grupoDescripcion}`
      : sesion.subGrupoDescripcion
    vistos.set(sesion.subGrupoId, { valor: String(sesion.subGrupoId), etiqueta })
  }
  return [...vistos.values()].sort((a, b) => a.etiqueta.localeCompare(b.etiqueta, 'es', { sensitivity: 'base' }))
}

function valorDeOrden(sesion, campo) {
  switch (campo) {
    case 'fecha':
      return sesion.fecha
    case 'lote':
      return sesion.subGrupoDescripcion?.toLowerCase() ?? null
    case 'cantidad':
      return sesion.cantidad
    case 'promedio':
      return sesion.promedio
    case 'minimo':
      return sesion.minimo
    case 'maximo':
      return sesion.maximo
    case 'total':
      return sesion.total
    default:
      return null
  }
}

/**
 * Compara dos sesiones por el campo de orden dado. Los valores nulos (ej.
 * un lote sin asignar al ordenar por lote) siempre van al final, sin
 * importar si la dirección es ascendente o descendente.
 */
function compararSesiones(a, b, campo, direccion) {
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

  if (typeof va === 'number') {
    return (va - vb) * signo
  }
  return String(va).localeCompare(String(vb), 'es', { sensitivity: 'base' }) * signo
}

/**
 * Aplica, en orden, la búsqueda por lote o grupo (sin distinguir
 * mayúsculas), el filtro de lote (por subGrupoId; "sin-lote" filtra las
 * sesiones con subGrupoId null), el rango de fechas (desde/hasta, ambos
 * opcionales, inclusive) y finalmente el orden elegido. Devuelve un array
 * nuevo; no modifica "sesiones".
 */
export function filtrarYOrdenarSesiones(sesiones, { busqueda, lote, desde, hasta, orden }) {
  const termino = busqueda.trim().toLowerCase()

  const filtradas = sesiones.filter((sesion) => {
    if (termino) {
      const coincideLote = sesion.subGrupoDescripcion?.toLowerCase().includes(termino)
      const coincideGrupo = sesion.grupoDescripcion?.toLowerCase().includes(termino)
      if (!coincideLote && !coincideGrupo) {
        return false
      }
    }
    if (lote === 'sin-lote' && sesion.subGrupoId != null) {
      return false
    }
    if (lote !== 'todos' && lote !== 'sin-lote' && String(sesion.subGrupoId) !== lote) {
      return false
    }
    if (desde && sesion.fecha < desde) {
      return false
    }
    if (hasta && sesion.fecha > hasta) {
      return false
    }
    return true
  })

  return filtradas.sort((a, b) => compararSesiones(a, b, orden.campo, orden.direccion))
}
