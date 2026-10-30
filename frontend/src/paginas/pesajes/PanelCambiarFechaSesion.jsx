/**
 * Panel inline (no un modal aparte, ver la nota de ModalDetalleSesion.jsx
 * sobre por qué) para mover todos los pesajes activos de la sesión a una
 * fecha nueva: un input de fecha (no futura; el botón queda deshabilitado
 * si está vacía o es igual a la actual -- el servidor es la autoridad
 * final sobre esas dos reglas y cualquier otra, ver el error de abajo) y,
 * al confirmar, llama a PUT /api/pesajes/sesion/fecha. Los errores del
 * servidor (400/409) se muestran acá mismo, sin cerrar el panel.
 */

import { useState } from 'react'
import { fechaHoyIso } from '../../utilidades/fechas'

export default function PanelCambiarFechaSesion({ fechaActual, cantidad, guardando, error, onCancelar, onConfirmar }) {
  const [nuevaFecha, setNuevaFecha] = useState('')

  const puedeConfirmar = Boolean(nuevaFecha) && nuevaFecha !== fechaActual

  return (
    <div className="panel-sesion">
      <p className="panel-sesion-texto">Se moverán los {cantidad} pesajes de esta sesión.</p>

      <div className="campo">
        <label htmlFor="cambiar-fecha-sesion-input">Fecha nueva</label>
        <input
          id="cambiar-fecha-sesion-input"
          type="date"
          value={nuevaFecha}
          max={fechaHoyIso()}
          onChange={(evento) => setNuevaFecha(evento.target.value)}
          disabled={guardando}
          aria-invalid={Boolean(error)}
        />
      </div>

      {error && (
        <p className="campo-error" role="alert">
          {error}
        </p>
      )}

      <div className="panel-sesion-acciones">
        <button type="button" className="boton-secundario" onClick={onCancelar} disabled={guardando}>
          Cancelar
        </button>
        <button
          type="button"
          className="boton-primario"
          onClick={() => onConfirmar(nuevaFecha)}
          disabled={guardando || !puedeConfirmar}
        >
          {guardando ? 'Moviendo...' : 'Confirmar cambio de fecha'}
        </button>
      </div>
    </div>
  )
}
