/**
 * Funciones puras de la pestaña "Nueva transferencia" (ver
 * PestanaNuevaTransferencia.jsx): filtrar y ordenar los animales
 * candidatos, elegir los de mayor ganancia y calcular la GMD promedio de
 * la selección. Separadas del componente para poder probar la lógica sin
 * depender de React, igual que listadoAnimales.js y listadoSesiones.js.
 *
 * Los animales son los del resumen (GET /api/animales/resumen): solo
 * cuentan los ACTIVOS (sin salida registrada), porque el backend rechaza
 * transferir un animal con salida.
 */

/** Un animal es candidato a transferirse si no tiene salida registrada. */
export function esActivo(animal) {
  return !animal.aniFechaEgreso
}

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

/** Lotes en los que hay animales activos, para el filtro de origen: "Lote — Grupo", ordenados alfabéticamente. */
export function obtenerLotesDeOrigen(animales) {
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

/** Razas presentes entre los animales, para el filtro de raza, ordenadas alfabéticamente. */
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
 * Aplica los filtros a los animales ACTIVOS:
 * - origen: 'todos', 'sin-lote' o el id del lote (como texto);
 * - raza: 'todas' o el id de la raza (como texto);
 * - gmdMin / gmdMax: texto de los límites (inclusivos). Si hay al menos un
 *   límite válido, los animales sin GMD (null: todavía no tienen dos
 *   pesajes) quedan afuera, porque no se puede saber si cumplen.
 */
export function filtrarAnimales(animales, { origen = 'todos', raza = 'todas', gmdMin = '', gmdMax = '' }) {
  const minimo = parsearLimiteGmd(gmdMin)
  const maximo = parsearLimiteGmd(gmdMax)
  const hayFiltroGmd = minimo != null || maximo != null

  return animales.filter((animal) => {
    if (!esActivo(animal)) {
      return false
    }
    if (origen === 'sin-lote' && animal.subGrupoId != null) {
      return false
    }
    if (origen !== 'todos' && origen !== 'sin-lote' && String(animal.subGrupoId) !== origen) {
      return false
    }
    if (raza !== 'todas' && String(animal.razaId) !== raza) {
      return false
    }
    if (hayFiltroGmd) {
      if (animal.gmd == null) {
        return false
      }
      if (minimo != null && animal.gmd < minimo) {
        return false
      }
      if (maximo != null && animal.gmd > maximo) {
        return false
      }
    }
    return true
  })
}

/**
 * Ordena por ganancia diaria ('desc' = de mayor a menor, 'asc' = de menor
 * a mayor). Los animales sin GMD van siempre al final, en cualquiera de las
 * dos direcciones (no tienen un valor que comparar); a igual GMD, por
 * caravana, para que el orden sea estable. No modifica el arreglo original.
 */
export function ordenarPorGmd(animales, direccion = 'desc') {
  const factor = direccion === 'asc' ? 1 : -1
  return [...animales].sort((a, b) => {
    if (a.gmd == null && b.gmd == null) {
      return a.aniCaravana.localeCompare(b.aniCaravana, 'es', { numeric: true })
    }
    if (a.gmd == null) {
      return 1
    }
    if (b.gmd == null) {
      return -1
    }
    if (a.gmd !== b.gmd) {
      return (a.gmd - b.gmd) * factor
    }
    return a.aniCaravana.localeCompare(b.aniCaravana, 'es', { numeric: true })
  })
}

/**
 * Ids de los "n" animales de mayor ganancia entre los dados (los que no
 * tienen GMD no participan). "puedeSeleccionarse" deja afuera, por
 * ejemplo, a los que ya están en el lote de destino. Devuelve menos de n si
 * no alcanzan.
 */
export function idsDeMayorGmd(animales, n, puedeSeleccionarse = () => true) {
  if (!Number.isInteger(n) || n <= 0) {
    return []
  }
  return ordenarPorGmd(
    animales.filter((animal) => animal.gmd != null && puedeSeleccionarse(animal)),
    'desc',
  )
    .slice(0, n)
    .map((animal) => animal.aniId)
}

/** GMD promedio de los animales que tienen GMD; null si ninguno la tiene. */
export function calcularGmdPromedio(animales) {
  const conGmd = animales.filter((animal) => animal.gmd != null)
  if (conGmd.length === 0) {
    return null
  }
  return conGmd.reduce((suma, animal) => suma + animal.gmd, 0) / conGmd.length
}

const SIN_GRUPO = 'Sin grupo'

/**
 * Agrupa los lotes (GET /api/subgrupos) por descripción de su grupo para
 * el selector de destino: devuelve [{ nombre, lotes }] con ambos niveles
 * ordenados sin distinguir mayúsculas y el grupo "Sin grupo" (lotes sin
 * grupo) al final.
 */
export function agruparLotesPorGrupo(lotes) {
  const grupos = new Map()
  for (const lote of lotes) {
    const nombreGrupo = lote.grupo?.grpDescripcion ?? SIN_GRUPO
    if (!grupos.has(nombreGrupo)) {
      grupos.set(nombreGrupo, [])
    }
    grupos.get(nombreGrupo).push(lote)
  }
  const comparar = (a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' })
  return [...grupos.entries()]
    .sort(([a], [b]) => {
      if (a === SIN_GRUPO) {
        return 1
      }
      if (b === SIN_GRUPO) {
        return -1
      }
      return comparar(a, b)
    })
    .map(([nombre, lotesDelGrupo]) => ({
      nombre,
      lotes: [...lotesDelGrupo].sort((a, b) => comparar(a.sbDescripcion, b.sbDescripcion)),
    }))
}

/** Descripciones de los lotes de origen de los animales, sin repetir y ordenadas; "Sin lote" para los que no tienen. */
export function descripcionesDeOrigen(animales) {
  const descripciones = new Set(animales.map((animal) => animal.subGrupoDescripcion ?? 'Sin lote'))
  return [...descripciones].sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }))
}
