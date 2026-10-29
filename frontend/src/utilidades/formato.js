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
