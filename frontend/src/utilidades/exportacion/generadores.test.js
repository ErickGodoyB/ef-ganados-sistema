import { afterEach, describe, expect, it, vi } from 'vitest'
import { anchoDeColumna, celdaDeTotal, construirExcel, FILA_CABECERA, repartoDeEncabezado, valorDeCeldaExcel } from './generarExcel'
import { totalNumerico, totalTexto } from './formatos'
import { construirPdf } from './generarPdf'

/** Primeros bytes de un Blob (FileReader: el Blob de jsdom no trae arrayBuffer()). */
function leerBytes(blob) {
  return new Promise((resolver, rechazar) => {
    const lector = new FileReader()
    lector.onload = () => resolver(new Uint8Array(lector.result))
    lector.onerror = () => rechazar(lector.error)
    lector.readAsArrayBuffer(blob)
  })
}

const COLUMNAS = [
  { clave: 'nombre', titulo: 'Nombre', tipo: 'texto' },
  { clave: 'peso', titulo: 'Peso (kg)', tipo: 'numero', decimales: 1 },
  { clave: 'ingreso', titulo: 'Ingreso', tipo: 'fecha' },
  { clave: 'apto', titulo: 'Apto', tipo: 'booleano' },
]
const FILAS = [
  { nombre: 'Ñandú Núñez', peso: 245.5, ingreso: '2026-03-05', apto: true },
  { nombre: 'Ana', peso: null, ingreso: null, apto: false },
]
const FILTROS = [{ etiqueta: 'Raza', valor: 'Brahman' }]
const AHORA = new Date(2026, 10, 8, 9, 5)

afterEach(() => {
  vi.restoreAllMocks()
})

describe('construirPdf (prueba de humo)', () => {
  it('produce un archivo PDF (empieza con %PDF) aunque el logo no se pueda cargar', async () => {
    // Sin servidor, el logo falla: la cabecera usa solo el nombre de la empresa en texto.
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('sin red')))

    const blob = await construirPdf({
      titulo: 'Animales',
      filtros: FILTROS,
      columnas: COLUMNAS,
      filas: FILAS,
      usuario: 'Ana Pérez',
      ahora: AHORA,
    })

    const bytes = await leerBytes(blob)
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe('%PDF-')
    expect(blob.size).toBeGreaterThan(1000)
    vi.unstubAllGlobals()
  })

  it('con muchas filas y columnas genera varias páginas sin fallar', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('sin red')))
    const filas = Array.from({ length: 120 }, (_, i) => ({ nombre: `Animal ${i}`, peso: 200 + i, ingreso: '2026-01-01', apto: i % 2 === 0 }))

    const blob = await construirPdf({
      titulo: 'Animales',
      filtros: [],
      columnas: COLUMNAS,
      filas,
      orientacion: 'horizontal',
      usuario: 'Ana',
      ahora: AHORA,
    })

    const bytes = await leerBytes(blob)
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe('%PDF-')
    vi.unstubAllGlobals()
  })
})

