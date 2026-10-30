/**
 * Panel inline (no un modal aparte, ver la nota de ModalDetalleSesion.jsx
 * sobre por qué) para anular TODOS los pesajes activos de la sesión de una
 * vez: pide el motivo (mismo selector con chips que anular un pesaje
 * puntual, ver SelectorMotivoAnulacion.jsx) y, al confirmar, llama a
 * PUT /api/pesajes/sesion/anular.
 */

import { Ban } from 'lucide-react'
import { useState } from 'react'
import { motivoEsValido } from '../../utilidades/anulacion'
import SelectorMotivoAnulacion from './SelectorMotivoAnulacion'

export default function PanelAnularSesion({ cantidad, guardando, error, onCancelar, onConfirmar }) {
  const [motivo, setMotivo] = useState('')
  const [errorLocal, setErrorLocal] = useState('')

  function manejarConfirmar() {
    if (!motivoEsValido(motivo)) {
      setErrorLocal('Ingresá un motivo de entre 3 y 255 caracteres')
      return
    }
    setErrorLocal('')
    onConfirmar(motivo)
  }

  return (
    <div className="panel-sesion panel-sesion--peligro">
      <p className="panel-sesion-texto">
        ¿Anular los {cantidad} pesajes de esta sesión? El pesaje deja de contar en reportes y se conserva en
        Anulados.
      </p>
      <SelectorMotivoAnulacion
        id="anular-sesion-motivo"
        motivo={motivo}
        onCambiarMotivo={setMotivo}
        disabled={guardando}
        error={errorLocal || error}
      />
      <div className="panel-sesion-acciones">
        <button type="button" className="boton-secundario" onClick={onCancelar} disabled={guardando}>
          Cancelar
        </button>
        <button type="button" className="boton-peligro" onClick={manejarConfirmar} disabled={guardando}>
          <Ban aria-hidden="true" size={16} />
          {guardando ? 'Anulando...' : 'Confirmar anulación'}
        </button>
      </div>
    </div>
  )
}
