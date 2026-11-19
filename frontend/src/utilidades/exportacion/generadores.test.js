import { afterEach, describe, expect, it, vi } from 'vitest'
import { anchoDeColumna, construirExcel, FILA_CABECERA, filaDeCabecera, valorDeCeldaExcel } from './generarExcel'
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

    expect(hoja.getCell('A1').value).toBe('EF Ganados')
    expect(hoja.getCell('A2').value).toBe('Animales')
    expect(hoja.getCell('A3').value).toBe('Filtros: Raza: Brahman')
    expect(hoja.getCell('A4').value).toBe('Generado el 08/11/2026 09:05 por Ana Pérez')
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

describe('construirExcel: alineación y resumen', () => {
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

  it('sin resumen, la cabecera de la tabla queda en la fila de siempre', async () => {
    const hoja = await leerLibro({})

    expect(hoja.getCell('A5').value).toBeNull()
    expect(hoja.getRow(FILA_CABECERA).getCell(1).value).toBe('Nombre')
    expect(hoja.views[0].ySplit).toBe(FILA_CABECERA)
  })

  it('con resumen, va en la cabecera después de los filtros y la tabla baja una fila', async () => {
    const hoja = await leerLibro({
      resumen: [{ etiqueta: 'Animales', valor: '20' }, { etiqueta: 'Peso promedio', valor: '312,4 kg' }],
    })

    expect(hoja.getCell('A5').value).toBe('Animales: 20 · Peso promedio: 312,4 kg')
    expect(hoja.getRow(filaDeCabecera([{ etiqueta: 'a', valor: 'b' }])).getCell(1).value).toBe('Nombre')
    expect(hoja.getRow(FILA_CABECERA + 2).getCell(1).value).toBe('Ñandú Núñez')
    expect(hoja.views[0].ySplit).toBe(FILA_CABECERA + 1)
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
