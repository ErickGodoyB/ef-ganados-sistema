import { describe, expect, it } from 'vitest'
import {
  armarSemanas,
  desplazarMes,
  diasDelMes,
  etiquetaDiaMes,
  fechaIsoDe,
  fechaLarga,
  indiceDiaSemana,
  partesDeFecha,
  primerDiaDelMes,
  tituloDelMes,
} from './calendario'

describe('fechaIsoDe y partesDeFecha', () => {
  it('arman y parten una fecha aaaa-mm-dd con ceros', () => {
    expect(fechaIsoDe(2026, 3, 5)).toBe('2026-03-05')
    expect(partesDeFecha('2026-03-05')).toEqual({ anio: 2026, mes: 3, dia: 5 })
  })

  it('devuelven null si el texto no tiene el formato', () => {
    expect(partesDeFecha('05/03/2026')).toBeNull()
    expect(partesDeFecha(undefined)).toBeNull()
  })
})

describe('diasDelMes', () => {
  it('cuenta los días de cada mes, con los años bisiestos', () => {
    expect(diasDelMes(2026, 1)).toBe(31)
    expect(diasDelMes(2026, 4)).toBe(30)
    expect(diasDelMes(2026, 2)).toBe(28)
    expect(diasDelMes(2028, 2)).toBe(29)
    expect(diasDelMes(2100, 2)).toBe(28)
    expect(diasDelMes(2026, 12)).toBe(31)
  })
})

describe('primerDiaDelMes', () => {
  it('es el día 1', () => {
    expect(primerDiaDelMes(2026, 11)).toBe('2026-11-01')
  })
})

describe('indiceDiaSemana', () => {
  it('cuenta desde el lunes (0) hasta el domingo (6)', () => {
    expect(indiceDiaSemana('2026-11-02')).toBe(0) // lunes
    expect(indiceDiaSemana('2026-11-01')).toBe(6) // domingo
    expect(indiceDiaSemana('2026-11-18')).toBe(2) // miércoles
    expect(indiceDiaSemana('2026-11-07')).toBe(5) // sábado
  })

  it('no se corre por el cambio de horario ni por el huso (fechas de cambio de hora)', () => {
    expect(indiceDiaSemana('2026-03-29')).toBe(6) // domingo del cambio de hora europeo
    expect(indiceDiaSemana('2026-10-04')).toBe(6) // domingo del cambio de hora de Paraguay (histórico)
    expect(indiceDiaSemana('2026-12-31')).toBe(3) // jueves
  })
})

describe('desplazarMes', () => {
  it('avanza y retrocede un mes', () => {
    expect(desplazarMes({ anio: 2026, mes: 6 }, 1)).toEqual({ anio: 2026, mes: 7 })
    expect(desplazarMes({ anio: 2026, mes: 6 }, -1)).toEqual({ anio: 2026, mes: 5 })
  })

  it('pasa de año en los extremos', () => {
    expect(desplazarMes({ anio: 2026, mes: 12 }, 1)).toEqual({ anio: 2027, mes: 1 })
    expect(desplazarMes({ anio: 2026, mes: 1 }, -1)).toEqual({ anio: 2025, mes: 12 })
  })

  it('desplaza varios meses a la vez', () => {
    expect(desplazarMes({ anio: 2026, mes: 11 }, 14)).toEqual({ anio: 2028, mes: 1 })
    expect(desplazarMes({ anio: 2026, mes: 2 }, -14)).toEqual({ anio: 2024, mes: 12 })
  })
})

describe('armarSemanas', () => {
  it('noviembre de 2026 empieza en domingo: seis días de octubre antes del 1 y filas de 7', () => {
    const semanas = armarSemanas(2026, 11)

    expect(semanas.every((semana) => semana.length === 7)).toBe(true)
    expect(semanas[0].slice(0, 6).map((celda) => celda.fechaIso)).toEqual([
      '2026-10-26',
      '2026-10-27',
      '2026-10-28',
      '2026-10-29',
      '2026-10-30',
      '2026-10-31',
    ])
    expect(semanas[0].slice(0, 6).every((celda) => celda.fueraDelMes)).toBe(true)
    expect(semanas[0][6]).toEqual({ dia: 1, fechaIso: '2026-11-01', fueraDelMes: false })
    expect(semanas).toHaveLength(6)
    // El 30 es lunes: la última semana trae el 30 y seis días de diciembre.
    expect(semanas[5][0]).toEqual({ dia: 30, fechaIso: '2026-11-30', fueraDelMes: false })
    expect(semanas[5].slice(1).map((celda) => celda.fechaIso)).toEqual([
      '2026-12-01',
      '2026-12-02',
      '2026-12-03',
      '2026-12-04',
      '2026-12-05',
      '2026-12-06',
    ])
    expect(semanas[5].slice(1).every((celda) => celda.fueraDelMes)).toBe(true)
  })

  it('un mes que empieza en lunes no trae días del anterior (junio de 2026)', () => {
    const semanas = armarSemanas(2026, 6)

    expect(semanas[0][0]).toEqual({ dia: 1, fechaIso: '2026-06-01', fueraDelMes: false })
  })

  it('pasa de año en los extremos (enero de 2027 empieza en viernes y trae días de diciembre de 2026)', () => {
    const semanas = armarSemanas(2027, 1)

    expect(semanas[0][0].fechaIso).toBe('2026-12-28')
    expect(semanas[0][4]).toEqual({ dia: 1, fechaIso: '2027-01-01', fueraDelMes: false })
  })

  it('los días del mes propio son uno por día, en orden, y todos marcados como del mes', () => {
    const dias = armarSemanas(2028, 2)
      .flat()
      .filter((celda) => !celda.fueraDelMes)
      .map((celda) => celda.dia)

    expect(dias).toEqual(Array.from({ length: 29 }, (_, i) => i + 1))
  })

  it('un febrero de 28 días que empieza en lunes entra justo en cuatro semanas, sin días de otros meses (febrero de 2027)', () => {
    const semanas = armarSemanas(2027, 2)

    expect(semanas).toHaveLength(4)
    expect(semanas.flat().some((celda) => celda.fueraDelMes)).toBe(false)
  })

  it('un mes largo puede necesitar seis semanas (agosto de 2026 empieza en sábado)', () => {
    expect(armarSemanas(2026, 8)).toHaveLength(6)
  })
})

describe('textos en español', () => {
  it('tituloDelMes', () => {
    expect(tituloDelMes(2026, 11)).toBe('noviembre de 2026')
  })

  it('etiquetaDiaMes', () => {
    expect(etiquetaDiaMes('2026-11-15')).toBe('15 de noviembre')
    expect(etiquetaDiaMes('2026-03-05')).toBe('5 de marzo')
  })

  it('fechaLarga trae el día de la semana', () => {
    expect(fechaLarga('2026-11-18')).toBe('miércoles 18 de noviembre de 2026')
    expect(fechaLarga('2026-11-01')).toBe('domingo 1 de noviembre de 2026')
  })
})
