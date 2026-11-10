/**
 * Catálogo de personas: trae el resumen desde el backend (GET
 * /api/personas/resumen, con cuántos animales tiene cada una como dueña,
 * en cuántos pesajes figura y si tiene usuario de acceso) y permite
 * buscar por nombre/apellido/CI/RUC, filtrar por tipo, ordenar por
 * nombre/tipo/cantidades, paginar, y crear/editar/eliminar una persona
 * (bloqueado en el cliente si está en uso, ver TablaPersonas/
 * TarjetaPersona; igual se maneja el 409 del servidor, ver
 * ModalEliminarPersona). Mismo patrón de aviso/recarga que Animales.jsx.
 */

import { Inbox, Plus, RefreshCw, Search, SearchX, TriangleAlert } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import EncabezadoPagina from '../componentes/EncabezadoPagina'
import Paginacion from '../componentes/Paginacion'
import { OPCIONES_ORDEN_MOVIL } from './personas/columnas'
import { filtrarYOrdenarPersonas } from './personas/listadoPersonas'
import ModalEliminarPersona from './personas/ModalEliminarPersona'
import ModalFormularioPersona from './personas/ModalFormularioPersona'
import TablaPersonas from './personas/TablaPersonas'
import TarjetaPersona from './personas/TarjetaPersona'
import { TIPOS_PERSONA } from './personas/tiposPersona'
import { usePersonasResumen } from './personas/usePersonasResumen'
import './Personas.css'

const FILAS_POR_PAGINA = 10

const FILTROS_TIPO = [
  { valor: 'todos', etiqueta: 'Todos' },
  ...TIPOS_PERSONA.map((tipo) => ({ valor: tipo.valor, etiqueta: `${tipo.etiqueta}s` })),
]

