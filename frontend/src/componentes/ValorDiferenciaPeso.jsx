/**
 * Diferencia de peso (peso nuevo − último peso) formateada en kg, con el
 * mismo criterio que ValorGmd para los valores negativos: color de alerta,
 * ícono y texto accesible "Pérdida de peso" (nunca solo color). Usado en la
 * lista acumulada de la pestaña "Por lote" del modal "Nuevo pesaje".
 */

import { TrendingDown } from 'lucide-react'
import { formatearPeso } from '../utilidades/formato'

export default function ValorDiferenciaPeso({ diferencia }) {
  const esDesconocida = diferencia == null
  const esNegativa = !esDesconocida && diferencia < 0

  return (
    <span
      className={esNegativa ? 'valor-negativo' : undefined}
      title={esDesconocida ? 'No hay un peso anterior para comparar' : undefined}
      aria-label={esDesconocida ? 'No hay un peso anterior para comparar' : undefined}
    >
      {esNegativa && <TrendingDown aria-hidden="true" size={14} />}
      {esNegativa && <span className="visualmente-oculto">Pérdida de peso: </span>}
      {esDesconocida ? '—' : formatearPeso(diferencia)}
    </span>
  )
}
