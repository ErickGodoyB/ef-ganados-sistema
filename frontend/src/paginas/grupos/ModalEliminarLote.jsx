/**
 * Confirmación para eliminar un lote. El catálogo ya deshabilita el botón
 * "Eliminar" cuando el lote tiene animales (ver TarjetaGrupo.jsx), pero
 * igual se maneja el 409 del servidor por si la cantidad cambió entre que
 * se cargó el listado y este clic; el 404 cubre el mismo caso para un
 * lote que ya no existe (lo borraron en otra sesión).
 */

import { useEffect, useRef, useState } from 'react'
import { ErrorHttp, peticionProtegida } from '../../api/cliente'
import Modal from '../../componentes/Modal'
import '../GruposYLotes.css'

export default function ModalEliminarLote({ lote, onCerrar, onEliminado, onYaNoExiste, refDisparador }) {
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
      await peticionProtegida(`/api/subgrupos/${lote.sbId}`, { method: 'DELETE' })
      onEliminado(lote.sbDescripcion)
    } catch (err) {
      if (err instanceof ErrorHttp && err.estado === 409) {
        setError(err.message || 'No se puede eliminar el lote.')
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
    <Modal titulo="Eliminar lote" onCerrar={onCerrar} refDisparador={refDisparador}>
      <div className="confirmar-eliminar">
        <p>¿Eliminar el lote {lote.sbDescripcion}? Esta acción no se puede deshacer.</p>
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
