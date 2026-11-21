/**
 * Exportación de un listado a Excel (.xlsx) con ExcelJS, que se carga con
 * import() dinámico recién al generar el archivo.
 *
 * Mismo orden que el PDF: fila 1 con el título centrado y combinado (y el
 * logo a la izquierda, si carga); fila 2 con el contexto; debajo, los filtros
 * aplicados a la izquierda y cuándo y quién lo generó a la derecha; después la
 * tabla (cabecera en negrita con el verde de la marca, números y fechas como
 * valores reales, anchos razonables, autofiltro y las filas de arriba hasta la
 * cabecera congeladas) y, al final, los totales en filas, con su valor como
 * número real cuando corresponde.
 */

import { MARCA } from '../../configuracion/marca'
import { descargarArchivo } from './descarga'
import {
  alineacionDe,
  armarCabecera,
  fechaIsoADateUtc,
  nombreDeArchivo,
  textoDeCelda,
  totalesConValor,
} from './formatos'
import { cargarLogo } from './logo'

const VERDE_MARCA = 'FF183D09'
const CREMA_MARCA = 'FFEFE7D4'
/** Fila de la hoja donde va la cabecera de la tabla (las de arriba son el encabezado del archivo). */
export const FILA_CABECERA = 6

/** Formato numérico de Excel según los decimales ("#,##0.0": miles y decimales según la configuración regional del usuario). */
function formatoNumeroExcel(decimales) {
  return decimales > 0 ? `#,##0.${'0'.repeat(decimales)}` : '#,##0'
}

/** Valor real de una celda para Excel: número, Date (fecha) o texto; null si está vacío. */
export function valorDeCeldaExcel(valor, columna) {
  if (valor === null || valor === undefined || valor === '') {
    return null
  }
  switch (columna.tipo) {
    case 'numero':
    case 'entero':
      return typeof valor === 'number' ? valor : null
    case 'fecha':
      return fechaIsoADateUtc(valor)
    default:
      return textoDeCelda(valor, columna)
  }
}

/** Ancho de columna en caracteres: el del contenido más largo (encabezado incluido), entre 10 y 40. */
export function anchoDeColumna(columna, filas) {
  const largos = filas.map((fila) => textoDeCelda(fila[columna.clave], columna).length)
  return Math.min(40, Math.max(10, columna.titulo.length + 2, ...largos.map((largo) => largo + 2)))
}

/**
 * Cómo se reparte el encabezado según la cantidad de columnas: con 4 o más,
 * los filtros ocupan la mitad izquierda y "generado por" la derecha, en la
 * misma fila; con menos no hay lugar para dos bloques y van uno debajo del
 * otro, a todo el ancho.
 */
export function repartoDeEncabezado(cantidadColumnas) {
  if (cantidadColumnas >= 4) {
    const mitad = Math.ceil(cantidadColumnas / 2)
    return { dividido: true, izquierdaHasta: mitad, derechaDesde: mitad + 1 }
  }
  return { dividido: false, izquierdaHasta: cantidadColumnas, derechaDesde: 1 }
}

/** Texto de la celda de totales: el valor real si es numérico, o el texto. */
export function celdaDeTotal(total) {
  const etiqueta = total.unidad && total.numero != null ? `${total.etiqueta} (${total.unidad})` : total.etiqueta
  return total.numero != null
    ? { etiqueta, valor: total.numero, formato: formatoNumeroExcel(total.decimales ?? 0) }
    : { etiqueta, valor: total.valor, formato: null }
}

/** Combina un rango de celdas, salvo que sea una sola (ExcelJS no admite combinar una celda consigo misma). */
function combinar(hoja, filaDesde, columnaDesde, filaHasta, columnaHasta) {
  if (filaDesde !== filaHasta || columnaDesde !== columnaHasta) {
    hoja.mergeCells(filaDesde, columnaDesde, filaHasta, columnaHasta)
  }
}

/** Inserta el logo en la esquina de la fila 1 si se pudo cargar (si no, el título solo). */
async function insertarLogo(libro, hoja) {
  const logo = await cargarLogo()
  if (!logo) {
    return
  }
  const alto = 40
  const id = libro.addImage({ base64: logo.base64, extension: 'png' })
  hoja.addImage(id, { tl: { col: 0.1, row: 0.1 }, ext: { width: Math.round((logo.ancho / logo.alto) * alto), height: alto } })
}

/**
 * Arma el libro y devuelve el Blob (sin descargarlo; ver generarExcel). Mismos
 * datos que construirPdf, menos la orientación.
 */
