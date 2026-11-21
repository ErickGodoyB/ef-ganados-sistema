/**
 * Funciones puras para buscar, filtrar y ordenar el listado de animales
 * (RF010). Separadas de Animales.jsx para poder razonar sobre la lógica
 * (y, si hace falta más adelante, testearla) sin depender de React.
 */

import {
  cumpleFiltrosComunes,
  obtenerProveedoresDisponibles,
  parsearLimiteGmd,
  valorNumericoDeAnimal,
} from '../../utilidades/filtrosAnimales'

// Las opciones de proveedor viven con los demás filtros compartidos; se
// re-exportan acá porque el listado las pide junto a las de lote.
export { obtenerProveedoresDisponibles }

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
    case 'proveedor':
      return animal.proveedorNombre?.toLowerCase() ?? null
    case 'aptoVenta':
      return animal.aptoVenta
    case 'aniFechaIngreso':
      return animal.aniFechaIngreso
    default:
      // GMD, peso actual, ganancia total, GMD acumulado, peso de ingreso y
      // cantidad de pesajes (valores numéricos compartidos con el modal de
      // transferencias); cualquier otro campo no ordena.
      return valorNumericoDeAnimal(animal, campo) ?? null
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
 * Valores por defecto de los filtros: el listado está "sin filtrar" cuando
 * todos valen esto. "Activos" es el valor por defecto del estado de salida
 * (un animal con salida ya no es productivo), así que no cuenta como
 * filtro activo (ver contarFiltrosActivos).
 */
export const FILTROS_POR_DEFECTO = {
  busqueda: '',
  lote: 'todos',
  estado: 'todos',
  estadoSalida: 'activos',
  raza: 'todas',
  proveedor: 'todos',
  pesajes: 'todos',
  gmdMin: '',
  gmdMax: '',
  pesoMin: '',
  pesoMax: '',
}

/**
 * Cuántos filtros están activos, para el indicador del listado: la
 * búsqueda, cada uno de los selectores que se aparta de su valor por
 * defecto, y cada límite de GMD válido (el mínimo y el máximo cuentan por
 * separado), el de pesajes (con/sin) y cada límite de peso actual válido. Un
 * límite a medio escribir ("-", ",") no cuenta, igual que no
 * filtra (ver utilidades/filtrosAnimales.js). El orden no es un filtro.
 */
export function contarFiltrosActivos({
  busqueda = FILTROS_POR_DEFECTO.busqueda,
  lote = FILTROS_POR_DEFECTO.lote,
  estado = FILTROS_POR_DEFECTO.estado,
  estadoSalida = FILTROS_POR_DEFECTO.estadoSalida,
  raza = FILTROS_POR_DEFECTO.raza,
  proveedor = FILTROS_POR_DEFECTO.proveedor,
  pesajes = FILTROS_POR_DEFECTO.pesajes,
  gmdMin = FILTROS_POR_DEFECTO.gmdMin,
  gmdMax = FILTROS_POR_DEFECTO.gmdMax,
  pesoMin = FILTROS_POR_DEFECTO.pesoMin,
  pesoMax = FILTROS_POR_DEFECTO.pesoMax,
}) {
  return [
    busqueda.trim() !== '',
    lote !== FILTROS_POR_DEFECTO.lote,
    estado !== FILTROS_POR_DEFECTO.estado,
    estadoSalida !== FILTROS_POR_DEFECTO.estadoSalida,
    raza !== FILTROS_POR_DEFECTO.raza,
    proveedor !== FILTROS_POR_DEFECTO.proveedor,
    pesajes !== FILTROS_POR_DEFECTO.pesajes,
    parsearLimiteGmd(gmdMin) != null,
    parsearLimiteGmd(gmdMax) != null,
    parsearLimiteGmd(pesoMin) != null,
    parsearLimiteGmd(pesoMax) != null,
  ].filter(Boolean).length
}

/**
 * Aplica, en orden, la búsqueda por caravana (sin distinguir mayúsculas,
 * ignorando espacios en los extremos), los filtros de lote (por
 * subGrupoId; "sin-lote" filtra los que tienen subGrupoId null), raza (por
 * razaId), proveedor, con/sin pesajes, peso actual mínimo y máximo, GMD
 * mínima y máxima (si hay alguno válido, los animales sin GMD quedan
 * afuera; ver utilidades/filtrosAnimales.js), estado (apto/no apto
 * para venta) y estado de salida (activos/salidos), y finalmente el orden
 * elegido. "raza", "gmdMin" y "gmdMax" son opcionales (por defecto, sin
 * filtrar). Devuelve un array nuevo; no modifica "animales".
 */
export function filtrarYOrdenarAnimales(
  animales,
  {
    busqueda,
    lote,
    estado,
    estadoSalida,
    raza = 'todas',
    proveedor = 'todos',
    pesajes = 'todos',
    gmdMin = '',
    gmdMax = '',
    pesoMin = '',
    pesoMax = '',
    orden,
  },
) {
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
    // Raza, proveedor, GMD, peso actual y con/sin pesajes: las mismas reglas
    // que usa el modal "Nueva transferencia" (utilidades/filtrosAnimales.js).
    if (!cumpleFiltrosComunes(animal, { raza, proveedor, pesajes, gmdMin, gmdMax, pesoMin, pesoMax })) {
      return false
    }
    if (estado === 'aptos' && !animal.aptoVenta) {
      return false
    }
    if (estado === 'no-aptos' && animal.aptoVenta) {
      return false
    }
    if (estadoSalida === 'activos' && animal.aniFechaEgreso != null) {
      return false
    }
    if (estadoSalida === 'salidos' && animal.aniFechaEgreso == null) {
      return false
    }
    return true
  })

  return filtrados.sort((a, b) => compararAnimales(a, b, orden.campo, orden.direccion))
}
