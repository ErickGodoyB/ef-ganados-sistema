import { describe, expect, it } from 'vitest'
import {
  agregarPorRaza,
  agruparEnOtros,
  calcularPorciones,
  caminoDeSector,
  escalaDeEjeY,
  escalaLineal,
  loteDeLaSesionMasReciente,
  lotesDeSesiones,
  porcentajesEnteros,
  puntoEnCirculo,
  puntosDeLinea,
  serieDePesoPorLote,
} from './graficos'

describe('agruparEnOtros', () => {
  const items = (valores) => valores.map((valor, i) => ({ etiqueta: `E${i + 1}`, valor }))

  it('ordena de mayor a menor y descarta los ceros', () => {
    expect(agruparEnOtros(items([3, 0, 9, 5])).map((i) => i.valor)).toEqual([9, 5, 3])
  })

  it('con 6 o menos no agrupa nada', () => {
    expect(agruparEnOtros(items([1, 2, 3, 4, 5, 6]))).toHaveLength(6)
  })

  it('con más de 6 deja 5 propias y una "Otros" con la suma del resto (máximo 6 en total)', () => {
    const resultado = agruparEnOtros(items([10, 9, 8, 7, 6, 5, 4]))

    expect(resultado).toHaveLength(6)
    expect(resultado.slice(0, 5).map((i) => i.valor)).toEqual([10, 9, 8, 7, 6])
    expect(resultado[5]).toEqual({ etiqueta: 'Otros', valor: 9, esOtros: true })
  })

  it('respeta otro máximo', () => {
    const resultado = agruparEnOtros(items([5, 4, 3, 2]), 3)

    expect(resultado).toEqual([
      { etiqueta: 'E1', valor: 5 },
      { etiqueta: 'E2', valor: 4 },
      { etiqueta: 'Otros', valor: 5, esOtros: true },
    ])
  })

  it('con empate de valores desempata por etiqueta, para que el orden sea estable', () => {
    const resultado = agruparEnOtros([{ etiqueta: 'B', valor: 2 }, { etiqueta: 'A', valor: 2 }])

    expect(resultado.map((i) => i.etiqueta)).toEqual(['A', 'B'])
  })
})

describe('porcentajesEnteros', () => {
  it('suman exactamente 100 aunque el redondeo simple diera 99', () => {
    const porcentajes = porcentajesEnteros([1, 1, 1])

    expect(porcentajes.reduce((a, b) => a + b, 0)).toBe(100)
    expect([...porcentajes].sort()).toEqual([33, 33, 34])
  })

  it('reparte sobre exactos sin resto', () => {
    expect(porcentajesEnteros([1, 3])).toEqual([25, 75])
  })

  it('con un solo dato es 100 y con total 0, todo 0', () => {
    expect(porcentajesEnteros([7])).toEqual([100])
    expect(porcentajesEnteros([0, 0])).toEqual([0, 0])
  })

  it('un valor 0 nunca recibe un punto del reparto', () => {
    expect(porcentajesEnteros([0, 1, 1, 1])).toEqual([0, 34, 33, 33])
  })
})

describe('calcularPorciones', () => {
  it('arranca a las 12 en punto y recorre la vuelta completa en sentido horario', () => {
    const porciones = calcularPorciones([
      { etiqueta: 'A', valor: 1 },
      { etiqueta: 'B', valor: 3 },
    ])

    expect(porciones[0].anguloInicio).toBeCloseTo(-Math.PI / 2)
    expect(porciones[0].anguloFin).toBeCloseTo(-Math.PI / 2 + Math.PI / 2)
    expect(porciones[1].anguloInicio).toBeCloseTo(porciones[0].anguloFin)
    expect(porciones[1].anguloFin).toBeCloseTo(-Math.PI / 2 + 2 * Math.PI)
    expect(porciones.map((p) => p.porcentaje)).toEqual([25, 75])
    expect(porciones.map((p) => p.indice)).toEqual([0, 1])
  })

  it('una porción de valor 0 queda con ancho 0', () => {
    const [cero] = calcularPorciones([{ etiqueta: 'A', valor: 0 }, { etiqueta: 'B', valor: 2 }])

    expect(cero.anguloFin - cero.anguloInicio).toBe(0)
  })
})

