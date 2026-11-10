/**
 * Modal de alta o edición de un lote: descripción y el grupo al que
 * pertenece (select; al editar se puede cambiar de grupo). Si "lote"
 * viene con datos, edita ese lote (PUT /api/subgrupos/{id}); si no, crea
 * uno nuevo (POST /api/subgrupos). Al crear desde "Agregar lote" de un
 * grupo puntual, "grupoInicialId" llega con ese grupo ya elegido (se
 * puede cambiar antes de guardar, igual que al editar).
 *
 * El 409 del servidor (ya existe un lote con esa descripción en ese
 * grupo) se muestra bajo el campo Descripción, que es lo que hay que
 * corregir; cualquier otro error (400 por campos faltantes, o 404 si el
 * grupo elegido ya no existe) se muestra como error general.
 */

import { useRef, useState } from 'react'
import { ErrorHttp, peticionProtegida } from '../../api/cliente'
import Modal from '../../componentes/Modal'
import '../GruposYLotes.css'

export default function ModalFormularioLote({ lote, grupoInicialId, grupos, onCerrar, onGuardado, refDisparador }) {
  const esEdicion = Boolean(lote)
  const [descripcion, setDescripcion] = useState(lote?.sbDescripcion ?? '')
  const [grupoId, setGrupoId] = useState(grupoInicialId ? String(grupoInicialId) : '')
  const [errores, setErrores] = useState({})
  const [errorGeneral, setErrorGeneral] = useState('')
  const [guardando, setGuardando] = useState(false)
  const refDescripcion = useRef(null)
  const refGrupo = useRef(null)

  async function manejarEnviar(evento) {
    evento.preventDefault()
    const encontrados = {}
    const descripcionRecortada = descripcion.trim()
    if (!descripcionRecortada) {
      encontrados.descripcion = 'Ingresá la descripción del lote'
    }
    if (!grupoId) {
      encontrados.grupoId = 'Elegí un grupo'
    }
    if (Object.keys(encontrados).length > 0) {
      setErrores(encontrados)
      if (encontrados.descripcion) {
        refDescripcion.current?.focus()
      } else {
        refGrupo.current?.focus()
      }
      return
    }

    setErrores({})
    setGuardando(true)
    setErrorGeneral('')
    try {
      const cuerpo = { sbDescripcion: descripcionRecortada, grupo: { grpId: Number(grupoId) } }
      const guardado = esEdicion
        ? await peticionProtegida(`/api/subgrupos/${lote.sbId}`, { method: 'PUT', body: JSON.stringify(cuerpo) })
        : await peticionProtegida('/api/subgrupos', { method: 'POST', body: JSON.stringify(cuerpo) })
      onGuardado(guardado, esEdicion)
    } catch (err) {
      if (err instanceof ErrorHttp && err.estado === 409) {
        setErrores((actual) => ({ ...actual, descripcion: err.message }))
      } else if (err instanceof ErrorHttp) {
        setErrorGeneral(err.message || 'No se pudo guardar el lote.')
      } else {
        setErrorGeneral('No se pudo conectar con el servidor.')
      }
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Modal titulo={esEdicion ? 'Editar lote' : 'Nuevo lote'} onCerrar={onCerrar} refDisparador={refDisparador}>
      <form className="formulario-lote" onSubmit={manejarEnviar} noValidate>
        <div className="campo">
          <label htmlFor="lote-descripcion">Descripción</label>
          <input
            id="lote-descripcion"
            ref={refDescripcion}
            type="text"
            value={descripcion}
            onChange={(evento) => setDescripcion(evento.target.value)}
            aria-invalid={Boolean(errores.descripcion)}
            disabled={guardando}
            autoFocus
          />
          {errores.descripcion && (
            <p className="campo-error" role="alert">
              {errores.descripcion}
            </p>
          )}
        </div>

        <div className="campo">
          <label htmlFor="lote-grupo">Grupo</label>
          <select
            id="lote-grupo"
            ref={refGrupo}
            value={grupoId}
            onChange={(evento) => setGrupoId(evento.target.value)}
            aria-invalid={Boolean(errores.grupoId)}
            disabled={guardando}
          >
            <option value="">Elegí un grupo</option>
            {grupos.map((grupoDisponible) => (
              <option key={grupoDisponible.grpId} value={grupoDisponible.grpId}>
                {grupoDisponible.grpDescripcion}
              </option>
            ))}
          </select>
          {errores.grupoId && (
            <p className="campo-error" role="alert">
              {errores.grupoId}
            </p>
          )}
        </div>

        {errorGeneral && (
          <p className="campo-error" role="alert">
            {errorGeneral}
          </p>
        )}

        <div className="formulario-lote-acciones">
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
