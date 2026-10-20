/**
 * Badge de estado de venta de un animal: "Apto para venta" (verde, con
 * ícono y texto, para no depender solo del color) o "En engorde" (celeste,
 * con ícono de reloj) si todavía no llegó al peso objetivo de venta de su
 * raza.
 */

import { CircleCheck, Clock } from 'lucide-react'
import './EstadoBadge.css'

export default function EstadoBadge({ apto }) {
  return (
    <span className={`estado-badge${apto ? ' estado-badge--apto' : ''}`}>
      {apto ? <CircleCheck aria-hidden="true" size={14} /> : <Clock aria-hidden="true" size={14} />}
      {apto ? 'Apto para venta' : 'En engorde'}
    </span>
  )
}