describe('puntoEnCirculo y caminoDeSector', () => {
  it('puntoEnCirculo: 0 rad es a la derecha, π/2 hacia abajo (eje y de SVG)', () => {
    expect(puntoEnCirculo(50, 50, 10, 0)).toEqual({ x: 60, y: 50 })
    expect(puntoEnCirculo(50, 50, 10, Math.PI / 2)).toEqual({ x: 50, y: 60 })
  })

  it('una porción común es un sector con dos arcos y dos líneas', () => {
    const camino = caminoDeSector({
      cx: 50,
      cy: 50,
      radioExterior: 40,
      radioInterior: 25,
      anguloInicio: -Math.PI / 2,
      anguloFin: 0,
    })

    expect(camino).toBe('M 50 10 A 40 40 0 0 1 90 50 L 75 50 A 25 25 0 0 0 50 25 Z')
  })

  it('una porción de más de media vuelta pide el arco largo', () => {
    const camino = caminoDeSector({
      cx: 50,
      cy: 50,
      radioExterior: 40,
      radioInterior: 25,
      anguloInicio: -Math.PI / 2,
      anguloFin: Math.PI,
    })

    expect(camino).toContain('A 40 40 0 1 1')
  })

  it('una porción de vuelta completa se dibuja con dos circunferencias', () => {
    const camino = caminoDeSector({
      cx: 50,
      cy: 50,
      radioExterior: 40,
      radioInterior: 25,
      anguloInicio: -Math.PI / 2,
      anguloFin: (3 * Math.PI) / 2,
    })

    expect(camino.match(/Z/g)).toHaveLength(2)
    expect(camino).toContain('M 90 50')
    expect(camino).toContain('M 75 50')
  })
})

describe('escalaLineal', () => {
  it('lleva el dominio al rango, también invertido (eje y)', () => {
    const escala = escalaLineal(0, 10, 100, 0)

    expect(escala(0)).toBe(100)
    expect(escala(5)).toBe(50)
    expect(escala(10)).toBe(0)
  })

  it('con un dominio de un solo valor devuelve el medio del rango', () => {
    expect(escalaLineal(5, 5, 0, 100)(5)).toBe(50)
  })
})

describe('escalaDeEjeY', () => {
  it('elige un paso redondo y límites múltiplos de él que contienen a los valores', () => {
    const escala = escalaDeEjeY([302, 318])

    expect(escala.minimo).toBe(300)
    expect(escala.maximo).toBe(320)
    expect(escala.marcas).toEqual([300, 310, 320])
  })

  it('con valores más separados usa un paso mayor', () => {
    const escala = escalaDeEjeY([210, 480])

    expect(escala.marcas).toEqual([200, 300, 400, 500])
    expect(escala.minimo).toBeLessThanOrEqual(210)
    expect(escala.maximo).toBeGreaterThanOrEqual(480)
  })

  it('con un solo valor abre un margen alrededor', () => {
    const escala = escalaDeEjeY([320])

    expect(escala.minimo).toBeLessThan(320)
    expect(escala.maximo).toBeGreaterThan(320)
    expect(escala.marcas).toContain(320)
  })

  it('sin valores devuelve 0 a 1', () => {
    expect(escalaDeEjeY([])).toEqual({ minimo: 0, maximo: 1, marcas: [0, 1] })
  })

  it('no arrastra errores de coma flotante en los pasos decimales', () => {
    const escala = escalaDeEjeY([0.1, 0.4])

    expect(escala.marcas.every((marca) => Number.isInteger(marca * 100))).toBe(true)
  })
})