describe('construirExcel (prueba de humo)', () => {
  it('produce un archivo zip (empieza con PK), que es lo que es un .xlsx', async () => {
    const blob = await construirExcel({
      titulo: 'Animales',
      filtros: FILTROS,
      columnas: COLUMNAS,
      filas: FILAS,
      usuario: 'Ana Pérez',
      ahora: AHORA,
    })

    const bytes = await leerBytes(blob)
    expect(String.fromCharCode(bytes[0], bytes[1])).toBe('PK')
    expect(blob.type).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  })

  it('el libro tiene la empresa, el título, los filtros y los valores reales (números y fechas, no texto)', async () => {
    const ExcelJS = (await import('exceljs')).default
    const blob = await construirExcel({
      titulo: 'Animales',
      filtros: FILTROS,
      columnas: COLUMNAS,
      filas: FILAS,
      usuario: 'Ana Pérez',
      ahora: AHORA,
    })
    const libro = new ExcelJS.Workbook()
    await libro.xlsx.load(await leerBytes(blob))
    const hoja = libro.getWorksheet('Animales')

    // Fila 1: el nombre del listado, centrado y combinado. Fila 3: filtros a la izquierda y "generado por" a la derecha.
    expect(hoja.getCell('A1').value).toBe('Animales')
    expect(hoja.getCell('A1').alignment.horizontal).toBe('center')
    expect(hoja.getCell('A3').value).toBe('Filtros aplicados: Raza: Brahman')
    expect(hoja.getCell('C3').value).toBe('Generado el 08/11/2026 09:05')
    expect(hoja.getCell('C4').value).toBe('por Ana Pérez')
    expect(hoja.getCell('C3').alignment.horizontal).toBe('right')
    const cabecera = hoja.getRow(FILA_CABECERA)
    expect(cabecera.getCell(1).value).toBe('Nombre')
    expect(cabecera.getCell(1).font.bold).toBe(true)
    expect(cabecera.getCell(1).fill.fgColor.argb).toBe('FF183D09')
    const primera = hoja.getRow(FILA_CABECERA + 1)
    expect(primera.getCell(1).value).toBe('Ñandú Núñez')
    expect(primera.getCell(2).value).toBe(245.5)
    expect(typeof primera.getCell(2).value).toBe('number')
    expect(primera.getCell(3).value).toBeInstanceOf(Date)
    expect(primera.getCell(3).value.toISOString()).toBe('2026-03-05T00:00:00.000Z')
    expect(primera.getCell(4).value).toBe('Sí')
    // Valores vacíos quedan como celdas vacías.
    expect(hoja.getRow(FILA_CABECERA + 2).getCell(2).value).toBeNull()
    // Congelada hasta la cabecera y con autofiltro.
    expect(hoja.views[0]).toMatchObject({ state: 'frozen', ySplit: FILA_CABECERA })
    expect(hoja.autoFilter).toBeTruthy()
  })
})

describe('construirExcel: encabezado, alineación y totales', () => {
  async function leerLibro(datos) {
    const ExcelJS = (await import('exceljs')).default
    const blob = await construirExcel({ titulo: 'Animales', filtros: [], columnas: COLUMNAS, filas: FILAS, usuario: 'Ana', ahora: AHORA, ...datos })
    const libro = new ExcelJS.Workbook()
    await libro.xlsx.load(await leerBytes(blob))
    return libro.getWorksheet('Animales')
  }

  it('centra los números, las fechas y los sí/no (cabecera y celdas) y deja el texto a la izquierda', async () => {
    const hoja = await leerLibro({})
    const cabecera = hoja.getRow(FILA_CABECERA)
    const datos = hoja.getRow(FILA_CABECERA + 1)

    // COLUMNAS: nombre (texto), peso (número), ingreso (fecha), apto (booleano).
    expect(['left', 'center', 'center', 'center']).toEqual([1, 2, 3, 4].map((c) => cabecera.getCell(c).alignment.horizontal))
    expect(['left', 'center', 'center', 'center']).toEqual([1, 2, 3, 4].map((c) => datos.getCell(c).alignment.horizontal))
  })

  it('los números mantienen los decimales de su columna (1 en el peso)', async () => {
    const hoja = await leerLibro({ filas: [{ nombre: 'A', peso: 200, ingreso: '2026-03-05', apto: true }] })

    expect(hoja.getRow(FILA_CABECERA + 1).getCell(2).numFmt).toBe('#,##0.0')
  })

  it('el contexto va centrado bajo el título y sin filtros dice "Sin filtros"', async () => {
    const hoja = await leerLibro({ contexto: [{ etiqueta: 'Sesión', valor: 'S-1' }, { etiqueta: 'Lote', valor: 'A' }] })

    expect(hoja.getCell('A2').value).toBe('Sesión: S-1 · Lote: A')
    expect(hoja.getCell('A2').alignment.horizontal).toBe('center')
    expect(hoja.getCell('A3').value).toBe('Filtros aplicados: Sin filtros')
    expect(hoja.getRow(FILA_CABECERA).getCell(1).value).toBe('Nombre')
    expect(hoja.views[0].ySplit).toBe(FILA_CABECERA)
  })

  it('los totales van al final, con su valor como número real cuando corresponde', async () => {
    const hoja = await leerLibro({
      totales: [
        totalNumerico('Animales', 2),
        totalNumerico('Peso promedio', 245.5, { decimales: 1, unidad: 'kg' }),
        totalNumerico('GMD promedio', null, { decimales: 3, unidad: 'kg/día' }),
        totalTexto('Mejor proveedor', 'Ana (GMD 3,5)'),
      ],
    })

    // Tabla: filas 7 y 8; en blanco la 9; "Totales" en la 10 y un total por fila desde la 11.
    expect(hoja.getCell('A10').value).toBe('Totales')
    expect(hoja.getCell('A11').value).toBe('Animales')
    expect(hoja.getCell('C11').value).toBe(2)
    expect(typeof hoja.getCell('C11').value).toBe('number')
    expect(hoja.getCell('A12').value).toBe('Peso promedio (kg)')
    expect(hoja.getCell('C12').value).toBe(245.5)
    expect(hoja.getCell('C12').numFmt).toBe('#,##0.0')
    // Sin dato: texto "—", no un número.
    expect(hoja.getCell('C13').value).toBe('—')
    expect(hoja.getCell('C14').value).toBe('Ana (GMD 3,5)')
  })

  it('los totales quedan fuera del autofiltro de la tabla', async () => {
    const hoja = await leerLibro({ totales: [totalNumerico('Animales', 2)] })

    // La tabla ocupa de la cabecera (fila 6) a la última fila de datos (8): los totales, más abajo, quedan afuera.
    expect(hoja.autoFilter).toBe('A6:D8')
  })

  it('sin totales propios, cierra con el total de registros', async () => {
    const hoja = await leerLibro({})

    expect(hoja.getCell('A10').value).toBe('Total de registros')
    expect(hoja.getCell('C10').value).toBe(2)
  })

  it('con pocas columnas (menos de 4) filtros y "generado por" van uno debajo del otro, a todo el ancho', async () => {
    const hoja = await leerLibro({ columnas: COLUMNAS.slice(0, 2) })

    expect(hoja.getCell('A3').value).toBe('Filtros aplicados: Sin filtros')
    expect(hoja.getCell('A4').value).toBe('Generado el 08/11/2026 09:05 por Ana')
  })

  it('con una sola columna no falla (no combina una celda consigo misma)', async () => {
    const hoja = await leerLibro({ columnas: COLUMNAS.slice(0, 1) })

    expect(hoja.getCell('A1').value).toBe('Animales')
  })
})

