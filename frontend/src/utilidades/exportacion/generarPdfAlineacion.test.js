import { afterEach, describe, expect, it, vi } from 'vitest'
import autoTable from 'jspdf-autotable'
import { construirPdf } from './generarPdf'

// Se envuelve autoTable para poder ver con qué opciones lo llama generarPdf (el PDF
// resultante es binario y no deja leer la alineación de cada celda).
vi.mock('jspdf-autotable', async (importarOriginal) => {
  const original = await importarOriginal()
  return { ...original, default: vi.fn(original.default) }
})

const COLUMNAS = [
  { clave: 'nombre', titulo: 'Nombre', tipo: 'texto', alineacion: 'izquierda' },
  { clave: 'peso', titulo: 'Peso (kg)', tipo: 'numero', decimales: 1, alineacion: 'centro' },
  { clave: 'ingreso', titulo: 'Ingreso', tipo: 'fecha', alineacion: 'centro' },
  { clave: 'apto', titulo: 'Apto', tipo: 'booleano', alineacion: 'centro' },
]
const FILAS = [{ nombre: 'Ana', peso: 245.5, ingreso: '2026-03-05', apto: true }]
const AHORA = new Date(2026, 10, 8, 9, 5)

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('PDF: alineación', () => {
  it('el cuerpo se alinea por columna y el encabezado queda alineado igual que su columna', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('sin red')))

    await construirPdf({ titulo: 'Prueba', filtros: [], columnas: COLUMNAS, filas: FILAS, usuario: 'Ana', ahora: AHORA })

    const opciones = autoTable.mock.calls.at(-1)[1]
    expect(Object.values(opciones.columnStyles).map((estilo) => estilo.halign)).toEqual(['left', 'center', 'center', 'center'])
    const alineacionDeEncabezado = COLUMNAS.map((_columna, indice) => {
      const celda = { styles: {} }
      opciones.didParseCell({ section: 'head', column: { index: indice }, cell: celda })
      return celda.styles.halign
    })
    expect(alineacionDeEncabezado).toEqual(['left', 'center', 'center', 'center'])
  })

  it('el hook no toca las celdas del cuerpo', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('sin red')))
    await construirPdf({ titulo: 'Prueba', filtros: [], columnas: COLUMNAS, filas: FILAS, usuario: 'Ana', ahora: AHORA })

    const opciones = autoTable.mock.calls.at(-1)[1]
    const celda = { styles: {} }
    opciones.didParseCell({ section: 'body', column: { index: 1 }, cell: celda })

    expect(celda.styles.halign).toBeUndefined()
  })

  it('con resumen sigue generando un PDF válido', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('sin red')))

    const blob = await construirPdf({
      titulo: 'Prueba',
      filtros: [{ etiqueta: 'Raza', valor: 'Brahman' }],
      resumen: [{ etiqueta: 'Animales', valor: '20' }, { etiqueta: 'Peso promedio', valor: '312,4 kg' }],
      columnas: COLUMNAS,
      filas: FILAS,
      usuario: 'Ana',
      ahora: AHORA,
    })

    const lector = new FileReader()
    const bytes = await new Promise((resolver) => {
      lector.onload = () => resolver(new Uint8Array(lector.result))
      lector.readAsArrayBuffer(blob)
    })
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe('%PDF-')
  })
})
