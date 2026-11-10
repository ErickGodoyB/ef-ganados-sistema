/**
 * Catálogo de grupos y lotes: trae el resumen desde el backend (GET
 * /api/grupos/resumen, cada grupo con sus lotes y el conteo de animales
 * de cada uno) y permite buscar por grupo o lote, crear/editar/eliminar
 * un grupo, y crear/editar/eliminar un lote (incluido cambiarlo de
 * grupo). Cada grupo es una tarjeta desplegable (ver TarjetaGrupo.jsx);
 * mientras se busca, los grupos con alguna coincidencia (en su propio
 * nombre o en el de alguno de sus lotes) se muestran siempre abiertos,
 * para que la coincidencia quede visible sin un clic más; fuera de una
 * búsqueda, cada tarjeta recuerda si la persona la abrió o cerró a mano.
 */

import { Inbox, Plus, RefreshCw, Search, SearchX, TriangleAlert } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import EncabezadoPagina from '../componentes/EncabezadoPagina'
import ModalEliminarGrupo from './grupos/ModalEliminarGrupo'
import ModalEliminarLote from './grupos/ModalEliminarLote'
import ModalFormularioGrupo from './grupos/ModalFormularioGrupo'
import ModalFormularioLote from './grupos/ModalFormularioLote'
import { filtrarGrupos, grupoTieneCoincidencia } from './grupos/listadoGrupos'
import TarjetaGrupo from './grupos/TarjetaGrupo'
import { useGruposResumen } from './grupos/useGruposResumen'
import './GruposYLotes.css'

