/**
 * Listado de animales (RF010): trae el resumen desde el backend
 * (GET /api/animales/resumen) y permite buscar por caravana, filtrar por
 * lote (por subGrupoId; ver listadoAnimales.js), por raza, por proveedor, por GMD mínima y
 * máxima (los animales sin GMD quedan afuera cuando hay un límite válido),
 * por estado (apto/no apto para venta) y por estado de salida (Activos por
 * defecto/Salidos/Todos, un filtro aparte del de apto/no apto). Todo se
 * filtra en el cliente, sobre el resumen completo que ya trae el backend
 * (no hay paginación ni filtros en el servidor). Con filtros activos se
 * muestra un indicador con "Limpiar filtros". Ordena por cualquier columna,
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
 * aviso breve. La URL puede traer ?caravana=, que precarga la búsqueda.
 */

import { FilterX, Funnel, Inbox, Plus, RefreshCw, Search, SearchX, TriangleAlert } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import EncabezadoPagina from '../componentes/EncabezadoPagina'
import Paginacion from '../componentes/Paginacion'
import PanelOpciones from '../componentes/PanelOpciones'
import { obtenerRazasDisponibles } from '../utilidades/filtrosAnimales'
import { COLUMNAS_OPCIONALES, OPCIONES_ORDEN_MOVIL } from './animales/columnas'
import {
  contarFiltrosActivos,
  FILTROS_POR_DEFECTO,
  filtrarYOrdenarAnimales,
  obtenerLotesDisponibles,
  obtenerProveedoresDisponibles,
} from './animales/listadoAnimales'
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

const ORDEN_POR_DEFECTO = { campo: 'aniCaravana', direccion: 'asc' }

