/**
 * Vista de confirmación previa a registrar una transferencia (ver
 * ModalNuevaTransferencia.jsx, que la muestra dentro del mismo modal en
 * lugar de apilar un segundo): resume cuántos animales se mueven, de qué
 * lotes y a cuál, para que no se confirme algo distinto de lo que se
 * pensó (mover animales cambia las sesiones de pesaje y los conteos de los
 * lotes, y solo se deshace con una devolución). Los errores del backend
 * (400/404/409, ya en español) se muestran acá, sin salir de la
 * confirmación, para poder volver, corregir y reintentar. El foco arranca
 * en "Volver", la opción segura.
 */

import { useEffect, useRef } from 'react'
import '../GruposYLotes.css'
import { textoCantidadAnimales } from './motivos'

export default function ConfirmacionTransferencia({
  cantidad,
  origenes,
  destino,
  enviando,
  error,
  onConfirmar,
  onVolver,
}) {
  const refBotonVolver = useRef(null)

  useEffect(() => {
    refBotonVolver.current?.focus()
  }, [])

  return (
    <div className="confirmar-eliminar">
      <p>
        Vas a mover {textoCantidadAnimales(cantidad)} de {origenes.join(', ')} a {destino}.
      </p>
      {error && (
        <p className="campo-error" role="alert">
          {error}
        </p>
      )}
      <div className="confirmar-eliminar-acciones">
        <button type="button" ref={refBotonVolver} className="boton-secundario" onClick={onVolver} disabled={enviando}>
          Volver
        </button>
        <button type="button" className="boton-primario" onClick={onConfirmar} disabled={enviando}>
          {enviando ? 'Transfiriendo...' : 'Confirmar'}
        </button>
      </div>
    </div>
  )
}
