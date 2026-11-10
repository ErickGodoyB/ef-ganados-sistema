/**
 * Modal de alta o edición de un grupo: solo su descripción. Si "grupo"
 * viene con datos, edita ese grupo (PUT /api/grupos/{id}); si no, crea uno
 * nuevo (POST /api/grupos). Los mensajes de error del servidor (400 falta
 * la descripción, 409 descripción duplicada) se muestran igual, bajo el
 * único campo del formulario.
 */

import { useRef, useState } from 'react'
import { ErrorHttp, peticionProtegida } from '../../api/cliente'
import Modal from '../../componentes/Modal'
import '../GruposYLotes.css'

export default function ModalFormularioGrupo({ grupo, onCerrar, onGuardado, refDisparador }) {
  const esEdicion = Boolean(grupo)
  const [descripcion, setDescripcion] = useState(grupo?.grpDescripcion ?? '')
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)
  const refDescripcion = useRef(null)

  async function manejarEnviar(evento) {
    evento.preventDefault()
    const descripcionRecortada = descripcion.trim()
    if (!descripcionRecortada) {
      setError('Ingresá la descripción del grupo')
      refDescripcion.current?.focus()
      return
    }

    setGuardando(true)
    setError('')
    try {
      const cuerpo = { grpDescripcion: descripcionRecortada }
      const guardado = esEdicion
        ? await peticionProtegida(`/api/grupos/${grupo.grpId}`, { method: 'PUT', body: JSON.stringify(cuerpo) })
        : await peticionProtegida('/api/grupos', { method: 'POST', body: JSON.stringify(cuerpo) })
      onGuardado(guardado, esEdicion)
    } catch (err) {
      setError(err instanceof ErrorHttp ? err.message : 'No se pudo conectar con el servidor.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Modal titulo={esEdicion ? 'Editar grupo' : 'Nuevo grupo'} onCerrar={onCerrar} refDisparador={refDisparador}>
      <form className="formulario-grupo" onSubmit={manejarEnviar} noValidate>
        <div className="campo">
          <label htmlFor="grupo-descripcion">Descripción</label>
          <input
            id="grupo-descripcion"
            ref={refDescripcion}
            type="text"
            value={descripcion}
            onChange={(evento) => setDescripcion(evento.target.value)}
            aria-invalid={Boolean(error)}
            disabled={guardando}
            autoFocus
          />
          {error && (
            <p className="campo-error" role="alert">
              {error}
            </p>
          )}
        </div>

        <div className="formulario-grupo-acciones">
          <button type="button" className="boton-secundario" onClick={onCerrar} disabled={guardando}>
            Cancelar
          </button>
          <button type="submit" className="boton-primario" disabled={guardando}>
            {guardando ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
