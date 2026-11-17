/**
 * Confirmación previa a registrar una transferencia: resume cuántos
 * animales se mueven, de qué lotes y a cuál, para que no se confirme algo
 * distinto de lo que se pensó (mover animales cambia las sesiones de
 * pesaje y los conteos de los lotes, y solo se deshace con una
 * devolución). Los errores del backend (400/404/409, ya en español) se
 * muestran acá dentro, sin cerrar el modal, para poder corregir y reintentar.
 * El foco arranca en "Cancelar", la opción segura.
 */

import { useEffect, useRef } from 'react'
import Modal from '../../componentes/Modal'
import '../GruposYLotes.css'
import { textoCantidadAnimales } from './motivos'

export default function ModalConfirmarTransferencia({
  cantidad,
  origenes,
  destino,
  enviando,
  error,
  onConfirmar,
  onCancelar,
  refDisparador,
}) {
  const refBotonCancelar = useRef(null)

  useEffect(() => {
    refBotonCancelar.current?.focus()
  }, [])

  return (
    <Modal titulo="Confirmar transferencia" onCerrar={enviando ? () => {} : onCancelar} refDisparador={refDisparador}>
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
          <button
            type="button"
            ref={refBotonCancelar}
            className="boton-secundario"
            onClick={onCancelar}
            disabled={enviando}
          >
            Cancelar
          </button>
          <button type="button" className="boton-primario" onClick={onConfirmar} disabled={enviando}>
            {enviando ? 'Transfiriendo...' : 'Confirmar'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
