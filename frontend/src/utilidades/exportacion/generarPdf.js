/**
 * Exportación de un listado a PDF (A4) con jsPDF y jspdf-autotable, que se
 * cargan con import() dinámico recién al generar el archivo, para no
 * agrandar la carga inicial de la app. Cabecera con el logo (si no carga,
 * el nombre de la empresa en texto), el nombre de la empresa, el título, la
 * fecha y quién lo generó, y los filtros; tabla con el encabezado repetido
 * en cada página, colores de la marca, "Página X de Y" en el pie y el total
 * de registros al final.
 *
 * Los textos usan la fuente estándar (Helvetica, WinAnsi): acentos, ñ y el
 * punto medio "·" salen bien; por eso los separadores y símbolos se limitan
 * a ese juego de caracteres.
 */

import { MARCA } from '../../configuracion/marca'
import { descargarArchivo } from './descarga'
import {
  alineacionDe,
  dimensionesDePng,
  formatearFechaHora,
  lineaDeFiltros,
  lineaDeResumen,
  nombreDeArchivo,
  orientacionDelPdf,
  textoDeCelda,
} from './formatos'

// Colores de la marca (ver index.css): verde oscuro #183D09 en el encabezado,
// crema #EFE7D4 como texto sobre él, y un crema muy suave en las filas alternas.
const VERDE_MARCA = [24, 61, 9]
const CREMA_MARCA = [239, 231, 212]
const FILA_ALTERNA = [247, 243, 232]
const MARGEN = 12

/**
 * Carga el logo como { datos (data URL), ancho, alto } o devuelve null si no
 * se puede (no existe, no es PNG, falla la red): en ese caso la cabecera usa
 * solo el nombre de la empresa en texto.
 */
async function cargarLogo() {
  try {
    const respuesta = await fetch(MARCA.rutaLogo)
    if (!respuesta.ok) {
      return null
    }
    const bytes = new Uint8Array(await respuesta.arrayBuffer())
    const dimensiones = dimensionesDePng(bytes)
    if (!dimensiones) {
      return null
    }
    let binario = ''
    for (let i = 0; i < bytes.length; i += 0x8000) {
      binario += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
    }
    return { datos: `data:image/png;base64,${btoa(binario)}`, ...dimensiones }
  } catch {
    return null
  }
}

/**
 * Arma el PDF y devuelve el Blob (sin descargarlo; ver generarPdf).
 *
 * @param {object} datos
 * @param {string} datos.titulo Título del listado.
 * @param {{etiqueta: string, valor: string}[]} datos.filtros Filtros aplicados.
 * @param {object[]} datos.columnas Columnas (ver formatos.js).
 * @param {object[]} datos.filas Filas: objetos con un valor por clave de columna.
 * @param {'automatica'|'vertical'|'horizontal'} [datos.orientacion]
 * @param {{etiqueta: string, valor: string}[]} [datos.resumen] Datos de resumen que van en la cabecera, después de los filtros (opcional).
 * @param {string} datos.usuario Quién genera el archivo.
 * @param {Date} [datos.ahora] Momento de generación (se puede fijar para pruebas).
 */
export async function construirPdf({
  titulo,
  filtros,
  columnas,
  filas,
  resumen,
  orientacion = 'automatica',
  usuario,
  ahora = new Date(),
}) {
  const [{ jsPDF }, { default: autoTable }, logo] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
    cargarLogo(),
  ])

  const doc = new jsPDF({ orientation: orientacionDelPdf(columnas.length, orientacion), unit: 'mm', format: 'a4' })
  const anchoPagina = doc.internal.pageSize.getWidth()
  const altoPagina = doc.internal.pageSize.getHeight()

  // ---- cabecera ----
  let y = MARGEN
  let xTexto = MARGEN
  if (logo) {
    const alto = 14
    const ancho = (logo.ancho / logo.alto) * alto
    doc.addImage(logo.datos, 'PNG', MARGEN, y - 2, ancho, alto)
    xTexto = MARGEN + ancho + 4
  }
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(...VERDE_MARCA)
  doc.text(MARCA.nombre, xTexto, y + 4)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(90, 90, 80)
  doc.text(MARCA.subtitulo, xTexto, y + 9)
  y += 18

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(...VERDE_MARCA)
  doc.text(titulo, MARGEN, y)
  y += 6

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(60, 60, 50)
  doc.text(`Generado el ${formatearFechaHora(ahora)} por ${usuario}`, MARGEN, y)
  y += 5
  const lineasFiltros = doc.splitTextToSize(lineaDeFiltros(filtros), anchoPagina - MARGEN * 2)
  doc.text(lineasFiltros, MARGEN, y)
  y += lineasFiltros.length * 4
  const textoResumen = lineaDeResumen(resumen)
  if (textoResumen) {
    doc.setFont('helvetica', 'bold')
    const lineasResumen = doc.splitTextToSize(textoResumen, anchoPagina - MARGEN * 2)
    doc.text(lineasResumen, MARGEN, y + 1)
    doc.setFont('helvetica', 'normal')
    y += lineasResumen.length * 4 + 1
  }
  y += 3

  // ---- tabla ----
  autoTable(doc, {
    startY: y,
    head: [columnas.map((columna) => columna.titulo)],
    body: filas.map((fila) => columnas.map((columna) => textoDeCelda(fila[columna.clave], columna))),
    theme: 'striped',
    margin: { top: MARGEN, left: MARGEN, right: MARGEN, bottom: 14 },
    styles: { font: 'helvetica', fontSize: 8, cellPadding: 1.8, textColor: [30, 40, 25], overflow: 'linebreak' },
    headStyles: { fillColor: VERDE_MARCA, textColor: CREMA_MARCA, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: FILA_ALTERNA },
    columnStyles: Object.fromEntries(columnas.map((columna, indice) => [indice, { halign: alineacionDe(columna) }])),
    showHead: 'everyPage',
    // columnStyles alinea solo el cuerpo: el encabezado se alinea igual que su columna.
    didParseCell: (datosCelda) => {
      if (datosCelda.section === 'head') {
        datosCelda.cell.styles.halign = alineacionDe(columnas[datosCelda.column.index])
      }
    },
  })

  // ---- total de registros ----
  let yFinal = (doc.lastAutoTable?.finalY ?? y) + 7
  if (yFinal > altoPagina - 16) {
    doc.addPage()
    yFinal = MARGEN + 4
  }
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...VERDE_MARCA)
  doc.text(`Total de registros: ${filas.length}`, MARGEN, yFinal)

  // ---- pie: "Página X de Y" (recién se sabe Y al terminar) ----
  const paginas = doc.getNumberOfPages()
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(90, 90, 80)
  for (let pagina = 1; pagina <= paginas; pagina += 1) {
    doc.setPage(pagina)
    doc.text(`Página ${pagina} de ${paginas}`, anchoPagina / 2, altoPagina - 7, { align: 'center' })
  }

  return doc.output('blob')
}

/** Genera el PDF y lo descarga como <listado>_aaaa-mm-dd.pdf. Devuelve el nombre del archivo. */
export async function generarPdf(datos) {
  const ahora = datos.ahora ?? new Date()
  const blob = await construirPdf({ ...datos, ahora })
  const nombre = nombreDeArchivo(datos.listado ?? 'listado', 'pdf', ahora)
  descargarArchivo(blob, nombre)
  return nombre
}