export default function Animales() {
  const { animales, cargando, error, recargar } = useAnimalesResumen()
  const { columnasVisibles, filasPorPagina, cambiarColumnaVisible, cambiarFilasPorPagina, restablecer } =
    usePreferenciasListadoAnimales()

  // Si se llegó desde las alertas de Inicio, la caravana viene en la URL y
  // precarga el buscador; es solo un valor inicial (mismo criterio que el
  // código de sesión en Pesajes), así que alcanza con leerla una vez al montar.
  const [searchParams] = useSearchParams()
  const [busqueda, setBusqueda] = useState(() => searchParams.get('caravana') ?? '')
  const [lote, setLote] = useState('todos')
  const [estado, setEstado] = useState('todos')
  const [estadoSalida, setEstadoSalida] = useState(FILTROS_POR_DEFECTO.estadoSalida)
  const [raza, setRaza] = useState(FILTROS_POR_DEFECTO.raza)
  const [proveedor, setProveedor] = useState(FILTROS_POR_DEFECTO.proveedor)
  // Los límites de GMD se guardan como el texto que se escribe (no como
  // número) para poder aceptar un valor a medio escribir ("-", ","): el
  // filtro lo ignora hasta que sea un número (ver utilidades/filtrosAnimales.js).
  const [gmdMin, setGmdMin] = useState(FILTROS_POR_DEFECTO.gmdMin)
  const [gmdMax, setGmdMax] = useState(FILTROS_POR_DEFECTO.gmdMax)
  const [orden, setOrden] = useState(ORDEN_POR_DEFECTO)
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
  const [filtrosPrevios, setFiltrosPrevios] = useState({
    busqueda,
    lote,
    estado,
    estadoSalida,
    raza,
    proveedor,
    gmdMin,
    gmdMax,
    orden,
  })
  if (
    filtrosPrevios.busqueda !== busqueda ||
    filtrosPrevios.lote !== lote ||
    filtrosPrevios.estado !== estado ||
    filtrosPrevios.estadoSalida !== estadoSalida ||
    filtrosPrevios.raza !== raza ||
    filtrosPrevios.proveedor !== proveedor ||
    filtrosPrevios.gmdMin !== gmdMin ||
    filtrosPrevios.gmdMax !== gmdMax ||
    filtrosPrevios.orden !== orden
  ) {
    setFiltrosPrevios({ busqueda, lote, estado, estadoSalida, raza, proveedor, gmdMin, gmdMax, orden })
    setPagina(1)
  }

  const lotesDisponibles = useMemo(() => obtenerLotesDisponibles(animales), [animales])
  const razasDisponibles = useMemo(() => obtenerRazasDisponibles(animales), [animales])
  const proveedoresDisponibles = useMemo(() => obtenerProveedoresDisponibles(animales), [animales])

  const resultado = useMemo(
    () => filtrarYOrdenarAnimales(animales, {
        busqueda,
        lote,
        estado,
        estadoSalida,
        raza,
        proveedor,
        gmdMin,
        gmdMax,
        orden,
      }),
    [animales, busqueda, lote, estado, estadoSalida, raza, proveedor, gmdMin, gmdMax, orden],
  )

  const cantidadFiltros = contarFiltrosActivos({
    busqueda,
    lote,
    estado,
    estadoSalida,
    raza,
    proveedor,
    gmdMin,
    gmdMax,
  })

  const totalPaginas = Math.max(1, Math.ceil(resultado.length / filasPorPagina))
  // Por si cambiaron las filas por página (u otra cosa) y la página
  // guardada quedó fuera de rango: se recorta en vez de romper.
  const paginaActual = Math.min(pagina, totalPaginas)
  const inicio = (paginaActual - 1) * filasPorPagina
  const animalesDeLaPagina = resultado.slice(inicio, inicio + filasPorPagina)

  /** Vuelve todos los filtros a su valor por defecto (el orden no es un filtro: se conserva). */
  function limpiarFiltros() {
    setBusqueda(FILTROS_POR_DEFECTO.busqueda)
    setLote(FILTROS_POR_DEFECTO.lote)
    setEstado(FILTROS_POR_DEFECTO.estado)
    setEstadoSalida(FILTROS_POR_DEFECTO.estadoSalida)
    setRaza(FILTROS_POR_DEFECTO.raza)
    setProveedor(FILTROS_POR_DEFECTO.proveedor)
    setGmdMin(FILTROS_POR_DEFECTO.gmdMin)
    setGmdMax(FILTROS_POR_DEFECTO.gmdMax)
  }

  /**
   * Control "Ordenar por GMD": no es un orden aparte, mueve el mismo
   * "orden" que el encabezado de la tabla y el selector "Ordenar por" de
   * celular, así que los tres siempre muestran lo mismo. Elegir "Sin
   * orden por GMD" vuelve al orden por defecto (caravana).
   */
  function alCambiarOrdenGmd(direccion) {
    setOrden(direccion ? { campo: 'gmd', direccion } : ORDEN_POR_DEFECTO)
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

        <div className="campo-filtro">
          <label htmlFor="animales-filtro-raza">Raza</label>
          <select id="animales-filtro-raza" value={raza} onChange={(evento) => setRaza(evento.target.value)}>
            <option value="todas">Todas las razas</option>
            {razasDisponibles.map((opcion) => (
              <option key={opcion.valor} value={opcion.valor}>
                {opcion.etiqueta}
              </option>
            ))}
          </select>
        </div>

        <div className="campo-filtro">
          <label htmlFor="animales-filtro-proveedor">Proveedor</label>
          <select
            id="animales-filtro-proveedor"
            value={proveedor}
            onChange={(evento) => setProveedor(evento.target.value)}
          >
            <option value="todos">Todos los proveedores</option>
            <option value="sin-proveedor">Sin proveedor</option>
            {proveedoresDisponibles.map((opcion) => (
              <option key={opcion.valor} value={opcion.valor}>
                {opcion.etiqueta}
              </option>
            ))}
          </select>
        </div>

        <div className="campo-filtro animales-filtro-gmd">
          <label htmlFor="animales-filtro-gmd-min">GMD mínima (kg/día)</label>
          <input
            id="animales-filtro-gmd-min"
            className="entrada"
            type="text"
            inputMode="decimal"
            value={gmdMin}
            onChange={(evento) => setGmdMin(evento.target.value)}
            placeholder="Ej. 0,8"
          />
        </div>

        <div className="campo-filtro animales-filtro-gmd">
          <label htmlFor="animales-filtro-gmd-max">GMD máxima (kg/día)</label>
          <input
            id="animales-filtro-gmd-max"
            className="entrada"
            type="text"
            inputMode="decimal"
            value={gmdMax}
            onChange={(evento) => setGmdMax(evento.target.value)}
            placeholder="Ej. 1,5"
          />
        </div>

        <div className="campo-filtro">
          <label htmlFor="animales-filtro-orden-gmd">Ordenar por GMD</label>
          <select
            id="animales-filtro-orden-gmd"
            value={orden.campo === 'gmd' ? orden.direccion : ''}
            onChange={(evento) => alCambiarOrdenGmd(evento.target.value)}
          >
            <option value="">Sin orden por GMD</option>
            <option value="desc">Mayor a menor</option>
            <option value="asc">Menor a mayor</option>
          </select>
        </div>

        {cantidadFiltros > 0 && (
          <div className="animales-filtros-activos">
            <p className="animales-filtros-activos-texto" aria-live="polite">
              <Funnel aria-hidden="true" size={16} />
              {cantidadFiltros === 1 ? '1 filtro activo' : `${cantidadFiltros} filtros activos`}
            </p>
            <button type="button" className="boton boton-secundario" onClick={limpiarFiltros}>
              <FilterX aria-hidden="true" size={16} />
              Limpiar filtros
            </button>
          </div>
        )}
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
