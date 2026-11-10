/**
 * Catálogo de razas: trae el resumen desde el backend (GET
 * /api/razas/resumen, incluye cuántos animales tiene cada raza) y permite
 * buscar por descripción, crear una raza nueva, editarla (con un paso de
 * confirmación si el cambio de peso objetivo afecta animales existentes,
 * ver ModalFormularioRaza) o eliminarla (bloqueado en el cliente si tiene
 * animales, ver TablaRazas/TarjetaRaza; igual se maneja el 409 del
 * servidor, ver ModalEliminarRaza). Al guardar/editar/eliminar se recarga
 * el listado y se muestra un aviso breve, mismo patrón que Animales.jsx.
 */

import { Inbox, Plus, RefreshCw, Search, SearchX, TriangleAlert } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import EncabezadoPagina from '../componentes/EncabezadoPagina'
import ModalEliminarRaza from './razas/ModalEliminarRaza'
import ModalFormularioRaza from './razas/ModalFormularioRaza'
import TablaRazas from './razas/TablaRazas'
import TarjetaRaza from './razas/TarjetaRaza'
import { useRazasResumen } from './razas/useRazasResumen'
import './Razas.css'

export default function Razas() {
  const { razas, cargando, error, recargar } = useRazasResumen()
  const [busqueda, setBusqueda] = useState('')
  const [modalRaza, setModalRaza] = useState(null) // null | { modo: 'crear' } | { modo: 'editar', raza }
  const [razaAEliminar, setRazaAEliminar] = useState(null)
  const [aviso, setAviso] = useState('')

  const refBotonNuevaRaza = useRef(null)
  const refDisparadorAccion = useRef(null)
  const refTemporizadorAviso = useRef(null)

  const resultado = useMemo(() => {
    const texto = busqueda.trim().toLowerCase()
    if (!texto) {
      return razas
    }
    return razas.filter((raza) => raza.rzDescripcion.toLowerCase().includes(texto))
  }, [razas, busqueda])

  /** Muestra un aviso breve (ej. tras guardar una raza) y lo retira solo a los pocos segundos. */
  function mostrarAviso(mensaje) {
    setAviso(mensaje)
    window.clearTimeout(refTemporizadorAviso.current)
    refTemporizadorAviso.current = window.setTimeout(() => setAviso(''), 4000)
  }

  function abrirCrear(evento) {
    refBotonNuevaRaza.current = evento.currentTarget
    setModalRaza({ modo: 'crear' })
  }

  function abrirEditar(raza, evento) {
    refDisparadorAccion.current = evento.currentTarget
    setModalRaza({ modo: 'editar', raza })
  }

  function abrirEliminar(raza, evento) {
    refDisparadorAccion.current = evento.currentTarget
    setRazaAEliminar(raza)
  }

  /** Tras crear o editar una raza: cierra el modal, recarga el listado y avisa. */
  function alGuardarRaza(razaGuardada, esEdicion) {
    setModalRaza(null)
    recargar()
    mostrarAviso(esEdicion ? `Raza ${razaGuardada.rzDescripcion} actualizada` : `Raza ${razaGuardada.rzDescripcion} registrada`)
  }

  /** Tras eliminar una raza: cierra el modal, recarga el listado y avisa. */
  function alEliminarRaza(descripcionEliminada) {
    setRazaAEliminar(null)
    recargar()
    mostrarAviso(`Raza ${descripcionEliminada} eliminada`)
  }

  /** La raza que se quiso eliminar ya no existía (la borraron en otra sesión): cierra, recarga y avisa. */
  function alRazaYaNoExiste() {
    setRazaAEliminar(null)
    recargar()
    mostrarAviso('Esa raza ya no existía: se actualizó el listado')
  }

  function limpiarBusqueda() {
    setBusqueda('')
  }

  const sinRazas = !cargando && !error && razas.length === 0
  const sinCoincidencias = !cargando && !error && razas.length > 0 && resultado.length === 0
  const hayResultados = !cargando && !error && resultado.length > 0

  return (
    <div className="razas-pagina">
      <EncabezadoPagina titulo="Razas" />

      <div className="razas-controles">
        <div className="campo-busqueda campo-busqueda--con-icono">
          <label htmlFor="razas-busqueda">Buscar por descripción</label>
          <div className="campo-busqueda-entrada">
            <Search aria-hidden="true" size={18} className="campo-busqueda-icono" />
            <input
              id="razas-busqueda"
              type="search"
              value={busqueda}
              onChange={(evento) => setBusqueda(evento.target.value)}
              placeholder="Ej. Brangus"
            />
          </div>
        </div>

        <button type="button" ref={refBotonNuevaRaza} className="razas-boton-nuevo" onClick={abrirCrear}>
          <Plus aria-hidden="true" size={18} />
          Nueva raza
        </button>
      </div>

      {!cargando && !error && (
        <p className="visualmente-oculto" aria-live="polite">
          {resultado.length === 1 ? '1 raza encontrada' : `${resultado.length} razas encontradas`}
        </p>
      )}

      {aviso && (
        <p className="razas-aviso" role="status" aria-live="polite">
          {aviso}
        </p>
      )}

      {cargando && <p role="status">Cargando razas…</p>}

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

      {sinRazas && (
        <div className="estado-mensaje tarjeta">
          <Inbox aria-hidden="true" size={40} className="estado-mensaje-icono" />
          <p>Todavía no hay razas registradas</p>
        </div>
      )}

      {sinCoincidencias && (
        <div className="estado-mensaje tarjeta">
          <SearchX aria-hidden="true" size={40} className="estado-mensaje-icono" />
          <p>No hay razas que coincidan</p>
          <button type="button" className="boton-secundario" onClick={limpiarBusqueda}>
            Limpiar búsqueda
          </button>
        </div>
      )}

      {hayResultados && (
        <>
          <div className="razas-tabla-solo-escritorio">
            <TablaRazas razas={resultado} onEditar={abrirEditar} onEliminar={abrirEliminar} />
          </div>
          <div className="razas-tarjetas-solo-movil">
            {resultado.map((raza) => (
              <TarjetaRaza key={raza.rzId} raza={raza} onEditar={abrirEditar} onEliminar={abrirEliminar} />
            ))}
          </div>
        </>
      )}

      {modalRaza && (
        <ModalFormularioRaza
          raza={modalRaza.modo === 'editar' ? modalRaza.raza : null}
          onCerrar={() => setModalRaza(null)}
          onGuardado={alGuardarRaza}
          refDisparador={modalRaza.modo === 'crear' ? refBotonNuevaRaza : refDisparadorAccion}
        />
      )}

      {razaAEliminar && (
        <ModalEliminarRaza
          raza={razaAEliminar}
          onCerrar={() => setRazaAEliminar(null)}
          onEliminado={alEliminarRaza}
          onYaNoExiste={alRazaYaNoExiste}
          refDisparador={refDisparadorAccion}
        />
      )}
    </div>
  )
}
