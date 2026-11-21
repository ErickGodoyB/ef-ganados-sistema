/**
 * Exportación de un listado a PDF (A4) con jsPDF y jspdf-autotable, que se
 * cargan con import() dinámico recién al generar el archivo, para no
 * agrandar la carga inicial de la app.
 *
 * Diseño: una franja superior con el logo a la izquierda (si no carga, el
 * nombre de la empresa en texto), el NOMBRE DEL LISTADO centrado y en grande
 * con el contexto en una línea más chica debajo, y a la derecha, chico,
 * cuándo y quién lo generó; una línea fina de color de marca la separa del
 * resto. Debajo, a la izquierda, "Filtros aplicados:" con la lista (o "Sin
 * filtros"). Después la tabla (encabezado repetido en cada página, colores de
 * la marca, filas alternadas) y, al final, un cuadro de "Totales" con los
 * totales propios de cada listado. En el pie de cada página, "Página X de Y".
 *
 * Los textos usan la fuente estándar (Helvetica, WinAnsi): acentos, ñ y el
 * punto medio "·" salen bien; por eso los separadores y símbolos se limitan
 * a ese juego de caracteres.
 */

import { MARCA } from '../../configuracion/marca'
import { descargarArchivo } from './descarga'
import {
  alineacionDe,
  armarCabecera,
  nombreDeArchivo,
  orientacionDelPdf,
  textoDeCelda,
  totalesConValor,
} from './formatos'
import { cargarLogo } from './logo'

// Colores de la marca (ver index.css): verde oscuro #183D09 en el encabezado,
// crema #EFE7D4 como texto sobre él, y un crema muy suave en las filas alternas.
const VERDE_MARCA = [24, 61, 9]
const CREMA_MARCA = [239, 231, 212]
const FILA_ALTERNA = [247, 243, 232]
const BORDE_SUAVE = [190, 180, 150]
const MARGEN = 12
/** Ancho reservado a cada lado de la franja (logo a la izquierda, "generado por" a la derecha): el título se centra en lo que sobra. */
const ANCHO_LATERAL = 50

/**
 * Dibuja la franja de cabecera y devuelve la "y" donde sigue el contenido.
 * El título se achica (de 18 a 12 pt) hasta entrar entre el logo y el bloque
 * de la derecha; si ni así entra, se parte en dos líneas.
 */
function dibujarCabecera(doc, cabecera, logo, anchoPagina) {
  const arriba = MARGEN
  const centro = anchoPagina / 2
  const anchoTitulo = anchoPagina - 2 * MARGEN - 2 * ANCHO_LATERAL

  // Izquierda: logo, o el nombre de la empresa en texto.
  if (logo) {
    const alto = 14
    doc.addImage(logo.datos, 'PNG', MARGEN, arriba, (logo.ancho / logo.alto) * alto, alto)
  } else {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.setTextColor(...VERDE_MARCA)
    doc.text(doc.splitTextToSize(MARCA.nombre, ANCHO_LATERAL - 4), MARGEN, arriba + 6)
  }

  // Derecha: cuándo y quién lo generó, chico.
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(90, 90, 80)
  doc.text(cabecera.generado, anchoPagina - MARGEN, arriba + 4, { align: 'right' })
  doc.text(cabecera.por, anchoPagina - MARGEN, arriba + 8, { align: 'right' })

  // Centro: el nombre del listado, grande.
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...VERDE_MARCA)
  let tamano = 18
  doc.setFontSize(tamano)
  while (tamano > 12 && doc.getTextWidth(cabecera.titulo) > anchoTitulo) {
    tamano -= 1
    doc.setFontSize(tamano)
  }
  const lineasTitulo = doc.splitTextToSize(cabecera.titulo, anchoTitulo)
  doc.text(lineasTitulo, centro, arriba + 6, { align: 'center' })
  let y = arriba + 6 + (lineasTitulo.length - 1) * (tamano * 0.4)

  // Debajo del título, el contexto en una línea más chica.
  if (cabecera.contexto) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(60, 60, 50)
    const lineasContexto = doc.splitTextToSize(cabecera.contexto, anchoPagina - 2 * MARGEN - 2 * ANCHO_LATERAL + 20)
    doc.text(lineasContexto, centro, y + 5, { align: 'center' })
    y += 5 + (lineasContexto.length - 1) * 4
  }

  // Línea fina de color de marca que separa la cabecera del resto.
  const yLinea = Math.max(y + 5, arriba + 16)
  doc.setDrawColor(...VERDE_MARCA)
  doc.setLineWidth(0.5)
  doc.line(MARGEN, yLinea, anchoPagina - MARGEN, yLinea)
  return yLinea + 5
}

