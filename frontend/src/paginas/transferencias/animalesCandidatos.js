/**
 * Funciones puras del modal "Nueva transferencia" (ver
 * ModalNuevaTransferencia.jsx): filtrar y ordenar los animales
 * candidatos, elegir los de mayor ganancia y calcular la GMD promedio de
 * la selección. Separadas del componente para poder probar la lógica sin
 * depender de React, igual que listadoAnimales.js y listadoSesiones.js.
 *
 * Los animales son los del resumen (GET /api/animales/resumen): solo
 * cuentan los ACTIVOS (sin salida registrada), porque el backend rechaza
 * transferir un animal con salida.
 *
 * Las reglas de los filtros de raza y de GMD son las mismas del listado de
 * Animales y viven en utilidades/filtrosAnimales.js.
 */

import { cumpleFiltrosComunes, valorNumericoDeAnimal } from '../../utilidades/filtrosAnimales'

/** Un animal es candidato a transferirse si no tiene salida registrada. */
export function esActivo(animal) {
  return !animal.aniFechaEgreso
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

/**
 * Aplica los filtros a los animales ACTIVOS:
 * - origen: 'todos', 'sin-lote' o el id del lote (como texto);
 * - raza: 'todas' o el id de la raza (como texto);
 * - proveedor: 'todos', 'sin-proveedor' o el id del proveedor (como texto);
 * - pesajes: 'todos', 'con' o 'sin' pesajes;
 * - gmdMin / gmdMax: texto de los límites (inclusivos). Si hay al menos un
 *   límite válido, los animales sin GMD (null: todavía no tienen dos
 *   pesajes) quedan afuera, porque no se puede saber si cumplen;
 * - pesoMin / pesoMax: límites (inclusivos) del peso actual.
 */
export function filtrarAnimales(
  animales,
  { origen = 'todos', raza = 'todas', proveedor = 'todos', pesajes = 'todos', gmdMin = '', gmdMax = '', pesoMin = '', pesoMax = '' },
) {
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
    // Las mismas reglas que el listado de Animales (raza, proveedor, GMD, peso actual y con/sin pesajes).
    return cumpleFiltrosComunes(animal, { raza, proveedor, pesajes, gmdMin, gmdMax, pesoMin, pesoMax })
  })
}

/**
 * Opciones del selector "Ordenar por" de la lista de candidatos: por GMD,
 * por peso actual o por ganancia total, cada uno en las dos direcciones. El valor es
 * "campo:direccion" (ver ordenDesdeValor).
 */
export const OPCIONES_ORDEN = [
  { valor: 'gmd:desc', etiqueta: 'GMD: mayor a menor' },
  { valor: 'gmd:asc', etiqueta: 'GMD: menor a mayor' },
  { valor: 'pesoActual:desc', etiqueta: 'Peso actual: mayor a menor' },
  { valor: 'pesoActual:asc', etiqueta: 'Peso actual: menor a mayor' },
  { valor: 'gananciaTotal:desc', etiqueta: 'Ganancia total: mayor a menor' },
  { valor: 'gananciaTotal:asc', etiqueta: 'Ganancia total: menor a mayor' },
]

/** Convierte el valor del selector ("gmd:desc") en { campo, direccion }. */
export function ordenDesdeValor(valor) {
  const [campo, direccion] = valor.split(':')
  return { campo, direccion }
}

function valorDeOrden(animal, campo) {
  // Mismos valores que usa el orden del listado de Animales (utilidades/filtrosAnimales.js).
  return valorNumericoDeAnimal(animal, campo) ?? null
}

/**
 * Ordena por GMD (campo 'gmd'), peso actual ('pesoActual') o ganancia total
 * ('gananciaTotal'), de mayor a menor ('desc') o de menor a mayor ('asc').
 * Los animales sin valor (la GMD es null mientras no hay dos pesajes, y la
 * ganancia total mientras no hay ningún pesaje) van
 * siempre al final, en cualquiera de las dos direcciones; a igual valor,
 * por caravana, para que el orden sea estable. No modifica el arreglo
 * original.
 */
export function ordenarAnimales(animales, { campo = 'gmd', direccion = 'desc' } = {}) {
  const factor = direccion === 'asc' ? 1 : -1
  return [...animales].sort((a, b) => {
    const va = valorDeOrden(a, campo)
    const vb = valorDeOrden(b, campo)
    if (va == null && vb == null) {
      return a.aniCaravana.localeCompare(b.aniCaravana, 'es', { numeric: true })
    }
    if (va == null) {
      return 1
    }
    if (vb == null) {
      return -1
    }
    if (va !== vb) {
      return (va - vb) * factor
    }
    return a.aniCaravana.localeCompare(b.aniCaravana, 'es', { numeric: true })
  })
}

/** Ordena por ganancia diaria (ver ordenarAnimales). */
export function ordenarPorGmd(animales, direccion = 'desc') {
  return ordenarAnimales(animales, { campo: 'gmd', direccion })
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
