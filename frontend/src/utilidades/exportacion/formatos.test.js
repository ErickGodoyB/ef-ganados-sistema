import { describe, expect, it } from 'vitest'
import {
  alineacionDe,
  dimensionesDePng,
  fechaIsoADateUtc,
  fechaIsoDe,
  formatearFechaHora,
  formatearFechaIso,
  formatearNumero,
  lineaDeFiltros,
  nombreDeArchivo,
  orientacionDelPdf,
  textoDeCelda,
} from './formatos'

describe('formatearNumero', () => {
  it('usa coma decimal y punto de miles', () => {
    expect(formatearNumero(1234.5, 1)).toBe('1.234,5')
    expect(formatearNumero(0.8, 2)).toBe('0,80')
    expect(formatearNumero(12, 0)).toBe('12')
  })

  it('devuelve vacío si no es un número', () => {
    expect(formatearNumero(null)).toBe('')
    expect(formatearNumero(undefined)).toBe('')
    expect(formatearNumero(Number.NaN)).toBe('')
  })
})

describe('fechas', () => {
  it('formatearFechaIso: aaaa-mm-dd -> dd/mm/aaaa, sin tocar el huso', () => {
    expect(formatearFechaIso('2026-03-05')).toBe('05/03/2026')
    expect(formatearFechaIso('2026-03-05T10:00:00')).toBe('05/03/2026')
    expect(formatearFechaIso(null)).toBe('')
  })

  it('fechaIsoDe y formatearFechaHora usan la hora local con ceros', () => {
    const ahora = new Date(2026, 10, 8, 9, 5)

    expect(fechaIsoDe(ahora)).toBe('2026-11-08')
    expect(formatearFechaHora(ahora)).toBe('08/11/2026 09:05')
  })

  it('fechaIsoADateUtc: medianoche UTC de esa fecha (Excel la guarda sin corrimiento)', () => {
    expect(fechaIsoADateUtc('2026-03-05').toISOString()).toBe('2026-03-05T00:00:00.000Z')
    expect(fechaIsoADateUtc('')).toBeNull()
  })
})

describe('textoDeCelda', () => {
  it('formatea según el tipo de la columna', () => {
    expect(textoDeCelda(245.5, { tipo: 'numero', decimales: 1 })).toBe('245,5')
    expect(textoDeCelda(1.2, { tipo: 'numero', decimales: 2 })).toBe('1,20')
    expect(textoDeCelda(7, { tipo: 'entero' })).toBe('7')
    expect(textoDeCelda('2026-03-05', { tipo: 'fecha' })).toBe('05/03/2026')
    expect(textoDeCelda(true, { tipo: 'booleano' })).toBe('Sí')
    expect(textoDeCelda(false, { tipo: 'booleano' })).toBe('No')
    expect(textoDeCelda('Ñandú', { tipo: 'texto' })).toBe('Ñandú')
  })

  it('un valor vacío es texto vacío', () => {
    expect(textoDeCelda(null, { tipo: 'numero' })).toBe('')
    expect(textoDeCelda('', { tipo: 'fecha' })).toBe('')
  })
})

describe('alineacionDe', () => {
  it('respeta la indicada y, si falta, derecha para números e izquierda para el resto', () => {
    expect(alineacionDe({ tipo: 'numero' })).toBe('right')
    expect(alineacionDe({ tipo: 'entero' })).toBe('right')
    expect(alineacionDe({ tipo: 'texto' })).toBe('left')
    expect(alineacionDe({ tipo: 'fecha' })).toBe('left')
    expect(alineacionDe({ tipo: 'numero', alineacion: 'center' })).toBe('center')
  })
})

describe('lineaDeFiltros', () => {
  it('une los filtros con "·"', () => {
    expect(
      lineaDeFiltros([
        { etiqueta: 'Raza', valor: 'Brahman' },
        { etiqueta: 'GMD mínima', valor: '0,8' },
      ]),
    ).toBe('Raza: Brahman · GMD mínima: 0,8')
  })

  it('ignora los filtros sin valor y, sin ninguno, dice "Sin filtros"', () => {
    expect(lineaDeFiltros([{ etiqueta: 'Raza', valor: '' }, { etiqueta: 'Lote', valor: '  ' }])).toBe('Sin filtros')
    expect(lineaDeFiltros([])).toBe('Sin filtros')
    expect(lineaDeFiltros(undefined)).toBe('Sin filtros')
  })
})

describe('nombreDeArchivo', () => {
  it('es <listado>_aaaa-mm-dd.<extension>', () => {
    const ahora = new Date(2026, 10, 8, 9, 5)

    expect(nombreDeArchivo('animales', 'pdf', ahora)).toBe('animales_2026-11-08.pdf')
    expect(nombreDeArchivo('personas', 'xlsx', ahora)).toBe('personas_2026-11-08.xlsx')
  })
})

describe('orientacionDelPdf', () => {
  it('automática: horizontal con más de 6 columnas, vertical con 6 o menos', () => {
    expect(orientacionDelPdf(6)).toBe('portrait')
    expect(orientacionDelPdf(7)).toBe('landscape')
  })

  it('la elegida manda, sea cual sea la cantidad de columnas', () => {
    expect(orientacionDelPdf(10, 'vertical')).toBe('portrait')
    expect(orientacionDelPdf(2, 'horizontal')).toBe('landscape')
  })
})

describe('dimensionesDePng', () => {
  it('lee ancho y alto de la cabecera IHDR', () => {
    const bytes = new Uint8Array(24)
    bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    new DataView(bytes.buffer).setUint32(16, 300)
    new DataView(bytes.buffer).setUint32(20, 120)

    expect(dimensionesDePng(bytes)).toEqual({ ancho: 300, alto: 120 })
  })

  it('devuelve null si no es un PNG', () => {
    expect(dimensionesDePng(new Uint8Array(30))).toBeNull()
    expect(dimensionesDePng(new Uint8Array(3))).toBeNull()
  })
})
