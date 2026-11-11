/**
 * Badge de estado del animal: si tiene salida registrada, "Salió" con el
 * motivo y la fecha (ícono de salida, variante neutra, ver EstadoBadge.css);
 * si no, el estado de venta de siempre ("Apto para venta" en oliva o "En
 * engorde" en celeste). Ninguna variante depende solo del color: todas
 * llevan ícono y texto (ver CLAUDE.md).
 */

import { CircleCheck, Clock, LogOut } from 'lucide-react'
import { formatearFecha } from '../../utilidades/formato'
import { etiquetaMotivoSalida } from './tiposSalida'
import './EstadoBadge.css'

export default function EstadoBadge({ animal }) {
  if (animal.aniFechaEgreso) {
    return (
      <span className="estado-badge estado-badge--salio">
        <LogOut aria-hidden="true" size={14} />
        Salió: {etiquetaMotivoSalida(animal.aniMotivoSalida)} el {formatearFecha(animal.aniFechaEgreso)}
      </span>
    )
  }

  return (
    <span className={`estado-badge${animal.aptoVenta ? ' estado-badge--apto' : ''}`}>
      {animal.aptoVenta ? <CircleCheck aria-hidden="true" size={14} /> : <Clock aria-hidden="true" size={14} />}
      {animal.aptoVenta ? 'Apto para venta' : 'En engorde'}
    </span>
  )
}