export default function Personas() {
  const { personas, cargando, error, recargar } = usePersonasResumen()

  const [busqueda, setBusqueda] = useState('')
  const [tipo, setTipo] = useState('todos')
  const [orden, setOrden] = useState({ campo: 'nombreCompleto', direccion: 'asc' })
  const [pagina, setPagina] = useState(1)

  const [modalPersona, setModalPersona] = useState(null) // null | { modo: 'crear' } | { modo: 'editar', persona }
  const [personaAEliminar, setPersonaAEliminar] = useState(null)
  const [aviso, setAviso] = useState('')

  const refBotonNuevaPersona = useRef(null)
  const refDisparadorAccion = useRef(null)
  const refTemporizadorAviso = useRef(null)

  // Volver a la página 1 cuando cambia la búsqueda, el filtro o el orden
  // (ver el mismo patrón, y su justificación, en Animales.jsx).
  const [filtrosPrevios, setFiltrosPrevios] = useState({ busqueda, tipo, orden })
  if (filtrosPrevios.busqueda !== busqueda || filtrosPrevios.tipo !== tipo || filtrosPrevios.orden !== orden) {
    setFiltrosPrevios({ busqueda, tipo, orden })
    setPagina(1)
  }

  const resultado = useMemo(
    () => filtrarYOrdenarPersonas(personas, { busqueda, tipo, orden }),
    [personas, busqueda, tipo, orden],
  )

  const totalPaginas = Math.max(1, Math.ceil(resultado.length / FILAS_POR_PAGINA))
  const paginaActual = Math.min(pagina, totalPaginas)
  const inicio = (paginaActual - 1) * FILAS_POR_PAGINA
  const personasDeLaPagina = resultado.slice(inicio, inicio + FILAS_POR_PAGINA)

  /** Muestra un aviso breve (ej. tras guardar una persona) y lo retira solo a los pocos segundos. */
  function mostrarAviso(mensaje) {
    setAviso(mensaje)
    window.clearTimeout(refTemporizadorAviso.current)
    refTemporizadorAviso.current = window.setTimeout(() => setAviso(''), 4000)
  }

  function alOrdenar(campo) {
    setOrden((actual) =>
      actual.campo === campo
        ? { campo, direccion: actual.direccion === 'asc' ? 'desc' : 'asc' }
        : { campo, direccion: 'asc' },
    )
  }

  function alCambiarOrdenMovil(valor) {
    const [campo, direccion] = valor.split(':')
    setOrden({ campo, direccion })
  }

  function abrirCrear(evento) {
    refBotonNuevaPersona.current = evento.currentTarget
    setModalPersona({ modo: 'crear' })
  }

  function abrirEditar(persona, evento) {
    refDisparadorAccion.current = evento.currentTarget
    setModalPersona({ modo: 'editar', persona })
  }

  function abrirEliminar(persona, evento) {
    refDisparadorAccion.current = evento.currentTarget
    setPersonaAEliminar(persona)
  }

  /** Tras crear o editar una persona: cierra el modal, recarga el listado y avisa. */
  function alGuardarPersona(personaGuardada, esEdicion) {
    setModalPersona(null)
    recargar()
    mostrarAviso(esEdicion ? `${personaGuardada.perNombre} actualizada` : `${personaGuardada.perNombre} registrada`)
  }

  /** Tras eliminar una persona: cierra el modal, recarga el listado y avisa. */
  function alEliminarPersona(nombreEliminado) {
    setPersonaAEliminar(null)
    recargar()
    mostrarAviso(`${nombreEliminado} eliminada`)
  }

  /** La persona que se quiso eliminar ya no existía (la borraron en otra sesión): cierra, recarga y avisa. */
  function alPersonaYaNoExiste() {
    setPersonaAEliminar(null)
    recargar()
    mostrarAviso('Esa persona ya no existía: se actualizó el listado')
  }

  function limpiarFiltros() {
    setBusqueda('')
    setTipo('todos')
  }

  const sinPersonas = !cargando && !error && personas.length === 0
  const sinCoincidencias = !cargando && !error && personas.length > 0 && resultado.length === 0
  const hayResultados = !cargando && !error && resultado.length > 0

  return (
    <div className="personas-pagina">
      <EncabezadoPagina titulo="Personas" />

      <div className="personas-controles">
        <div className="campo-busqueda campo-busqueda--con-icono">
          <label htmlFor="personas-busqueda">Buscar por nombre, apellido, CI o RUC</label>
          <div className="campo-busqueda-entrada">
            <Search aria-hidden="true" size={18} className="campo-busqueda-icono" />
            <input
              id="personas-busqueda"
              type="search"
              value={busqueda}
              onChange={(evento) => setBusqueda(evento.target.value)}
              placeholder="Ej. Juan Pérez"
            />
          </div>
        </div>

        <div className="campo-filtro">
          <label htmlFor="personas-filtro-tipo">Tipo</label>
          <select id="personas-filtro-tipo" value={tipo} onChange={(evento) => setTipo(evento.target.value)}>
            {FILTROS_TIPO.map((opcion) => (
              <option key={opcion.valor} value={opcion.valor}>
                {opcion.etiqueta}
              </option>
            ))}
          </select>
        </div>

        <button type="button" ref={refBotonNuevaPersona} className="personas-boton-nuevo" onClick={abrirCrear}>
          <Plus aria-hidden="true" size={18} />
          Nueva persona
        </button>
      </div>

      <div className="campo-filtro personas-orden-movil">
        <label htmlFor="personas-orden-movil">Ordenar por</label>
        <select
          id="personas-orden-movil"
          value={`${orden.campo}:${orden.direccion}`}
          onChange={(evento) => alCambiarOrdenMovil(evento.target.value)}
        >
          {OPCIONES_ORDEN_MOVIL.map((opcion) => (
            <option key={opcion.valor} value={opcion.valor}>
              {opcion.etiqueta}
            </option>
          ))}
        </select>
      </div>

      {!cargando && !error && (
        <p className="visualmente-oculto" aria-live="polite">
          {resultado.length === 1 ? '1 persona encontrada' : `${resultado.length} personas encontradas`}
        </p>
      )}

      {aviso && (
        <p className="personas-aviso" role="status" aria-live="polite">
          {aviso}
        </p>
      )}

      {cargando && <p role="status">Cargando personas…</p>}

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

      {sinPersonas && (
        <div className="estado-mensaje tarjeta">
          <Inbox aria-hidden="true" size={40} className="estado-mensaje-icono" />
          <p>Todavía no hay personas registradas</p>
        </div>
      )}

      {sinCoincidencias && (
        <div className="estado-mensaje tarjeta">
          <SearchX aria-hidden="true" size={40} className="estado-mensaje-icono" />
          <p>No hay personas que coincidan</p>
          <button type="button" className="boton-secundario" onClick={limpiarFiltros}>
            Limpiar filtros
          </button>
        </div>
      )}

      {hayResultados && (
        <>
          <div className="personas-tabla-solo-escritorio">
            <TablaPersonas personas={personasDeLaPagina} orden={orden} onOrdenar={alOrdenar} onEditar={abrirEditar} onEliminar={abrirEliminar} />
          </div>

          <div className="personas-tarjetas-solo-movil">
            {personasDeLaPagina.map((persona) => (
              <TarjetaPersona key={persona.perId} persona={persona} onEditar={abrirEditar} onEliminar={abrirEliminar} />
            ))}
          </div>

          <Paginacion
            paginaActual={paginaActual}
            totalPaginas={totalPaginas}
            totalResultados={resultado.length}
            filasPorPagina={FILAS_POR_PAGINA}
            onCambiarPagina={setPagina}
          />
        </>
      )}

      {modalPersona && (
        <ModalFormularioPersona
          persona={modalPersona.modo === 'editar' ? modalPersona.persona : null}
          onCerrar={() => setModalPersona(null)}
          onGuardado={alGuardarPersona}
          refDisparador={modalPersona.modo === 'crear' ? refBotonNuevaPersona : refDisparadorAccion}
        />
      )}

      {personaAEliminar && (
        <ModalEliminarPersona
          persona={personaAEliminar}
          onCerrar={() => setPersonaAEliminar(null)}
          onEliminado={alEliminarPersona}
          onYaNoExiste={alPersonaYaNoExiste}
          refDisparador={refDisparadorAccion}
        />
      )}
    </div>
  )
}
