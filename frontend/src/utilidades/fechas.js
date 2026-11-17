/**
 * Validación de un rango de fechas y cálculo de sus atajos (filtro
 * "Intervalo" de Pesajes, ver componentes/Intervalo.jsx): "Desde" y "Hasta"
 * viven en formato aaaa-mm-dd (el que usan los input type="date"), así que
 * se pueden comparar como texto directamente (mismo orden que el
 * cronológico). Las funciones que necesitan "hoy" lo reciben como parámetro
 * (en vez de llamar a Date.now() por su cuenta) para poder probarlas con una
 * fecha fija.
 */

/** Un rango es válido si falta alguno de los dos extremos, o si "desde" no es posterior a "hasta". */
export function rangoDeFechasEsValido(desde, hasta) {
  if (!desde || !hasta) {
    return true
  }
  return desde <= hasta
}

/** Fecha de hoy en formato aaaa-mm-dd, en hora local (evita que el huso corra la fecha un día). */
export function fechaHoyIso(ahora = new Date()) {
  const anio = ahora.getFullYear()
  const mes = String(ahora.getMonth() + 1).padStart(2, '0')
  const dia = String(ahora.getDate()).padStart(2, '0')
  return `${anio}-${mes}-${dia}`
}

/** Suma (o resta, con un número negativo) días a una fecha aaaa-mm-dd, devuelta en el mismo formato. */
export function sumarDiasIso(fechaIso, dias) {
  const [anio, mes, dia] = fechaIso.split('-').map(Number)
  const fecha = new Date(anio, mes - 1, dia)
  fecha.setDate(fecha.getDate() + dias)
  return fechaHoyIso(fecha)
}

/** Parte "aaaa-mm-dd" en [año, mes, día] numéricos, o null si no tiene ese formato. */
function partesDeFechaIso(fechaIso) {
  const coincidencia = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fechaIso ?? '')
  return coincidencia ? coincidencia.slice(1).map(Number) : null
}

/**
 * Días de calendario entre dos fechas aaaa-mm-dd (hasta - desde), o null si
 * alguna falta o no es válida. Se cuenta con Date.UTC (medianoche UTC de
 * cada día) en vez de instantes locales: así el huso horario y el cambio de
 * horario de verano no pueden sumar ni restar un día. Es negativo si
 * "hasta" es anterior a "desde".
 */
export function diasEntreFechas(desdeIso, hastaIso) {
  const desde = partesDeFechaIso(desdeIso)
  const hasta = partesDeFechaIso(hastaIso)
  if (!desde || !hasta) {
    return null
  }
  const MS_POR_DIA = 24 * 60 * 60 * 1000
  const msDesde = Date.UTC(desde[0], desde[1] - 1, desde[2])
  const msHasta = Date.UTC(hasta[0], hasta[1] - 1, hasta[2])
  return Math.round((msHasta - msDesde) / MS_POR_DIA)
}

/**
 * Texto de los días transcurridos entre el pesaje anterior y el actual:
 * "hace 12 días", "hace 1 día" o "mismo día". Devuelve '' si no se puede
 * calcular (falta alguna fecha) o si la fecha anterior es posterior a la
 * actual (dato incoherente: mejor no mostrar nada que un "hace -3 días").
 */
export function textoDiasTranscurridos(fechaAnteriorIso, fechaActualIso) {
  const dias = diasEntreFechas(fechaAnteriorIso, fechaActualIso)
  if (dias == null || dias < 0) {
    return ''
  }
  if (dias === 0) {
    return 'mismo día'
  }
  return dias === 1 ? 'hace 1 día' : `hace ${dias} días`
}

/** Primer día del mes de una fecha aaaa-mm-dd, en el mismo formato. */
export function primerDiaDelMesIso(fechaIso) {
  const [anio, mes] = fechaIso.split('-')
  return `${anio}-${mes}-01`
}

/** Los cuatro atajos del panel de Intervalo ("hoy", "7dias", "30dias", "esteMes"), calculados contra "hoy". */
export function calcularAtajoIntervalo(atajo, hoy = fechaHoyIso()) {
  switch (atajo) {
    case 'hoy':
      return { desde: hoy, hasta: hoy }
    case '7dias':
      return { desde: sumarDiasIso(hoy, -6), hasta: hoy }
    case '30dias':
      return { desde: sumarDiasIso(hoy, -29), hasta: hoy }
    case 'esteMes':
      return { desde: primerDiaDelMesIso(hoy), hasta: hoy }
    default:
      return { desde: '', hasta: '' }
  }
}
