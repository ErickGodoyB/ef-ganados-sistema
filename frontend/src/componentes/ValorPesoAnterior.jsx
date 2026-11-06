/**
 * Peso anterior de un pesaje, dentro del detalle de una sesión (ver
 * ItemSesionPesaje en el backend). Puede ser un pesaje ACTIVO real del
 * mismo animal, o -si no tiene ninguno- su peso al ingresar
 * ("pesoAnteriorEsIngreso"): en ese segundo caso se aclara con una
 * etiqueta "ingreso" (title + aria-label con la fecha), para no mostrarlo
 * como si fuera un pesaje más. Si "pesoAnteriorEsIngreso" todavía no llega
 * del backend (undefined, no boolean), se trata como ausente: solo el
 * peso, sin aclaración, en vez de romper.
 */

import { formatearFecha, formatearPeso } from '../utilidades/formato'
import './ValorPesoAnterior.css'

export default function ValorPesoAnterior({ pesoAnterior, pesoAnteriorEsIngreso, fechaPesoAnterior }) {
  if (pesoAnterior == null) {
    return '—'
  }
  if (!pesoAnteriorEsIngreso) {
    return formatearPeso(pesoAnterior)
  }

  const detalle = fechaPesoAnterior
    ? `Es el peso de ingreso del animal, del ${formatearFecha(fechaPesoAnterior)}`
    : 'Es el peso de ingreso del animal'

  return (
    <span className="valor-peso-anterior">
      {formatearPeso(pesoAnterior)}
      <span className="valor-peso-anterior-ingreso" title={detalle} aria-label={detalle}>
        ingreso
      </span>
    </span>
  )
}
