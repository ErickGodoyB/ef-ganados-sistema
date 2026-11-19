/**
 * Exportación de un listado a Excel (.xlsx) con ExcelJS, que se carga con
 * import() dinámico recién al generar el archivo. Las primeras filas llevan
 * la empresa, el título, los filtros y la fecha; luego la tabla con la
 * cabecera en negrita y con el verde de la marca, números y fechas como
 * valores reales (no texto: se pueden sumar, ordenar y filtrar en Excel),
 * anchos de columna razonables, autofiltro y las filas de arriba (hasta la
 * de títulos) congeladas.
 */

import { MARCA } from '../../configuracion/marca'
import { descargarArchivo } from './descarga'
import {
  alineacionDe,
  fechaIsoADateUtc,
  formatearFechaHora,
  lineaDeFiltros,
  lineaDeResumen,
  nombreDeArchivo,
  textoDeCelda,
} from './formatos'

const VERDE_MARCA = 'FF183D09'
const CREMA_MARCA = 'FFEFE7D4'
/** Fila de la cabecera de la tabla cuando no hay resumen (las de arriba son los datos de contexto). */
export const FILA_CABECERA = 6

/** Fila de la cabecera según haya o no una línea de resumen (que suma una fila arriba). */
export function filaDeCabecera(resumen) {
  return lineaDeResumen(resumen) ? FILA_CABECERA + 1 : FILA_CABECERA
}

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

/** Arma el libro y devuelve el Blob (sin descargarlo; ver generarExcel). Mismos datos que construirPdf, menos la orientación. */
export async function construirExcel({ titulo, filtros, columnas, filas, resumen, usuario, ahora = new Date() }) {
  const { default: ExcelJS } = await import('exceljs')
  const libro = new ExcelJS.Workbook()
  libro.creator = MARCA.nombre
  libro.created = ahora
  const hoja = libro.addWorksheet(titulo.slice(0, 31))

  hoja.getCell('A1').value = MARCA.nombre
  hoja.getCell('A1').font = { bold: true, size: 14, color: { argb: VERDE_MARCA } }
  hoja.getCell('A2').value = titulo
  hoja.getCell('A2').font = { bold: true, size: 12 }
  hoja.getCell('A3').value = `Filtros: ${lineaDeFiltros(filtros)}`
  hoja.getCell('A4').value = `Generado el ${formatearFechaHora(ahora)} por ${usuario}`
  const textoResumen = lineaDeResumen(resumen)
  if (textoResumen) {
    hoja.getCell('A5').value = textoResumen
    hoja.getCell('A5').font = { bold: true }
  }
  const filaCabecera = filaDeCabecera(resumen)

  // Cabecera de la tabla.
  const cabecera = hoja.getRow(filaCabecera)
  columnas.forEach((columna, indice) => {
    const celda = cabecera.getCell(indice + 1)
    celda.value = columna.titulo
    celda.font = { bold: true, color: { argb: CREMA_MARCA } }
    celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: VERDE_MARCA } }
    celda.alignment = { horizontal: alineacionDe(columna), vertical: 'middle', wrapText: true }
  })
  cabecera.commit()

  // Filas de datos, con valores reales y su formato.
  filas.forEach((fila, indiceFila) => {
    const filaHoja = hoja.getRow(filaCabecera + 1 + indiceFila)
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

  columnas.forEach((columna, indice) => {
    hoja.getColumn(indice + 1).width = anchoDeColumna(columna, filas)
  })

  // Autofiltro sobre la tabla y filas de arriba congeladas hasta la cabecera.
  hoja.autoFilter = {
    from: { row: filaCabecera, column: 1 },
    to: { row: filaCabecera + Math.max(filas.length, 1), column: columnas.length },
  }
  hoja.views = [{ state: 'frozen', ySplit: filaCabecera }]

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
