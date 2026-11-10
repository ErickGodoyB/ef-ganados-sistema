/**
 * Tarjeta de una raza para pantallas chicas (< 768px, ver Razas.css).
 * Alternativa a la fila de tabla (TablaRazas.jsx), con la misma
 * información y las mismas acciones.
 */

import { Pencil, Trash2 } from 'lucide-react'
import { formatearPeso } from '../../utilidades/formato'
import './TarjetaRaza.css'

export default function TarjetaRaza({ raza, onEditar, onEliminar }) {
  const tieneAnimales = raza.cantidadAnimales > 0
  const idAviso = `razas-tarjeta-aviso-${raza.rzId}`

  return (
    <article className="tarjeta-raza tarjeta">
      <div className="tarjeta-raza-encabezado">
        <p className="tarjeta-raza-descripcion">{raza.rzDescripcion}</p>
      </div>

      <dl className="tarjeta-raza-datos">
        <div className="tarjeta-raza-dato">
          <dt>Peso objetivo de venta</dt>
          <dd>{formatearPeso(raza.rzPesoObjetivoVenta)}</dd>
        </div>
        <div className="tarjeta-raza-dato">
          <dt>Cantidad de animales</dt>
          <dd>{raza.cantidadAnimales}</dd>
        </div>
      </dl>

      <div className="tarjeta-raza-acciones">
        <button type="button" className="boton-secundario" onClick={(evento) => onEditar(raza, evento)}>
          <Pencil aria-hidden="true" size={16} />
          Editar
        </button>
        <button
          type="button"
          className="boton-peligro"
          onClick={(evento) => onEliminar(raza, evento)}
          disabled={tieneAnimales}
          aria-describedby={tieneAnimales ? idAviso : undefined}
        >
          <Trash2 aria-hidden="true" size={16} />
          Eliminar
        </button>
      </div>
      {tieneAnimales && (
        <p id={idAviso} className="tarjeta-raza-aviso">
          Tiene {raza.cantidadAnimales} animales
        </p>
      )}
    </article>
  )
}