export async function construirExcel({ titulo, contexto, filtros, columnas, filas, totales, usuario, ahora = new Date() }) {
  const { default: ExcelJS } = await import('exceljs')
  const libro = new ExcelJS.Workbook()
  libro.creator = MARCA.nombre
  libro.created = ahora
  const hoja = libro.addWorksheet(titulo.slice(0, 31))
  const ultima = columnas.length
  const cabecera = armarCabecera({ titulo, contexto, filtros, usuario, ahora })

  // Columnas con su ancho antes de combinar celdas, para que el título se centre bien.
  columnas.forEach((columna, indice) => {
    hoja.getColumn(indice + 1).width = anchoDeColumna(columna, filas)
  })

  // Fila 1: título centrado y combinado; el logo, a la izquierda.
  combinar(hoja, 1, 1, 1, ultima)
  const celdaTitulo = hoja.getCell(1, 1)
  celdaTitulo.value = cabecera.titulo
  celdaTitulo.font = { bold: true, size: 16, color: { argb: VERDE_MARCA } }
  celdaTitulo.alignment = { horizontal: 'center', vertical: 'middle' }
  hoja.getRow(1).height = 36
  await insertarLogo(libro, hoja)

  // Fila 2: contexto, centrado y combinado.
  combinar(hoja, 2, 1, 2, ultima)
  const celdaContexto = hoja.getCell(2, 1)
  celdaContexto.value = cabecera.contexto || null
  celdaContexto.font = { size: 10, color: { argb: 'FF3C3C32' } }
  celdaContexto.alignment = { horizontal: 'center' }

  // Filas 3 y 4: filtros a la izquierda; generado y usuario a la derecha.
  const reparto = repartoDeEncabezado(ultima)
  const textoFiltros = `Filtros aplicados: ${cabecera.filtros}`
  if (reparto.dividido) {
    combinar(hoja, 3, 1, 4, reparto.izquierdaHasta)
    combinar(hoja, 3, reparto.derechaDesde, 3, ultima)
    combinar(hoja, 4, reparto.derechaDesde, 4, ultima)
  } else {
    combinar(hoja, 3, 1, 3, ultima)
    combinar(hoja, 4, 1, 4, ultima)
  }
  hoja.getCell(3, 1).value = textoFiltros
  hoja.getCell(3, 1).alignment = { horizontal: 'left', vertical: 'top', wrapText: true }
  hoja.getCell(3, 1).font = { size: 10 }
  const celdaGenerado = hoja.getCell(3, reparto.dividido ? reparto.derechaDesde : 1)
  const celdaPor = hoja.getCell(4, reparto.dividido ? reparto.derechaDesde : 1)
  if (reparto.dividido) {
    celdaGenerado.value = cabecera.generado
    celdaPor.value = cabecera.por
  } else {
    // Sin lugar para dos bloques: los filtros ocupan la fila 3 y "generado por", la 4.
    celdaPor.value = `${cabecera.generado} ${cabecera.por}`
  }
  // Con un solo bloque, la celda de "generado" es la de los filtros: no se le cambia el estilo.
  for (const celda of reparto.dividido ? [celdaGenerado, celdaPor] : [celdaPor]) {
    celda.alignment = { horizontal: 'right' }
    celda.font = { size: 9, color: { argb: 'FF5A5A50' } }
  }

  // Cabecera de la tabla.
  const filaCabecera = hoja.getRow(FILA_CABECERA)
  columnas.forEach((columna, indice) => {
    const celda = filaCabecera.getCell(indice + 1)
    celda.value = columna.titulo
    celda.font = { bold: true, color: { argb: CREMA_MARCA } }
    celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: VERDE_MARCA } }
    celda.alignment = { horizontal: alineacionDe(columna), vertical: 'middle', wrapText: true }
  })
  filaCabecera.commit()

  // Filas de datos, con valores reales y su formato.
  filas.forEach((fila, indiceFila) => {
    const filaHoja = hoja.getRow(FILA_CABECERA + 1 + indiceFila)
    columnas.forEach((columna, indice) => {
      const celda = filaHoja.getCell(indice + 1)
      celda.value = valorDeCeldaExcel(fila[columna.clave], columna)
      celda.alignment = { horizontal: alineacionDe(columna), vertical: 'top' }
      if (columna.tipo === 'numero') {
        celda.numFmt = formatoNumeroExcel(columna.decimales ?? 1)
      } else if (columna.tipo === 'entero') {
        celda.numFmt = formatoNumeroExcel(0)
      } else if (columna.tipo === 'fecha') {
        celda.numFmt = 'dd/mm/yyyy'
      }
    })
    filaHoja.commit()
  })

  // Totales al final: una fila por total (etiqueta combinada en las primeras columnas, valor a continuación).
  let filaActual = FILA_CABECERA + Math.max(filas.length, 1) + 2
  const lista = totalesConValor(totales)
  const anchoEtiqueta = ultima >= 3 ? 2 : 1
  const filaTitulo = hoja.getRow(filaActual)
  filaTitulo.getCell(1).value = lista.length > 0 ? 'Totales' : 'Total de registros'
  filaTitulo.getCell(1).font = { bold: true, color: { argb: VERDE_MARCA } }
  if (lista.length === 0) {
    filaTitulo.getCell(anchoEtiqueta + 1).value = filas.length
    filaTitulo.getCell(anchoEtiqueta + 1).alignment = { horizontal: 'left' }
  }
  filaActual += 1
  for (const total of lista) {
    const { etiqueta, valor, formato } = celdaDeTotal(total)
    if (anchoEtiqueta > 1) {
      combinar(hoja, filaActual, 1, filaActual, anchoEtiqueta)
    }
    const celdaEtiqueta = hoja.getCell(filaActual, 1)
    celdaEtiqueta.value = etiqueta
    celdaEtiqueta.font = { bold: true }
    const celdaValor = hoja.getCell(filaActual, anchoEtiqueta + 1)
    celdaValor.value = valor
    celdaValor.alignment = { horizontal: 'left' }
    if (formato) {
      celdaValor.numFmt = formato
    }
    filaActual += 1
  }

  // Autofiltro sobre la tabla (no sobre los totales) y filas de arriba congeladas hasta la cabecera.
  hoja.autoFilter = {
    from: { row: FILA_CABECERA, column: 1 },
    to: { row: FILA_CABECERA + Math.max(filas.length, 1), column: ultima },
  }
  hoja.views = [{ state: 'frozen', ySplit: FILA_CABECERA }]

  const buffer = await libro.xlsx.writeBuffer()
  return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
}

/** Genera el Excel y lo descarga como <listado>_aaaa-mm-dd.xlsx. Devuelve el nombre del archivo. */
export async function generarExcel(datos) {
  const ahora = datos.ahora ?? new Date()
  const blob = await construirExcel({ ...datos, ahora })
  const nombre = nombreDeArchivo(datos.listado ?? 'listado', 'xlsx', ahora)
  descargarArchivo(blob, nombre)
  return nombre
}