describe('repartoDeEncabezado y celdaDeTotal', () => {
  it('con 4 o más columnas se divide en mitades; con menos, no', () => {
    expect(repartoDeEncabezado(4)).toEqual({ dividido: true, izquierdaHasta: 2, derechaDesde: 3 })
    expect(repartoDeEncabezado(7)).toEqual({ dividido: true, izquierdaHasta: 4, derechaDesde: 5 })
    expect(repartoDeEncabezado(3).dividido).toBe(false)
  })

  it('un total numérico va como número con su formato y la unidad en la etiqueta; el resto, como texto', () => {
    expect(celdaDeTotal(totalNumerico('GMD promedio', 1.2, { decimales: 3, unidad: 'kg/día' }))).toEqual({
      etiqueta: 'GMD promedio (kg/día)',
      valor: 1.2,
      formato: '#,##0.000',
    })
    expect(celdaDeTotal(totalNumerico('Animales', 20))).toEqual({ etiqueta: 'Animales', valor: 20, formato: '#,##0' })
    expect(celdaDeTotal(totalTexto('Mejor proveedor', 'Ana'))).toEqual({ etiqueta: 'Mejor proveedor', valor: 'Ana', formato: null })
  })
})

describe('valorDeCeldaExcel y anchoDeColumna', () => {
  it('número real, fecha real, texto para el resto y null si está vacío', () => {
    expect(valorDeCeldaExcel(3.5, { tipo: 'numero' })).toBe(3.5)
    expect(valorDeCeldaExcel('2026-03-05', { tipo: 'fecha' })).toBeInstanceOf(Date)
    expect(valorDeCeldaExcel(true, { tipo: 'booleano' })).toBe('Sí')
    expect(valorDeCeldaExcel('Hola', { tipo: 'texto' })).toBe('Hola')
    expect(valorDeCeldaExcel(null, { tipo: 'numero' })).toBeNull()
  })

  it('el ancho sale del contenido más largo, entre 10 y 40', () => {
    expect(anchoDeColumna({ clave: 'a', titulo: 'A', tipo: 'texto' }, [{ a: 'corto' }])).toBe(10)
    expect(anchoDeColumna({ clave: 'a', titulo: 'A', tipo: 'texto' }, [{ a: 'x'.repeat(20) }])).toBe(22)
    expect(anchoDeColumna({ clave: 'a', titulo: 'A', tipo: 'texto' }, [{ a: 'x'.repeat(100) }])).toBe(40)
    expect(anchoDeColumna({ clave: 'a', titulo: 'Un título bastante largo', tipo: 'texto' }, [])).toBe(26)
  })
})
