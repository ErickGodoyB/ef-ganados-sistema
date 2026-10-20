/**
 * Alta rápida de un lote (subgrupo) nuevo, sin salir del formulario de
 * animal: un botón "+" junto al select de Lote despliega un mini
 * formulario con el nombre del lote y un select de Grupo (cargado de
 * GET /api/grupos), cuya última opción "Nuevo grupo..." revela un campo
 * de texto para crear el grupo al vuelo.
 *
 * Si hay que crear un grupo nuevo, primero se crea ese grupo y, solo si
 * sale bien, el lote (si el grupo falla, no se intenta crear el lote).
 * Antes de guardar, verifica en el cliente que no exista ya un lote con
 * ese nombre dentro del mismo grupo (sin distinguir mayúsculas ni
 * espacios extremos). Escape cierra solo este mini formulario, no el
 * formulario completo (ver el stopPropagation, igual que en
 * AltaRapidaRaza).
 */

import { Plus } from 'lucide-react'
import { useRef, useState } from 'react'
import { ErrorHttp, peticionProtegida } from '../../api/cliente'
import './AltaRapida.css'

export default function AltaRapidaLote({ subGrupos, onCreado }) {
  const [abierto, setAbierto] = useState(false)
  const [nombreLote, setNombreLote] = useState('')
  const [grupoSeleccionado, setGrupoSeleccionado] = useState('')
  const [nombreGrupoNuevo, setNombreGrupoNuevo] = useState('')
  const [grupos, setGrupos] = useState([])
  const [cargandoGrupos, setCargandoGrupos] = useState(false)
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)
  const refBotonMas = useRef(null)

  /** Al abrirse, trae los grupos existentes para el select (una vez por apertura, no se cachea entre aperturas). */
  async function abrir() {
    setAbierto(true)
    setNombreLote('')
    setGrupoSeleccionado('')
    setNombreGrupoNuevo('')
    setError('')
    setCargandoGrupos(true)
    try {
      const gruposRecibidos = await peticionProtegida('/api/grupos')
      setGrupos(gruposRecibidos ?? [])
    } catch {
      setError('No se pudieron cargar los grupos.')
    } finally {
      setCargandoGrupos(false)
    }
  }

  function cerrar() {
    setAbierto(false)
    refBotonMas.current?.focus()
  }

  function manejarTeclaEnContenedor(evento) {
    if (evento.key === 'Escape') {
      evento.stopPropagation()
      cerrar()
    }
  }

  async function manejarGuardar(evento) {
    evento.preventDefault()

    const nombreLoteNormalizado = nombreLote.trim()
    if (!nombreLoteNormalizado) {
      setError('Ingresá el nombre del lote')
      return
    }
    if (!grupoSeleccionado) {
      setError('Elegí un grupo, o "Nuevo grupo..."')
      return
    }

    const esGrupoNuevo = grupoSeleccionado === 'nuevo'
    const nombreGrupoNuevoNormalizado = nombreGrupoNuevo.trim()
    if (esGrupoNuevo && !nombreGrupoNuevoNormalizado) {
      setError('Ingresá el nombre del grupo nuevo')
      return
    }

    if (!esGrupoNuevo) {
      const grupoIdNumero = Number(grupoSeleccionado)
      const yaExiste = subGrupos.some(
        (subGrupo) =>
          subGrupo.grupo?.grpId === grupoIdNumero &&
          subGrupo.sbDescripcion.trim().toLowerCase() === nombreLoteNormalizado.toLowerCase(),
      )
      if (yaExiste) {
        setError(`Ya existe el lote ${nombreLoteNormalizado} en ese grupo`)
        return
      }
    }

    setGuardando(true)
    setError('')
    try {
      let grupoId = Number(grupoSeleccionado)
      if (esGrupoNuevo) {
        const grupoCreado = await peticionProtegida('/api/grupos', {
          method: 'POST',
          body: JSON.stringify({ grpDescripcion: nombreGrupoNuevoNormalizado }),
        })
        grupoId = grupoCreado.grpId
      }

      // Si la creación del grupo falló, el catch de abajo corta acá: esta
      // línea solo se alcanza con un grupo (nuevo o existente) ya válido.
      const subGrupoCreado = await peticionProtegida('/api/subgrupos', {
        method: 'POST',
        body: JSON.stringify({ sbDescripcion: nombreLoteNormalizado, grupo: { grpId: grupoId } }),
      })

      onCreado(subGrupoCreado)
      setAbierto(false)
    } catch (err) {
      setError(err instanceof ErrorHttp ? err.message : 'No se pudo conectar con el servidor.')
    } finally {
      setGuardando(false)
    }
  }

  if (!abierto) {
    return (
      <button
        type="button"
        ref={refBotonMas}
        className="alta-rapida-boton"
        aria-label="Agregar lote nuevo"
        onClick={abrir}
      >
        <Plus aria-hidden="true" size={20} />
      </button>
    )
  }

  return (
    <div className="alta-rapida-mini-formulario" onKeyDown={manejarTeclaEnContenedor}>
      <div className="campo">
        <label htmlFor="alta-rapida-lote-nombre">Nombre del lote</label>
        <input
          id="alta-rapida-lote-nombre"
          type="text"
          value={nombreLote}
          onChange={(evento) => setNombreLote(evento.target.value)}
          disabled={guardando}
          autoFocus
        />
      </div>

      <div className="campo">
        <label htmlFor="alta-rapida-lote-grupo">Grupo</label>
        <select
          id="alta-rapida-lote-grupo"
          value={grupoSeleccionado}
          onChange={(evento) => setGrupoSeleccionado(evento.target.value)}
          disabled={guardando || cargandoGrupos}
        >
          <option value="">{cargandoGrupos ? 'Cargando grupos…' : 'Elegí un grupo'}</option>
          {grupos.map((grupo) => (
            <option key={grupo.grpId} value={grupo.grpId}>
              {grupo.grpDescripcion}
            </option>
          ))}
          <option value="nuevo">Nuevo grupo...</option>
        </select>
      </div>

      {grupoSeleccionado === 'nuevo' && (
        <div className="campo">
          <label htmlFor="alta-rapida-grupo-nombre">Nombre del grupo</label>
          <input
            id="alta-rapida-grupo-nombre"
            type="text"
            value={nombreGrupoNuevo}
            onChange={(evento) => setNombreGrupoNuevo(evento.target.value)}
            disabled={guardando}
          />
        </div>
      )}

      {error && (
        <p className="campo-error" role="alert">
          {error}
        </p>
      )}

      <div className="alta-rapida-acciones">
        <button type="button" className="boton-secundario" onClick={cerrar} disabled={guardando}>
          Cancelar
        </button>
        <button type="button" className="boton-primario" onClick={manejarGuardar} disabled={guardando}>
          {guardando ? 'Guardando...' : 'Guardar'}
        </button>
      </div>
    </div>
  )
}
