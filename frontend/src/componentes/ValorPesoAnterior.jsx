/**
 * Peso anterior de un pesaje, dentro del detalle de una sesión o del
 * historial de un animal (ver ItemSesionPesaje / ItemHistorialPesaje en el
 * backend). Puede ser un pesaje ACTIVO real del mismo animal, o -si no
 * tiene ninguno- su peso al ingresar ("pesoAnteriorEsIngreso"): en ese
 * segundo caso se aclara con una etiqueta "ingreso" (title + aria-label con
 * la fecha), para no mostrarlo como si fuera un pesaje más. Si
 * "pesoAnteriorEsIngreso" todavía no llega del backend (undefined, no
 * boolean), se trata como ausente: sin etiqueta, en vez de romper.
 *
 * Debajo del peso se muestra la fecha del anterior y, si se conoce la fecha
 * de este pesaje ("fechaPesaje", aaaa-mm-dd), los días transcurridos desde
 * entonces ("30/10/2026 · hace 12 días"): sirve para interpretar la GMD sin
 * ir a buscar la fecha del pesaje previo. Sin fecha del anterior no se
 * muestra esa línea. Los días se calculan con fechas de calendario (ver
 * utilidades/fechas.js), no con instantes, para que el huso horario no
 * corra la cuenta.
 */

import { textoDiasTranscurridos } from '../utilidades/fechas'
import { formatearFecha, formatearPeso } from '../utilidades/formato'
import './ValorPesoAnterior.css'

export default function ValorPesoAnterior({ pesoAnterior, pesoAnteriorEsIngreso, fechaPesoAnterior, fechaPesaje }) {
  if (pesoAnterior == null) {
    return '—'
  }

  const dias = fechaPesoAnterior ? textoDiasTranscurridos(fechaPesoAnterior, fechaPesaje) : ''
  const detalleFecha = fechaPesoAnterior
    ? [formatearFecha(fechaPesoAnterior), dias].filter(Boolean).join(' · ')
    : ''

  if (!pesoAnteriorEsIngreso && !detalleFecha) {
    return formatearPeso(pesoAnterior)
  }

  const detalleIngreso = fechaPesoAnterior
    ? `Es el peso de ingreso del animal, del ${formatearFecha(fechaPesoAnterior)}`
    : 'Es el peso de ingreso del animal'

  return (
    <span className="valor-peso-anterior">
      <span className="valor-peso-anterior-principal">
        {formatearPeso(pesoAnterior)}
        {pesoAnteriorEsIngreso && (
          <span className="valor-peso-anterior-ingreso" title={detalleIngreso} aria-label={detalleIngreso}>
            ingreso
          </span>
        )}
      </span>
      {detalleFecha && <span className="valor-peso-anterior-fecha">{detalleFecha}</span>}
    </span>
  )
}
