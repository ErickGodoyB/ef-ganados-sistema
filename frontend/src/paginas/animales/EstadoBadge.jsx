/**
 * Badge de estado de venta de un animal: "Apto para venta" (verde, con
 * texto además de color, para no depender solo del color) o "En engorde"
 * si todavía no llegó al peso objetivo de venta de su raza.
 */

import './EstadoBadge.css'

export default function EstadoBadge({ apto }) {
  return (
    <span className={`estado-badge${apto ? ' estado-badge--apto' : ''}`}>
      {apto ? 'Apto para venta' : 'En engorde'}
    </span>
  )
}