describe('puntosDeLinea', () => {
  const MEDIDAS = { ancho: 300, alto: 200, margen: { arriba: 10, derecha: 20, abajo: 30, izquierda: 40 } }

  it('ordena por fecha y reparte la x según los días transcurridos, no según el orden', () => {
    const { puntos } = puntosDeLinea(
      [
        { fecha: '2026-03-11', valor: 320 },
        { fecha: '2026-03-01', valor: 300 },
        { fecha: '2026-03-02', valor: 310 },
      ],
      MEDIDAS,
    )

    expect(puntos.map((p) => p.fecha)).toEqual(['2026-03-01', '2026-03-02', '2026-03-11'])
    expect(puntos[0].x).toBe(40)
    expect(puntos[2].x).toBe(280)
    // El 02/03 está a 1 de 10 días del recorrido.
    expect(puntos[1].x).toBeCloseTo(40 + (240 * 1) / 10)
  })

  it('el valor más alto queda más arriba (y menor) que el más bajo', () => {
    const { puntos, area } = puntosDeLinea(
      [
        { fecha: '2026-03-01', valor: 300 },
        { fecha: '2026-03-11', valor: 320 },
      ],
      MEDIDAS,
    )

    expect(puntos[0].y).toBe(area.y1)
    expect(puntos[1].y).toBe(area.y0)
  })

  it('arma las marcas del eje Y dentro del área y las del eje X con el primero y el último', () => {
    const resultado = puntosDeLinea(
      [
        { fecha: '2026-03-01', valor: 300 },
        { fecha: '2026-03-06', valor: 310 },
        { fecha: '2026-03-11', valor: 320 },
      ],
      MEDIDAS,
    )

    expect(resultado.marcasY.map((m) => m.valor)).toEqual([300, 310, 320])
    expect(resultado.marcasY.every((m) => m.y >= resultado.area.y0 && m.y <= resultado.area.y1)).toBe(true)
    expect(resultado.marcasX.map((m) => m.fecha)).toEqual(['2026-03-01', '2026-03-06', '2026-03-11'])
  })

  it('limita las marcas del eje X al máximo, repartidas parejas', () => {
    const serie = Array.from({ length: 12 }, (_, i) => ({
      fecha: `2026-03-${String(i + 1).padStart(2, '0')}`,
      valor: 300 + i,
    }))

    const { marcasX } = puntosDeLinea(serie, MEDIDAS, 4)

    expect(marcasX).toHaveLength(4)
    expect(marcasX[0].fecha).toBe('2026-03-01')
    expect(marcasX[3].fecha).toBe('2026-03-12')
  })

  it('con un solo punto lo deja centrado', () => {
    const { puntos, marcasX } = puntosDeLinea([{ fecha: '2026-03-01', valor: 310 }], MEDIDAS)

    expect(puntos).toHaveLength(1)
    expect(puntos[0].x).toBe((40 + 280) / 2)
    expect(marcasX).toHaveLength(1)
  })
})

describe('series a partir de los datos del backend', () => {
  const SESIONES = [
    { fecha: '2026-03-10', subGrupoId: 2, subGrupoDescripcion: 'Lote B', grupoDescripcion: 'Cría', promedio: 320 },
    { fecha: '2026-03-01', subGrupoId: 2, subGrupoDescripcion: 'Lote B', grupoDescripcion: 'Cría', promedio: 300 },
    { fecha: '2026-03-05', subGrupoId: 1, subGrupoDescripcion: 'Lote A', grupoDescripcion: 'Cría', promedio: 250 },
    { fecha: '2026-03-20', subGrupoId: null, subGrupoDescripcion: null, grupoDescripcion: null, promedio: 200 },
  ]

  it('lotesDeSesiones: ordena por nombre, con "Sin lote" al final y la etiqueta con el grupo', () => {
    expect(lotesDeSesiones(SESIONES)).toEqual([
      { valor: '1', etiqueta: 'Lote A — Cría' },
      { valor: '2', etiqueta: 'Lote B — Cría' },
      { valor: 'sin-lote', etiqueta: 'Sin lote' },
    ])
  })

  it('loteDeLaSesionMasReciente: el lote de la última fecha', () => {
    expect(loteDeLaSesionMasReciente(SESIONES)).toBe('sin-lote')
    expect(loteDeLaSesionMasReciente(SESIONES.slice(0, 3))).toBe('2')
    expect(loteDeLaSesionMasReciente([])).toBe('')
  })

  it('serieDePesoPorLote: solo las sesiones del lote, por fecha ascendente', () => {
    expect(serieDePesoPorLote(SESIONES, '2')).toEqual([
      { fecha: '2026-03-01', valor: 300 },
      { fecha: '2026-03-10', valor: 320 },
    ])
    expect(serieDePesoPorLote(SESIONES, 'sin-lote')).toEqual([{ fecha: '2026-03-20', valor: 200 }])
    expect(serieDePesoPorLote(SESIONES, '99')).toEqual([])
  })

  it('agregarPorRaza: cuenta solo los animales sin salida', () => {
    const animales = [
      { razaDescripcion: 'Brangus', aniFechaEgreso: null },
      { razaDescripcion: 'Brangus', aniFechaEgreso: null },
      { razaDescripcion: 'Nelore', aniFechaEgreso: null },
      { razaDescripcion: 'Nelore', aniFechaEgreso: '2026-02-01' },
    ]

    expect(agregarPorRaza(animales)).toEqual([
      { etiqueta: 'Brangus', valor: 2 },
      { etiqueta: 'Nelore', valor: 1 },
    ])
  })
})