/** Dibuja "Filtros aplicados:" y su lista (o "Sin filtros") a la izquierda; devuelve la "y" siguiente. */
function dibujarFiltros(doc, cabecera, y, anchoPagina) {
  doc.setFontSize(9)
  doc.setTextColor(60, 60, 50)
  doc.setFont('helvetica', 'bold')
  if (!cabecera.hayFiltros) {
    doc.text('Filtros aplicados:', MARGEN, y)
    const ancho = doc.getTextWidth('Filtros aplicados: ')
    doc.setFont('helvetica', 'normal')
    doc.text('Sin filtros', MARGEN + ancho, y)
    return y + 6
  }
  doc.text('Filtros aplicados:', MARGEN, y)
  doc.setFont('helvetica', 'normal')
  const lineas = doc.splitTextToSize(cabecera.filtros, anchoPagina - 2 * MARGEN)
  doc.text(lineas, MARGEN, y + 4)
  return y + 4 + lineas.length * 4 + 2
}

/**
 * Dibuja el cuadro de "Totales" (caja con borde suave) al final. Pasa de
 * página si no entra. Sin totales propios, muestra solo el total de registros.
 */
function dibujarTotales(doc, totales, cantidadFilas, yInicial, anchoPagina, altoPagina) {
  const lista = totalesConValor(totales)
  const entradas = lista.length > 0 ? lista.map((total) => `${total.etiqueta}: ${total.valor}`) : [`Total de registros: ${cantidadFilas}`]
  const ancho = anchoPagina - 2 * MARGEN
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  const lineas = entradas.flatMap((entrada) => doc.splitTextToSize(entrada, ancho - 8))
  const alto = 10 + lineas.length * 4.5

  let y = yInicial
  if (y + alto > altoPagina - 16) {
    doc.addPage()
    y = MARGEN
  }
  doc.setDrawColor(...BORDE_SUAVE)
  doc.setLineWidth(0.3)
  doc.roundedRect(MARGEN, y, ancho, alto, 2, 2)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...VERDE_MARCA)
  doc.text('Totales', MARGEN + 4, y + 6)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(40, 50, 35)
  doc.text(lineas, MARGEN + 4, y + 11)
}

/**
 * Arma el PDF y devuelve el Blob (sin descargarlo; ver generarPdf).
 *
 * @param {object} datos
 * @param {string} datos.titulo Nombre del listado (va centrado y en grande).
 * @param {{etiqueta: string, valor: string}[]} [datos.contexto] Contexto bajo el título ("Sesión S-… · Lote X").
 * @param {{etiqueta: string, valor: string}[]} datos.filtros Filtros aplicados.
 * @param {object[]} datos.columnas Columnas (ver formatos.js).
 * @param {object[]} datos.filas Filas: objetos con un valor por clave de columna.
 * @param {object[]} [datos.totales] Totales del listado (ver totalNumerico y totalTexto en formatos.js), en el cuadro del final.
 * @param {'automatica'|'vertical'|'horizontal'} [datos.orientacion]
 * @param {string} datos.usuario Quién genera el archivo.
 * @param {Date} [datos.ahora] Momento de generación (se puede fijar para pruebas).
 */
export async function construirPdf({
  titulo,
  contexto,
  filtros,
  columnas,
  filas,
  totales,
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
  const cabecera = armarCabecera({ titulo, contexto, filtros, usuario, ahora })

  let y = dibujarCabecera(doc, cabecera, logo, anchoPagina)
  y = dibujarFiltros(doc, cabecera, y, anchoPagina)

  // ---- tabla ----
  autoTable(doc, {
    startY: y + 1,
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

  // ---- cuadro de totales ----
  dibujarTotales(doc, totales, filas.length, (doc.lastAutoTable?.finalY ?? y) + 8, anchoPagina, altoPagina)

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
