import { describe, expect, it } from 'vitest'
import {
  alineacionDe,
  armarCabecera,
  dimensionesDePng,
  fechaIsoADateUtc,
  fechaIsoDe,
  formatearFechaHora,
  formatearFechaIso,
  formatearNumero,
  lineaDeFiltros,
  lineaDeContexto,
  nombreDeArchivo,
  orientacionDelPdf,
  textoDeCelda,
  totalesConValor,
  totalNumerico,
  totalTexto,
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
  it('traduce la indicada: "centro" a center e "izquierda" a left', () => {
    expect(alineacionDe({ tipo: 'texto', alineacion: 'centro' })).toBe('center')
    expect(alineacionDe({ tipo: 'numero', alineacion: 'izquierda' })).toBe('left')
  })

  it('si falta, centra números, fechas y sí/no, y deja los textos a la izquierda', () => {
    expect(alineacionDe({ tipo: 'numero' })).toBe('center')
    expect(alineacionDe({ tipo: 'entero' })).toBe('center')
    expect(alineacionDe({ tipo: 'fecha' })).toBe('center')
    expect(alineacionDe({ tipo: 'booleano' })).toBe('center')
    expect(alineacionDe({ tipo: 'texto' })).toBe('left')
    expect(alineacionDe({})).toBe('left')
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

describe('lineaDeContexto', () => {
  it('une los datos como "etiqueta valor" (sin dos puntos) con "·"', () => {
    expect(
      lineaDeContexto([
        { etiqueta: 'Sesión', valor: 'S-261029-3' },
        { etiqueta: 'Lote', valor: 'Recría' },
      ]),
    ).toBe('Sesión S-261029-3 · Lote Recría')
  })

  it('ignora los datos sin valor y, sin ninguno (o sin contexto), devuelve vacío', () => {
    expect(lineaDeContexto([{ etiqueta: 'A', valor: '' }, { etiqueta: 'B', valor: '1' }])).toBe('B 1')
    expect(lineaDeContexto([])).toBe('')
    expect(lineaDeContexto(undefined)).toBe('')
  })
})

describe('totalNumerico y totalTexto', () => {
  it('totalNumerico trae el texto con coma y unidad, y el número real', () => {
    expect(totalNumerico('Peso promedio', 312.44, { decimales: 1, unidad: 'kg' })).toEqual({
      etiqueta: 'Peso promedio',
      valor: '312,4 kg',
      numero: 312.44,
      decimales: 1,
      unidad: 'kg',
    })
    expect(totalNumerico('Animales', 20)).toMatchObject({ valor: '20', numero: 20, decimales: 0 })
  })

  it('sin número queda "—" y numero en null', () => {
    expect(totalNumerico('GMD promedio', null, { decimales: 3, unidad: 'kg/día' })).toMatchObject({ valor: '—', numero: null })
    expect(totalNumerico('GMD promedio', undefined)).toMatchObject({ valor: '—', numero: null })
  })

  it('totalTexto es solo etiqueta y valor', () => {
    expect(totalTexto('Mejor proveedor', 'Ana')).toEqual({ etiqueta: 'Mejor proveedor', valor: 'Ana' })
  })

  it('totalesConValor descarta los vacíos', () => {
    expect(totalesConValor([{ etiqueta: 'A', valor: '' }, { etiqueta: 'B', valor: '1' }, { etiqueta: 'C' }])).toEqual([
      { etiqueta: 'B', valor: '1' },
    ])
    expect(totalesConValor(undefined)).toEqual([])
  })
})

describe('armarCabecera', () => {
  const AHORA = new Date(2026, 10, 8, 9, 5)

  it('arma el título, el contexto, cuándo y quién lo generó, y los filtros', () => {
    const cabecera = armarCabecera({
      titulo: 'Detalle de sesión de pesaje',
      contexto: [
        { etiqueta: 'Sesión', valor: 'S-261029-3' },
        { etiqueta: 'Lote', valor: 'Recría' },
      ],
      filtros: [{ etiqueta: 'Raza', valor: 'Brahman' }],
      usuario: 'Ana Pérez',
      ahora: AHORA,
    })

    expect(cabecera).toEqual({
      titulo: 'Detalle de sesión de pesaje',
      contexto: 'Sesión S-261029-3 · Lote Recría',
      generado: 'Generado el 08/11/2026 09:05',
      por: 'por Ana Pérez',
      hayFiltros: true,
      filtros: 'Raza: Brahman',
    })
  })

  it('sin filtros dice "Sin filtros" y sin contexto, el contexto queda vacío', () => {
    const cabecera = armarCabecera({ titulo: 'Animales', filtros: [], usuario: 'Ana', ahora: AHORA })

    expect(cabecera.hayFiltros).toBe(false)
    expect(cabecera.filtros).toBe('Sin filtros')
    expect(cabecera.contexto).toBe('')
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
