/**
 * Confirmación para eliminar una persona. El catálogo ya deshabilita el
 * botón "Eliminar" cuando está en uso (ver motivosBloqueo en
 * listadoPersonas.js), pero igual se maneja el 409 del servidor por si
 * algo cambió entre que se cargó el listado y este clic; el 404 cubre el
 * mismo caso para una persona que ya no existe (la borraron en otra
 * sesión).
 */

import { useEffect, useRef, useState } from 'react'
import { ErrorHttp, peticionProtegida } from '../../api/cliente'
import Modal from '../../componentes/Modal'
import { nombreCompleto } from './listadoPersonas'
import '../Personas.css'

export default function ModalEliminarPersona({ persona, onCerrar, onEliminado, onYaNoExiste, refDisparador }) {
  const [eliminando, setEliminando] = useState(false)
  const [error, setError] = useState('')
  const refBotonCancelar = useRef(null)

  useEffect(() => {
    refBotonCancelar.current?.focus()
  }, [])

  async function confirmarEliminar() {
    setEliminando(true)
    setError('')
    try {
      await peticionProtegida(`/api/personas/${persona.perId}`, { method: 'DELETE' })
      onEliminado(nombreCompleto(persona))
    } catch (err) {
      if (err instanceof ErrorHttp && err.estado === 409) {
        setError(err.message || 'No se puede eliminar la persona.')
      } else if (err instanceof ErrorHttp && err.estado === 404) {
        onYaNoExiste()
      } else {
        setError('No se pudo conectar con el servidor.')
      }
    } finally {
      setEliminando(false)
    }
  }

  return (
    <Modal titulo="Eliminar persona" onCerrar={onCerrar} refDisparador={refDisparador}>
      <div className="confirmar-eliminar-persona">
        <p>¿Eliminar a {nombreCompleto(persona)}? Esta acción no se puede deshacer.</p>
        {error && (
          <p className="campo-error" role="alert">
            {error}
          </p>
        )}
        <div className="confirmar-eliminar-persona-acciones">
          <button
            type="button"
            ref={refBotonCancelar}
            className="boton-secundario"
            onClick={onCerrar}
            disabled={eliminando}
          >
            Cancelar
          </button>
          <button type="button" className="boton-peligro" onClick={confirmarEliminar} disabled={eliminando}>
            {eliminando ? 'Eliminando...' : 'Eliminar'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
