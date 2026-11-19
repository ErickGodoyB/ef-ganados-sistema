/**
 * Funciones puras compartidas por la exportación a PDF y a Excel: formato de
 * números y fechas en es-PY (coma decimal, dd/mm/aaaa), línea de filtros,
 * nombre del archivo, orientación automática y lectura de las dimensiones de
 * un PNG. Ninguna toca el DOM ni el reloj ("hoy" y "ahora" se reciben como
 * parámetro), así se prueban con datos fijos.
 *
 * Definición de columna (la usan los dos generadores y el modal):
 *   { clave, titulo, tipo, alineacion, decimales }
 * - tipo: 'texto' (por defecto), 'numero', 'entero', 'fecha' (aaaa-mm-dd) o
 *   'booleano' (se muestra "Sí"/"No").
 * - alineacion: 'left', 'right' o 'center'; si falta, los números van a la
 *   derecha y el resto a la izquierda.
 * - decimales: solo para 'numero' (por defecto 1).
 */

/** Máximo de columnas para que una tabla A4 vertical siga siendo legible: con más, la orientación automática es horizontal. */
export const MAX_COLUMNAS_VERTICAL = 6

const formatosNumero = new Map()

/** Formato es-PY con la cantidad de decimales dada (separador de miles "." y decimal ","). */
function formatoDeNumero(decimales) {
  if (!formatosNumero.has(decimales)) {
    formatosNumero.set(
      decimales,
      new Intl.NumberFormat('es-PY', { minimumFractionDigits: decimales, maximumFractionDigits: decimales }),
    )
  }
  return formatosNumero.get(decimales)
}

/** Número con coma decimal, ej. 1234.5 con 1 decimal -> "1.234,5". Vacío si es null o no es un número. */
export function formatearNumero(valor, decimales = 1) {
  return typeof valor === 'number' && Number.isFinite(valor) ? formatoDeNumero(decimales).format(valor) : ''
}

/** Fecha aaaa-mm-dd -> dd/mm/aaaa (partiendo el texto, sin Date: no hay corrimiento por huso horario). Vacío si no hay fecha. */
export function formatearFechaIso(fechaIso) {
  const coincidencia = /^(\d{4})-(\d{2})-(\d{2})/.exec(fechaIso ?? '')
  return coincidencia ? `${coincidencia[3]}/${coincidencia[2]}/${coincidencia[1]}` : ''
}

const dos = (numero) => String(numero).padStart(2, '0')

/** Fecha de hoy aaaa-mm-dd en hora local de "ahora". */
export function fechaIsoDe(ahora) {
  return `${ahora.getFullYear()}-${dos(ahora.getMonth() + 1)}-${dos(ahora.getDate())}`
}

/** "dd/mm/aaaa hh:mm" en hora local, para "Generado el …". */
export function formatearFechaHora(ahora) {
  return `${dos(ahora.getDate())}/${dos(ahora.getMonth() + 1)}/${ahora.getFullYear()} ${dos(ahora.getHours())}:${dos(ahora.getMinutes())}`
}

/** Alineación efectiva de una columna: la indicada o, si falta, derecha para los números e izquierda para el resto. */
export function alineacionDe(columna) {
  if (columna.alineacion) {
    return columna.alineacion
  }
  return columna.tipo === 'numero' || columna.tipo === 'entero' ? 'right' : 'left'
}

/** Texto de una celda para el PDF según el tipo de la columna (el Excel usa valores reales, ver generarExcel.js). */
export function textoDeCelda(valor, columna) {
  if (valor === null || valor === undefined || valor === '') {
    return ''
  }
  switch (columna.tipo) {
    case 'numero':
      return formatearNumero(valor, columna.decimales ?? 1)
    case 'entero':
      return formatearNumero(valor, 0)
    case 'fecha':
      return formatearFechaIso(valor)
    case 'booleano':
      return valor ? 'Sí' : 'No'
    default:
      return String(valor)
  }
}

/**
 * Línea de filtros del encabezado: "Raza: Brahman · GMD mínima: 0,8", o
 * "Sin filtros" si no hay ninguno (se ignoran los que no tienen valor).
 *
 * @param {{etiqueta: string, valor: string}[]} filtros
 */
export function lineaDeFiltros(filtros) {
  const aplicados = (filtros ?? []).filter((filtro) => filtro.valor !== undefined && filtro.valor !== null && String(filtro.valor).trim() !== '')
  return aplicados.length === 0 ? 'Sin filtros' : aplicados.map((filtro) => `${filtro.etiqueta}: ${filtro.valor}`).join(' · ')
}

/** Nombre del archivo: <listado>_aaaa-mm-dd.<extension>, ej. "animales_2026-11-18.pdf". */
export function nombreDeArchivo(listado, extension, ahora) {
  return `${listado}_${fechaIsoDe(ahora)}.${extension}`
}

/**
 * Orientación del PDF: la elegida ('vertical' u 'horizontal') o, en
 * automático, horizontal si hay más de 6 columnas. Devuelve el valor que usa
 * jsPDF ('portrait' o 'landscape').
 */
export function orientacionDelPdf(cantidadColumnas, elegida = 'automatica') {
  if (elegida === 'vertical') {
    return 'portrait'
  }
  if (elegida === 'horizontal') {
    return 'landscape'
  }
  return cantidadColumnas > MAX_COLUMNAS_VERTICAL ? 'landscape' : 'portrait'
}

/** Ancho y alto de un PNG leídos de su cabecera (IHDR), o null si los bytes no son un PNG. */
export function dimensionesDePng(bytes) {
  const firma = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
  if (!bytes || bytes.length < 24 || firma.some((valor, indice) => bytes[indice] !== valor)) {
    return null
  }
  const vista = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  return { ancho: vista.getUint32(16), alto: vista.getUint32(20) }
}

/** Fecha aaaa-mm-dd como Date a medianoche UTC (así Excel la guarda como esa fecha exacta, sin corrimiento por huso), o null. */
export function fechaIsoADateUtc(fechaIso) {
  const coincidencia = /^(\d{4})-(\d{2})-(\d{2})/.exec(fechaIso ?? '')
  return coincidencia ? new Date(Date.UTC(Number(coincidencia[1]), Number(coincidencia[2]) - 1, Number(coincidencia[3]))) : null
}
