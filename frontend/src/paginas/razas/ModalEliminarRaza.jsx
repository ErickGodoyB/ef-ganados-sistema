/**
 * Confirmación para eliminar una raza del catálogo. El listado ya
 * deshabilita el botón "Eliminar" cuando la raza tiene animales (ver
 * TablaRazas.jsx/TarjetaRaza.jsx), pero igual se maneja el 409 del
 * servidor por si la cantidad cambió entre que se cargó el listado y este
 * clic (ej. se dio de alta un animal de esa raza en otra sesión); el 404
 * cubre el mismo caso para una raza que ya no existe (la borraron en otra
 * sesión).
 */

import { useEffect, useRef, useState } from 'react'
import { ErrorHttp, peticionProtegida } from '../../api/cliente'
import Modal from '../../componentes/Modal'
import '../Razas.css'

export default function ModalEliminarRaza({ raza, onCerrar, onEliminado, onYaNoExiste, refDisparador }) {
  const [eliminando, setEliminando] = useState(false)
  const [error, setError] = useState('')
  const refBotonCancelar = useRef(null)

  // El foco inicial va a "Cancelar" (la opción segura por defecto para una acción destructiva), no a "Eliminar".
  useEffect(() => {
    refBotonCancelar.current?.focus()
  }, [])

  async function confirmarEliminar() {
    setEliminando(true)
    setError('')
    try {
      await peticionProtegida(`/api/razas/${raza.rzId}`, { method: 'DELETE' })
      onEliminado(raza.rzDescripcion)
    } catch (err) {
      if (err instanceof ErrorHttp && err.estado === 409) {
        setError(err.message || 'No se puede eliminar la raza.')
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
    <Modal titulo="Eliminar raza" onCerrar={onCerrar} refDisparador={refDisparador}>
      <div className="formulario-raza-confirmar">
        <p>¿Eliminar la raza {raza.rzDescripcion}? Esta acción no se puede deshacer.</p>
        {error && (
          <p className="campo-error" role="alert">
            {error}
          </p>
        )}
        <div className="formulario-raza-acciones">
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
