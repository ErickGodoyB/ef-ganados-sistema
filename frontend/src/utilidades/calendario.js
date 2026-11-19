/**
 * Funciones puras para dibujar el calendario de pesajes de Inicio. Todas
 * trabajan con fechas "aaaa-mm-dd" y con año/mes numéricos (mes de 1 a 12),
 * y calculan con Date.UTC en vez de fechas locales: así el huso horario y
 * el cambio de horario de verano no pueden correr un día. La semana empieza
 * el lunes.
 */

export const NOMBRES_MESES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
]

/** Nombres de los días, desde el lunes (para la fecha larga). */
export const NOMBRES_DIAS = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo']

/** Encabezados de columna del calendario (lunes a domingo): abreviatura visible y nombre completo para lectores de pantalla. */
export const DIAS_SEMANA = [
  { corto: 'lun', largo: 'lunes' },
  { corto: 'mar', largo: 'martes' },
  { corto: 'mié', largo: 'miércoles' },
  { corto: 'jue', largo: 'jueves' },
  { corto: 'vie', largo: 'viernes' },
  { corto: 'sáb', largo: 'sábado' },
  { corto: 'dom', largo: 'domingo' },
]

const dosDigitos = (numero) => String(numero).padStart(2, '0')

/** Fecha "aaaa-mm-dd" de un año, mes (1 a 12) y día. */
export function fechaIsoDe(anio, mes, dia) {
  return `${anio}-${dosDigitos(mes)}-${dosDigitos(dia)}`
}

/** Parte "aaaa-mm-dd" en { anio, mes, dia } numéricos, o null si no tiene ese formato. */
export function partesDeFecha(fechaIso) {
  const coincidencia = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fechaIso ?? '')
  if (!coincidencia) {
    return null
  }
  const [anio, mes, dia] = coincidencia.slice(1).map(Number)
  return { anio, mes, dia }
}

/** Cantidad de días del mes (28 a 31, con los años bisiestos). */
export function diasDelMes(anio, mes) {
  return new Date(Date.UTC(anio, mes, 0)).getUTCDate()
}

/** Primer día del mes, "aaaa-mm-01". */
export function primerDiaDelMes(anio, mes) {
  return fechaIsoDe(anio, mes, 1)
}

/** Posición en la semana de una fecha, con el lunes en 0 y el domingo en 6. */
export function indiceDiaSemana(fechaIso) {
  const { anio, mes, dia } = partesDeFecha(fechaIso)
  const domingoACero = new Date(Date.UTC(anio, mes - 1, dia)).getUTCDay()
  return (domingoACero + 6) % 7
}

/** Mes desplazado "delta" meses (negativo hacia atrás), pasando de año cuando hace falta: { anio, mes }. */
export function desplazarMes({ anio, mes }, delta) {
  const total = anio * 12 + (mes - 1) + delta
  return { anio: Math.floor(total / 12), mes: (total % 12) + 1 }
}

/**
 * Semanas del mes para dibujar la cuadrícula: un arreglo de filas de 7
 * celdas (lunes a domingo). Cada celda es { dia, fechaIso, fueraDelMes }:
 * los huecos antes del día 1 y después del último día se completan con los
 * días reales del mes anterior y del siguiente (fueraDelMes en true), para
 * que la cuadrícula se vea completa y esos días se puedan mostrar atenuados.
 */
export function armarSemanas(anio, mes) {
  const anterior = desplazarMes({ anio, mes }, -1)
  const siguiente = desplazarMes({ anio, mes }, 1)
  const huecosAntes = indiceDiaSemana(primerDiaDelMes(anio, mes))
  const diasMes = diasDelMes(anio, mes)
  const celdas = []
  const diasAnterior = diasDelMes(anterior.anio, anterior.mes)
  for (let dia = diasAnterior - huecosAntes + 1; dia <= diasAnterior; dia += 1) {
    celdas.push({ dia, fechaIso: fechaIsoDe(anterior.anio, anterior.mes, dia), fueraDelMes: true })
  }
  for (let dia = 1; dia <= diasMes; dia += 1) {
    celdas.push({ dia, fechaIso: fechaIsoDe(anio, mes, dia), fueraDelMes: false })
  }
  for (let dia = 1; celdas.length % 7 !== 0; dia += 1) {
    celdas.push({ dia, fechaIso: fechaIsoDe(siguiente.anio, siguiente.mes, dia), fueraDelMes: true })
  }
  const semanas = []
  for (let inicio = 0; inicio < celdas.length; inicio += 7) {
    semanas.push(celdas.slice(inicio, inicio + 7))
  }
  return semanas
}

/** "noviembre de 2026" (título del mes que muestra el calendario). */
export function tituloDelMes(anio, mes) {
  return `${NOMBRES_MESES[mes - 1]} de ${anio}`
}

/** "15 de noviembre" (sin año), para las etiquetas de los días. */
export function etiquetaDiaMes(fechaIso) {
  const { mes, dia } = partesDeFecha(fechaIso)
  return `${dia} de ${NOMBRES_MESES[mes - 1]}`
}

/** "miércoles 18 de noviembre de 2026" (fecha de hoy del encabezado de Inicio). */
export function fechaLarga(fechaIso) {
  const { anio, mes, dia } = partesDeFecha(fechaIso)
  return `${NOMBRES_DIAS[indiceDiaSemana(fechaIso)]} ${dia} de ${NOMBRES_MESES[mes - 1]} de ${anio}`
}
