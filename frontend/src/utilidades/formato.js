/**
 * Funciones de formato en es-PY compartidas por las pantallas que muestran
 * peso, GMD o fechas del backend (Animales, Pesajes). Centralizadas acá
 * para no repetir Intl.NumberFormat ni la lógica de fecha en cada
 * componente que muestra estos valores.
 */

const FORMATO_PESO = new Intl.NumberFormat('es-PY', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
const FORMATO_GMD = new Intl.NumberFormat('es-PY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/** Formatea un peso en kg, ej. 245 -> "245,0 kg". */
export function formatearPeso(pesoKg) {
  return `${FORMATO_PESO.format(pesoKg)} kg`
}

/** Formatea la GMD en kg/día, ej. 1 -> "1,00 kg/día". "—" si es null (sin suficientes pesajes). */
export function formatearGmd(gmd) {
  return gmd == null ? '—' : `${FORMATO_GMD.format(gmd)} kg/día`
}

/**
 * Formatea una fecha ISO ("aaaa-mm-dd", como la manda el backend) como
 * dd/mm/aaaa. Se parte el string a mano en vez de usar Date/Intl para no
 * arriesgarse a que el huso horario del navegador corra la fecha un día.
 */
export function formatearFecha(fechaIso) {
  if (!fechaIso) {
    return ''
  }
  const [anio, mes, dia] = fechaIso.split('-')
  return `${dia}/${mes}/${anio}`
}

/** Formatea una fecha ISO como dd/mm (sin año), para el botón "Intervalo" (ver componentes/Intervalo.jsx). */
export function formatearFechaCorta(fechaIso) {
  if (!fechaIso) {
    return ''
  }
  const [, mes, dia] = fechaIso.split('-')
  return `${dia}/${mes}`
}

/**
 * Formatea un LocalDateTime del backend ("aaaa-mm-ddTHH:mm:ss[.nnn]") como
 * "dd/mm/aaaa HH:mm", para "Anulado el" en la vista de Anulados. Se parte a
 * mano, con el mismo criterio que formatearFecha, para no arriesgarse a un
 * corrimiento de huso horario.
 */
export function formatearFechaHora(fechaHoraIso) {
  if (!fechaHoraIso) {
    return ''
  }
  const [fecha, hora] = fechaHoraIso.split('T')
  if (!hora) {
    return formatearFecha(fecha)
  }
  return `${formatearFecha(fecha)} ${hora.slice(0, 5)}`
}
