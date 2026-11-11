/**
 * Listado de animales (RF010): trae el resumen desde el backend
 * (GET /api/animales/resumen) y permite buscar por caravana, filtrar por
 * lote (por subGrupoId; ver listadoAnimales.js), por estado (apto/no apto
 * para venta) y por estado de salida (Activos por defecto/Salidos/Todos,
 * un filtro aparte del de apto/no apto), ordenar por cualquier columna,
 * paginar en el cliente, y elegir qué columnas opcionales mostrar
 * (preferencia que se recuerda en localStorage, ver
 * usePreferenciasListadoAnimales). El botón "+ Nuevo animal" (RF001) abre
 * ModalNuevoAnimal; tocar una fila/tarjeta abre ModalDetalleAnimal (ver
 * ese archivo), desde donde se puede editar, eliminar, registrar la
 * salida o reactivar un animal que ya salió. Editar/eliminar recargan el
 * listado y cierran el modal; registrar salida/reactivar también
 * recargan, pero dejan el modal abierto mostrando el detalle actualizado
 * (ver alRegistrarSalida/alReactivarAnimal). En todos los casos se
 * conserva la búsqueda, los filtros, el orden y la página (son estados
 * propios de esta pantalla, ajenos a la recarga; si la página actual
 * queda vacía, paginaActual ya se recorta sola más abajo) y se muestra un
 * aviso breve.
 */

import { FilterX, Inbox, Plus, RefreshCw, Search, SearchX, TriangleAlert } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import EncabezadoPagina from '../componentes/EncabezadoPagina'
import Paginacion from '../componentes/Paginacion'
import PanelOpciones from '../componentes/PanelOpciones'
import { COLUMNAS_OPCIONALES, OPCIONES_ORDEN_MOVIL } from './animales/columnas'
import { filtrarYOrdenarAnimales, obtenerLotesDisponibles } from './animales/listadoAnimales'
import ModalDetalleAnimal from './animales/ModalDetalleAnimal'
import ModalNuevoAnimal from './animales/ModalNuevoAnimal'
import TablaAnimales from './animales/TablaAnimales'
import TarjetaAnimal from './animales/TarjetaAnimal'
import { useAnimalesResumen } from './animales/useAnimalesResumen'
import { usePreferenciasListadoAnimales } from './animales/usePreferenciasListadoAnimales'
import './Animales.css'

const COLUMNAS_OBLIGATORIAS = [{ clave: 'aniCaravana', etiqueta: 'Caravana' }]

const ESTADOS_FILTRO = [
  { valor: 'todos', etiqueta: 'Todos' },
  { valor: 'aptos', etiqueta: 'Aptos para venta' },
  { valor: 'no-aptos', etiqueta: 'No aptos' },
]

// "Activos" por defecto: un animal con salida registrada ya no es
// productivo, así que no tiene sentido verlo mezclado con el resto salvo
// que se lo pida explícitamente (ver listadoAnimales.js).
const ESTADOS_SALIDA_FILTRO = [
  { valor: 'activos', etiqueta: 'Activos' },
  { valor: 'salidos', etiqueta: 'Salidos' },
  { valor: 'todos', etiqueta: 'Todos' },
]