export default function GruposYLotes() {
  const { grupos, cargando, error, recargar } = useGruposResumen()
  const [busqueda, setBusqueda] = useState('')
  const [abiertosManual, setAbiertosManual] = useState({})

  const [modalGrupo, setModalGrupo] = useState(null) // null | { modo: 'crear' } | { modo: 'editar', grupo }
  const [grupoAEliminar, setGrupoAEliminar] = useState(null)
  const [modalLote, setModalLote] = useState(null) // null | { modo: 'crear', grupoId } | { modo: 'editar', lote, grupoActualId }
  const [loteAEliminar, setLoteAEliminar] = useState(null)
  const [aviso, setAviso] = useState('')

  const refBotonNuevoGrupo = useRef(null)
  const refDisparadorAccion = useRef(null)
  const refTemporizadorAviso = useRef(null)

  const textoBusqueda = busqueda.trim().toLowerCase()
  const resultado = useMemo(() => filtrarGrupos(grupos, busqueda), [grupos, busqueda])

  /** Muestra un aviso breve (ej. tras guardar un grupo o lote) y lo retira solo a los pocos segundos. */
  function mostrarAviso(mensaje) {
    setAviso(mensaje)
    window.clearTimeout(refTemporizadorAviso.current)
    refTemporizadorAviso.current = window.setTimeout(() => setAviso(''), 4000)
  }

  /** Mientras se busca, un grupo con alguna coincidencia se muestra siempre abierto; sin búsqueda, manda lo que la persona haya elegido a mano. */
  function estaAbierto(grupo) {
    if (textoBusqueda) {
      return grupoTieneCoincidencia(grupo, textoBusqueda)
    }
    return Boolean(abiertosManual[grupo.grpId])
  }

  function alternarAbierto(grupo) {
    setAbiertosManual((actual) => ({ ...actual, [grupo.grpId]: !estaAbierto(grupo) }))
  }

  function abrirCrearGrupo(evento) {
    refBotonNuevoGrupo.current = evento.currentTarget
    setModalGrupo({ modo: 'crear' })
  }

  function abrirEditarGrupo(grupo, evento) {
    refDisparadorAccion.current = evento.currentTarget
    setModalGrupo({ modo: 'editar', grupo })
  }

  function abrirEliminarGrupo(grupo, evento) {
    refDisparadorAccion.current = evento.currentTarget
    setGrupoAEliminar(grupo)
  }

  function abrirAgregarLote(grupo, evento) {
    refDisparadorAccion.current = evento.currentTarget
    setModalLote({ modo: 'crear', grupoId: grupo.grpId })
  }

  function abrirEditarLote(grupo, lote, evento) {
    refDisparadorAccion.current = evento.currentTarget
    setModalLote({ modo: 'editar', lote, grupoActualId: grupo.grpId })
  }

  function abrirEliminarLote(grupo, lote, evento) {
    refDisparadorAccion.current = evento.currentTarget
    setLoteAEliminar(lote)
  }

  /** Tras crear o editar un grupo: cierra el modal, recarga el listado y avisa. */
  function alGuardarGrupo(grupoGuardado, esEdicion) {
    setModalGrupo(null)
    recargar()
    mostrarAviso(
      esEdicion ? `Grupo ${grupoGuardado.grpDescripcion} actualizado` : `Grupo ${grupoGuardado.grpDescripcion} registrado`,
    )
  }

  /** Tras eliminar un grupo: cierra el modal, recarga el listado y avisa. */
  function alEliminarGrupo(descripcionEliminada) {
    setGrupoAEliminar(null)
    recargar()
    mostrarAviso(`Grupo ${descripcionEliminada} eliminado`)
  }

  /** El grupo que se quiso eliminar ya no existía (lo borraron en otra sesión): cierra, recarga y avisa. */
  function alGrupoYaNoExiste() {
    setGrupoAEliminar(null)
    recargar()
    mostrarAviso('Ese grupo ya no existía: se actualizó el listado')
  }

  /** Tras crear o editar un lote: cierra el modal, recarga el listado y avisa. */
  function alGuardarLote(loteGuardado, esEdicion) {
    setModalLote(null)
    recargar()
    mostrarAviso(esEdicion ? `Lote ${loteGuardado.sbDescripcion} actualizado` : `Lote ${loteGuardado.sbDescripcion} registrado`)
  }

  /** Tras eliminar un lote: cierra el modal, recarga el listado y avisa. */
  function alEliminarLote(descripcionEliminada) {
    setLoteAEliminar(null)
    recargar()
    mostrarAviso(`Lote ${descripcionEliminada} eliminado`)
  }

  /** El lote que se quiso eliminar ya no existía (lo borraron en otra sesión): cierra, recarga y avisa. */
  function alLoteYaNoExiste() {
    setLoteAEliminar(null)
    recargar()
    mostrarAviso('Ese lote ya no existía: se actualizó el listado')
  }

  function limpiarBusqueda() {
    setBusqueda('')
  }

  const sinGrupos = !cargando && !error && grupos.length === 0
  const sinCoincidencias = !cargando && !error && grupos.length > 0 && resultado.length === 0
  const hayResultados = !cargando && !error && resultado.length > 0

  return (
    <div className="grupos-pagina">
      <EncabezadoPagina titulo="Grupos y lotes" />

      <div className="grupos-controles">
        <div className="campo-busqueda campo-busqueda--con-icono">
          <label htmlFor="grupos-busqueda">Buscar por grupo o lote</label>
          <div className="campo-busqueda-entrada">
            <Search aria-hidden="true" size={18} className="campo-busqueda-icono" />
            <input
              id="grupos-busqueda"
              type="search"
              value={busqueda}
              onChange={(evento) => setBusqueda(evento.target.value)}
              placeholder="Ej. Invernada o Lote 1"
            />
          </div>
        </div>

        <button type="button" ref={refBotonNuevoGrupo} className="grupos-boton-nuevo" onClick={abrirCrearGrupo}>
          <Plus aria-hidden="true" size={18} />
          Nuevo grupo
        </button>
      </div>

      {aviso && (
        <p className="grupos-aviso" role="status" aria-live="polite">
          {aviso}
        </p>
      )}

      {cargando && <p role="status">Cargando grupos…</p>}

      {!cargando && error && (
        <div className="estado-mensaje tarjeta">
          <TriangleAlert aria-hidden="true" size={40} className="estado-mensaje-icono" />
          <p>{error}</p>
          <button type="button" className="boton-secundario" onClick={recargar}>
            <RefreshCw aria-hidden="true" size={16} />
            Reintentar
          </button>
        </div>
      )}

      {sinGrupos && (
        <div className="estado-mensaje tarjeta">
          <Inbox aria-hidden="true" size={40} className="estado-mensaje-icono" />
          <p>Todavía no hay grupos</p>
        </div>
      )}

      {sinCoincidencias && (
        <div className="estado-mensaje tarjeta">
          <SearchX aria-hidden="true" size={40} className="estado-mensaje-icono" />
          <p>No hay grupos ni lotes que coincidan</p>
          <button type="button" className="boton-secundario" onClick={limpiarBusqueda}>
            Limpiar búsqueda
          </button>
        </div>
      )}

      {hayResultados && (
        <div className="grupos-lista">
          {resultado.map((grupo) => (
            <TarjetaGrupo
              key={grupo.grpId}
              grupo={grupo}
              abierto={estaAbierto(grupo)}
              onAlternarAbierto={() => alternarAbierto(grupo)}
              onEditarGrupo={(evento) => abrirEditarGrupo(grupo, evento)}
              onEliminarGrupo={(evento) => abrirEliminarGrupo(grupo, evento)}
              onAgregarLote={(evento) => abrirAgregarLote(grupo, evento)}
              onEditarLote={(lote, evento) => abrirEditarLote(grupo, lote, evento)}
              onEliminarLote={(lote, evento) => abrirEliminarLote(grupo, lote, evento)}
            />
          ))}
        </div>
      )}

      {modalGrupo && (
        <ModalFormularioGrupo
          grupo={modalGrupo.modo === 'editar' ? modalGrupo.grupo : null}
          onCerrar={() => setModalGrupo(null)}
          onGuardado={alGuardarGrupo}
          refDisparador={modalGrupo.modo === 'crear' ? refBotonNuevoGrupo : refDisparadorAccion}
        />
      )}

      {grupoAEliminar && (
        <ModalEliminarGrupo
          grupo={grupoAEliminar}
          onCerrar={() => setGrupoAEliminar(null)}
          onEliminado={alEliminarGrupo}
          onYaNoExiste={alGrupoYaNoExiste}
          refDisparador={refDisparadorAccion}
        />
      )}

      {modalLote && (
        <ModalFormularioLote
          lote={modalLote.modo === 'editar' ? modalLote.lote : null}
          grupoInicialId={modalLote.modo === 'editar' ? modalLote.grupoActualId : modalLote.grupoId}
          grupos={grupos}
          onCerrar={() => setModalLote(null)}
          onGuardado={alGuardarLote}
          refDisparador={refDisparadorAccion}
        />
      )}

      {loteAEliminar && (
        <ModalEliminarLote
          lote={loteAEliminar}
          onCerrar={() => setLoteAEliminar(null)}
          onEliminado={alEliminarLote}
          onYaNoExiste={alLoteYaNoExiste}
          refDisparador={refDisparadorAccion}
        />
      )}
    </div>
  )
}
