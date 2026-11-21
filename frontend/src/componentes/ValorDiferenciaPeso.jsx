/**
 * Diferencia de peso (peso nuevo − último peso) formateada en kg, con el
 * mismo criterio que ValorGmd para los valores negativos: color de alerta,
 * ícono y texto accesible "Pérdida de peso" (nunca solo color). Usado en la
 * lista acumulada de la pestaña "Por lote" del modal "Nuevo pesaje".
 */

import { TrendingDown } from 'lucide-react'
import { formatearPeso } from '../utilidades/formato'

/**
 * @param {object} props
 * @param {number|null} props.diferencia Diferencia en kg; null si no hay con qué compararla.
 * @param {string} [props.sinDato] Explicación del "—" cuando es null (por defecto, que falta un peso anterior).
 */
export default function ValorDiferenciaPeso({ diferencia, sinDato = 'No hay un peso anterior para comparar' }) {
  const esDesconocida = diferencia == null
  const esNegativa = !esDesconocida && diferencia < 0

  return (
    <span
      className={esNegativa ? 'valor-negativo' : undefined}
      title={esDesconocida ? sinDato : undefined}
      aria-label={esDesconocida ? sinDato : undefined}
    >
      {esNegativa && <TrendingDown aria-hidden="true" size={14} />}
      {esNegativa && <span className="visualmente-oculto">Pérdida de peso: </span>}
      {esDesconocida ? '—' : formatearPeso(diferencia)}
    </span>
  )
}
