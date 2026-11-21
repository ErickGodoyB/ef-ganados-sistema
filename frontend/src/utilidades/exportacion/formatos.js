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
 * - alineacion: 'izquierda' o 'centro' (la del cuerpo Y la del encabezado de
 *   la columna). Cada listado la define: 'centro' para números, fechas y
 *   sí/no (pesos, GMD, diferencias, días, cantidades, promedios, fechas,
 *   posición); 'izquierda' para los textos (caravana, raza, lote, nombres,
 *   notas). Si falta, se deduce del tipo con esa misma regla.
 * - decimales: solo para 'numero'; todas las celdas de la columna llevan
 *   esa misma cantidad de decimales (por defecto 1).
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

/** Tipos de columna que se centran cuando la definición no trae alineación propia. */
const TIPOS_CENTRADOS = ['numero', 'entero', 'fecha', 'booleano']

/**
 * Alineación efectiva de una columna, en los valores que usan jsPDF y
 * ExcelJS ('left' o 'center'): la indicada ('izquierda' o 'centro') o, si
 * falta, 'center' para números, fechas y sí/no, y 'left' para el resto.
 */
export function alineacionDe(columna) {
  if (columna.alineacion === 'centro') {
    return 'center'
  }
  if (columna.alineacion === 'izquierda') {
    return 'left'
  }
  return TIPOS_CENTRADOS.includes(columna.tipo) ? 'center' : 'left'
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

/**
 * Línea de contexto bajo el título ("Sesión S-261029-3 · Lote Recría"): cada
 * dato es "etiqueta valor", sin dos puntos, unidos con "·". Se ignoran los
 * datos sin valor; sin ninguno devuelve ''.
 *
 * @param {{etiqueta: string, valor: string}[]} [contexto]
 */
export function lineaDeContexto(contexto) {
  return (contexto ?? [])
    .filter((dato) => dato.valor !== undefined && dato.valor !== null && String(dato.valor).trim() !== '')
    .map((dato) => `${dato.etiqueta} ${dato.valor}`)
    .join(' · ')
}

/**
 * Un total numérico para el cuadro "Totales": "valor" es el texto que ve el
 * PDF (con coma decimal y la unidad, ej. "312,4 kg") y "numero" el valor real
 * que escribe el Excel en su celda (con "decimales" fijos, y la unidad en la
 * etiqueta). Sin número (null) queda "—" en los dos.
 *
 * @param {string} etiqueta
 * @param {number|null|undefined} numero
 * @param {{decimales?: number, unidad?: string}} [opciones]
 */
export function totalNumerico(etiqueta, numero, { decimales = 0, unidad } = {}) {
  const hay = typeof numero === 'number' && Number.isFinite(numero)
  return {
    etiqueta,
    valor: hay ? `${formatearNumero(numero, decimales)}${unidad ? ` ${unidad}` : ''}` : '—',
    numero: hay ? numero : null,
    decimales,
    unidad,
  }
}

/** Un total de texto para el cuadro "Totales" (ej. el mejor proveedor). */
export function totalTexto(etiqueta, valor) {
  return { etiqueta, valor }
}

/** Los totales con valor, para dibujar (se descartan los vacíos). */
export function totalesConValor(totales) {
  return (totales ?? []).filter((total) => total.valor !== undefined && total.valor !== null && String(total.valor).trim() !== '')
}

/**
 * Datos de la cabecera de un archivo exportado, ya como texto, para que el PDF
 * y el Excel armen la misma: título, contexto (línea chica bajo el título),
 * cuándo y quién lo generó, y los filtros aplicados ("Sin filtros" si no hay).
 */
export function armarCabecera({ titulo, contexto, filtros, usuario, ahora }) {
  const hayFiltros = lineaDeFiltros(filtros) !== 'Sin filtros'
  return {
    titulo,
    contexto: lineaDeContexto(contexto),
    generado: `Generado el ${formatearFechaHora(ahora)}`,
    por: `por ${usuario}`,
    hayFiltros,
    filtros: lineaDeFiltros(filtros),
  }
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