export default function Animales() {
  const { animales, cargando, error, recargar } = useAnimalesResumen()
  const { columnasVisibles, filasPorPagina, cambiarColumnaVisible, cambiarFilasPorPagina, restablecer } =
    usePreferenciasListadoAnimales()

  const [busqueda, setBusqueda] = useState('')
  const [lote, setLote] = useState('todos')
  const [estado, setEstado] = useState('todos')
  const [estadoSalida, setEstadoSalida] = useState('activos')
  const [orden, setOrden] = useState({ campo: 'aniCaravana', direccion: 'asc' })
  const [pagina, setPagina] = useState(1)

  const [modalAbierto, setModalAbierto] = useState(false)
  const [animalSeleccionado, setAnimalSeleccionado] = useState(null)
  const [aviso, setAviso] = useState('')
  const refBotonNuevoAnimal = useRef(null)
  const refDisparadorDetalle = useRef(null)
  const refTemporizadorAviso = useRef(null)

  // Volver a la página 1 cuando cambia la búsqueda, un filtro o el orden
  // (una página 5 con el filtro anterior puede no existir más). Se ajusta
  // durante el render en vez de en un useEffect: es el patrón que React
  // recomienda para "reiniciar estado cuando cambia otra cosa" (evita un
  // re-render extra y el aviso de set-state-in-effect).
  const [filtrosPrevios, setFiltrosPrevios] = useState({ busqueda, lote, estado, estadoSalida, orden })
  if (
    filtrosPrevios.busqueda !== busqueda ||
    filtrosPrevios.lote !== lote ||
    filtrosPrevios.estado !== estado ||
    filtrosPrevios.estadoSalida !== estadoSalida ||
    filtrosPrevios.orden !== orden
  ) {
    setFiltrosPrevios({ busqueda, lote, estado, estadoSalida, orden })
    setPagina(1)
  }

  const lotesDisponibles = useMemo(() => obtenerLotesDisponibles(animales), [animales])

  const resultado = useMemo(
    () => filtrarYOrdenarAnimales(animales, { busqueda, lote, estado, estadoSalida, orden }),
    [animales, busqueda, lote, estado, estadoSalida, orden],
  )

  const totalPaginas = Math.max(1, Math.ceil(resultado.length / filasPorPagina))
  // Por si cambiaron las filas por página (u otra cosa) y la página
  // guardada quedó fuera de rango: se recorta en vez de romper.
  const paginaActual = Math.min(pagina, totalPaginas)
  const inicio = (paginaActual - 1) * filasPorPagina
  const animalesDeLaPagina = resultado.slice(inicio, inicio + filasPorPagina)

  function limpiarFiltros() {
    setBusqueda('')
    setLote('todos')
    setEstado('todos')
    setEstadoSalida('activos')
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

  /** Muestra un aviso breve (ej. tras guardar un animal) y lo retira solo a los pocos segundos. */
  function mostrarAviso(mensaje) {
    setAviso(mensaje)
    window.clearTimeout(refTemporizadorAviso.current)
    refTemporizadorAviso.current = window.setTimeout(() => setAviso(''), 4000)
  }

  /** Tras guardar un animal nuevo: recarga el listado (los demás estados de la pantalla no se tocan) y avisa. */
  function alGuardarAnimal(animalCreado) {
    recargar()
    mostrarAviso(`Animal ${animalCreado.aniCaravana} registrado`)
  }

  /** Abre el detalle del animal tocado (fila de tabla o tarjeta móvil); guarda qué elemento lo disparó para devolverle el foco al cerrar. */
  function alAbrirDetalle(animal, evento) {
    refDisparadorDetalle.current = evento.currentTarget.querySelector('button') ?? evento.currentTarget
    setAnimalSeleccionado(animal)
  }

  /** Tras editar un animal desde el detalle: cierra los modales, recarga el listado y avisa. */
  function alActualizarAnimal(animalActualizado) {
    setAnimalSeleccionado(null)
    recargar()
    mostrarAviso(`Animal ${animalActualizado.aniCaravana} actualizado`)
  }

  /** Tras eliminar un animal desde el detalle: cierra los modales, recarga el listado y avisa. */
  function alEliminarAnimal(caravanaEliminada) {
    setAnimalSeleccionado(null)
    recargar()
    mostrarAviso(`Animal ${caravanaEliminada} eliminado`)
  }

  /** El animal que se quiso eliminar ya no existía (lo borraron en otra sesión): cierra, recarga y avisa. */
  function alAnimalYaNoExiste() {
    setAnimalSeleccionado(null)
    recargar()
    mostrarAviso('Ese animal ya no existía: se actualizó el listado')
  }

  /**
   * Tras registrar la salida de un animal: a diferencia de editar/eliminar,
   * el modal NO se cierra (sigue en la vista de detalle, que ya volvió a
   * "detalle" antes de llamar a esto, ver ModalDetalleAnimal.jsx) para que
   * se vea de una el resultado; "animalSeleccionado" se reemplaza por los
   * datos nuevos para que el detalle ya abierto los muestre sin esperar a
   * la recarga del listado de atrás.
   */
  function alRegistrarSalida(animalActualizado) {
    setAnimalSeleccionado(animalActualizado)
    recargar()
    mostrarAviso(`Salida registrada para ${animalActualizado.aniCaravana}`)
  }

  /** Tras reactivar un animal: mismo criterio que alRegistrarSalida (el modal queda abierto, mostrando el detalle ya reactivado). */
  function alReactivarAnimal(animalActualizado) {
    setAnimalSeleccionado(animalActualizado)
    recargar()
    mostrarAviso(`Animal ${animalActualizado.aniCaravana} reactivado`)
  }

  const sinAnimales = !cargando && !error && animales.length === 0
  const sinCoincidencias = !cargando && !error && animales.length > 0 && resultado.length === 0
  const hayResultados = !cargando && !error && resultado.length > 0

  return (
    <div className="animales-pagina">
      <EncabezadoPagina titulo="Animales" />

      <div className="animales-controles">
        <div className="animales-busqueda-fila">
          <div className="campo-busqueda campo-busqueda--con-icono">
            <label htmlFor="animales-busqueda">Buscar por caravana</label>
            <div className="campo-busqueda-entrada">
              <Search aria-hidden="true" size={18} className="campo-busqueda-icono" />
              <input
                id="animales-busqueda"
                type="search"
                value={busqueda}
                onChange={(evento) => setBusqueda(evento.target.value)}
                placeholder="Ej. CAR-001"
              />
            </div>
          </div>

          <button
            type="button"
            ref={refBotonNuevoAnimal}
            className="animales-boton-nuevo"
            onClick={() => setModalAbierto(true)}
          >
            <Plus aria-hidden="true" size={18} />
            Nuevo animal
          </button>

          <PanelOpciones
            columnasObligatorias={COLUMNAS_OBLIGATORIAS}
            columnasOpcionales={COLUMNAS_OPCIONALES}
            columnasVisibles={columnasVisibles}
            onCambiarColumnaVisible={cambiarColumnaVisible}
            filasPorPagina={filasPorPagina}
            onCambiarFilasPorPagina={cambiarFilasPorPagina}
            onRestablecer={restablecer}
          />
        </div>

        <div className="campo-filtro">
          <label htmlFor="animales-filtro-lote">Lote</label>
          <select id="animales-filtro-lote" value={lote} onChange={(evento) => setLote(evento.target.value)}>
            <option value="todos">Todos los lotes</option>
            <option value="sin-lote">Sin lote</option>
            {lotesDisponibles.map((opcion) => (
              <option key={opcion.valor} value={opcion.valor}>
                {opcion.etiqueta}
              </option>
            ))}
          </select>
        </div>

        <div className="campo-filtro">
          <label htmlFor="animales-filtro-estado">Estado</label>
          <select id="animales-filtro-estado" value={estado} onChange={(evento) => setEstado(evento.target.value)}>
            {ESTADOS_FILTRO.map((opcion) => (
              <option key={opcion.valor} value={opcion.valor}>
                {opcion.etiqueta}
              </option>
            ))}
          </select>
        </div>

        <div className="campo-filtro">
          <label htmlFor="animales-filtro-estado-salida">Estado de salida</label>
          <select
            id="animales-filtro-estado-salida"
            value={estadoSalida}
            onChange={(evento) => setEstadoSalida(evento.target.value)}
          >
            {ESTADOS_SALIDA_FILTRO.map((opcion) => (
              <option key={opcion.valor} value={opcion.valor}>
                {opcion.etiqueta}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="campo-filtro animales-orden-movil">
        <label htmlFor="animales-orden-movil">Ordenar por</label>
        <select
          id="animales-orden-movil"
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
          {resultado.length === 1 ? '1 animal encontrado' : `${resultado.length} animales encontrados`}
        </p>
      )}

      {aviso && (
        <p className="animales-aviso" role="status" aria-live="polite">
          {aviso}
        </p>
      )}

      {cargando && <p role="status">Cargando animales…</p>}

      {!cargando && error && (
        <div className="estado-mensaje tarjeta">
          <TriangleAlert aria-hidden="true" size={40} className="estado-mensaje-icono" />
          <p>{error}</p>
          <button type="button" className="boton boton-secundario" onClick={recargar}>
            <RefreshCw aria-hidden="true" size={16} />
            Reintentar
          </button>
        </div>
      )}

      {sinAnimales && (
        <div className="estado-mensaje tarjeta">
          <Inbox aria-hidden="true" size={40} className="estado-mensaje-icono" />
          <p>Todavía no hay animales registrados</p>
        </div>
      )}

      {sinCoincidencias && (
        <div className="estado-mensaje tarjeta">
          <SearchX aria-hidden="true" size={40} className="estado-mensaje-icono" />
          <p>No hay animales que coincidan</p>
          <button type="button" className="boton boton-secundario" onClick={limpiarFiltros}>
            <FilterX aria-hidden="true" size={16} />
            Limpiar filtros
          </button>
        </div>
      )}

      {hayResultados && (
        <>
          <div className="animales-tabla-solo-escritorio">
            <TablaAnimales
              animales={animalesDeLaPagina}
              columnasVisibles={columnasVisibles}
              orden={orden}
              onOrdenar={alOrdenar}
              onAbrirDetalle={alAbrirDetalle}
            />
          </div>

          <div className="animales-tarjetas-solo-movil">
            {animalesDeLaPagina.map((animal) => (
              <TarjetaAnimal
                key={animal.aniId}
                animal={animal}
                columnasVisibles={columnasVisibles}
                onAbrirDetalle={alAbrirDetalle}
              />
            ))}
          </div>

          <Paginacion
            paginaActual={paginaActual}
            totalPaginas={totalPaginas}
            totalResultados={resultado.length}
            filasPorPagina={filasPorPagina}
            onCambiarPagina={setPagina}
          />
        </>
      )}

      {modalAbierto && (
        <ModalNuevoAnimal
          onCerrar={() => setModalAbierto(false)}
          onGuardado={alGuardarAnimal}
          refDisparador={refBotonNuevoAnimal}
        />
      )}

      {animalSeleccionado && (
        <ModalDetalleAnimal
          animal={animalSeleccionado}
          onCerrar={() => setAnimalSeleccionado(null)}
          onActualizado={alActualizarAnimal}
          onEliminado={alEliminarAnimal}
          onYaNoExiste={alAnimalYaNoExiste}
          onSalidaRegistrada={alRegistrarSalida}
          onReactivado={alReactivarAnimal}
          refDisparador={refDisparadorDetalle}
        />
      )}
    </div>
  )
}
