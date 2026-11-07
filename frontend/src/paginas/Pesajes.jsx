/**
 * Listado de sesiones de pesaje (RF011): trae el resumen desde el backend
 * (GET /api/pesajes/sesiones) y permite buscar por lote o grupo, filtrar
 * por lote (por subGrupoId; ver listadoSesiones.js) y por rango de fechas,
 * ordenar por cualquier columna, paginar en el cliente, y elegir qué
 * columnas opcionales mostrar (preferencia que se recuerda en localStorage,
 * ver usePreferenciasListadoPesajes). El botón "+ Nuevo pesaje" (RF002)
 * abre ModalNuevoPesaje; tocar una fila/tarjeta abre ModalDetalleSesion
 * (ver ese archivo), desde donde se puede editar, eliminar o agregar
 * pesajes de la sesión. En los dos casos, tras guardar se recarga este
 * listado sin perder búsqueda, filtros, orden ni página (mismo criterio
 * que Animales.jsx).
 */

import { FilterX, Inbox, Plus, RefreshCw, Search, SearchX, TriangleAlert } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import EncabezadoPagina from '../componentes/EncabezadoPagina'
import Intervalo from '../componentes/Intervalo'
import Paginacion from '../componentes/Paginacion'
import PanelOpciones from '../componentes/PanelOpciones'
import './Pesajes.css'
import { COLUMNAS_OPCIONALES, OPCIONES_ORDEN_MOVIL } from './pesajes/columnas'
import { filtrarYOrdenarSesiones, obtenerLotesDisponibles } from './pesajes/listadoSesiones'
import ModalDetalleSesion from './pesajes/ModalDetalleSesion'
import ModalNuevoPesaje from './pesajes/ModalNuevoPesaje'
import TablaSesiones from './pesajes/TablaSesiones'
import TarjetaSesion from './pesajes/TarjetaSesion'
import { usePreferenciasListadoPesajes } from './pesajes/usePreferenciasListadoPesajes'
import { useSesionesResumen } from './pesajes/useSesionesResumen'
import VistaAnulados from './pesajes/VistaAnulados'

const COLUMNAS_OBLIGATORIAS = [
  { clave: 'fecha', etiqueta: 'Fecha' },
  { clave: 'lote', etiqueta: 'Lote' },
]

export default function Pesajes() {
  const { sesiones, cargando, error, recargar } = useSesionesResumen()
  const { columnasVisibles, filasPorPagina, cambiarColumnaVisible, cambiarFilasPorPagina, restablecer } =
    usePreferenciasListadoPesajes()

  // "Sesiones" (listado normal) o "Anulados" (solo lectura, ver
  // VistaAnulados.jsx); el filtro de Intervalo (desde/hasta) es común a las
  // dos vistas.
  const [vista, setVista] = useState('sesiones')
  const refTabSesiones = useRef(null)
  const refTabAnulados = useRef(null)

  // Si se llegó acá desde "Ver sesión" (HistorialPesajesAnimal.jsx), el
  // código de sesión viene en la URL y precarga la búsqueda; es solo un
  // valor inicial (no se vuelve a sincronizar con la URL después), así que
  // alcanza con leerlo una vez al montar.
  const [searchParams] = useSearchParams()
  const [busqueda, setBusqueda] = useState(() => searchParams.get('codigo') ?? '')
  const [lote, setLote] = useState('todos')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [orden, setOrden] = useState({ campo: 'fecha', direccion: 'desc' })
  const [pagina, setPagina] = useState(1)

  const [modalNuevoAbierto, setModalNuevoAbierto] = useState(false)
  const [sesionSeleccionada, setSesionSeleccionada] = useState(null)
  const [aviso, setAviso] = useState('')
  const refBotonNuevoPesaje = useRef(null)
  const refDisparadorDetalle = useRef(null)
  const refTemporizadorAviso = useRef(null)

  /** Cambia el intervalo aplicado (ver componentes/Intervalo.jsx); ya viene validado (desde <= hasta o alguno vacío). */
  function cambiarIntervalo({ desde: nuevoDesde, hasta: nuevoHasta }) {
    setDesde(nuevoDesde)
    setHasta(nuevoHasta)
  }

  /** Flechas izquierda/derecha alternan entre las dos vistas y mueven el foco con ellas (patrón ARIA tablist). */
  function manejarTeclaVista(evento) {
    if (evento.key === 'ArrowRight' || evento.key === 'ArrowLeft') {
      evento.preventDefault()
      const siguiente = vista === 'sesiones' ? 'anulados' : 'sesiones'
      setVista(siguiente)
      ;(siguiente === 'sesiones' ? refTabSesiones : refTabAnulados).current?.focus()
    }
  }

  // Volver a la página 1 cuando cambia la búsqueda, un filtro o el orden
  // (mismo patrón que Animales.jsx: se ajusta durante el render, no en un
  // useEffect, para evitar un re-render extra).
  const [filtrosPrevios, setFiltrosPrevios] = useState({ busqueda, lote, desde, hasta, orden })
  if (
    filtrosPrevios.busqueda !== busqueda ||
    filtrosPrevios.lote !== lote ||
    filtrosPrevios.desde !== desde ||
    filtrosPrevios.hasta !== hasta ||
    filtrosPrevios.orden !== orden
  ) {
    setFiltrosPrevios({ busqueda, lote, desde, hasta, orden })
    setPagina(1)
  }

  const lotesDisponibles = useMemo(() => obtenerLotesDisponibles(sesiones), [sesiones])

  const resultado = useMemo(
    () => filtrarYOrdenarSesiones(sesiones, { busqueda, lote, desde, hasta, orden }),
    [sesiones, busqueda, lote, desde, hasta, orden],
  )

  const totalPaginas = Math.max(1, Math.ceil(resultado.length / filasPorPagina))
  const paginaActual = Math.min(pagina, totalPaginas)
  const inicio = (paginaActual - 1) * filasPorPagina
  const sesionesDeLaPagina = resultado.slice(inicio, inicio + filasPorPagina)

  function limpiarFiltros() {
    setBusqueda('')
    setLote('todos')
    setDesde('')
    setHasta('')
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

  /** Muestra un aviso breve y lo retira solo a los pocos segundos (mismo patrón que Animales.jsx). */
  function mostrarAviso(mensaje) {
    setAviso(mensaje)
    window.clearTimeout(refTemporizadorAviso.current)
    refTemporizadorAviso.current = window.setTimeout(() => setAviso(''), 4000)
  }

  /** Abre el detalle de la sesión tocada (fila de tabla o tarjeta móvil); guarda qué elemento lo disparó para devolverle el foco al cerrar. */
  function alAbrirDetalle(sesion, evento) {
    refDisparadorDetalle.current = evento.currentTarget.querySelector('button') ?? evento.currentTarget
    setSesionSeleccionada(sesion)
  }

  /** Tras cualquier cambio en el detalle (editar/eliminar/agregar un pesaje): recarga el listado de fondo y avisa. */
  function alCambiarSesion(mensaje) {
    recargar()
    if (mensaje) {
      mostrarAviso(mensaje)
    }
  }

  /** La sesión que se estaba viendo se quedó sin pesajes activos (se anuló el último): cierra el detalle, recarga y avisa. */
  function alQuedarSinAnimales() {
    setSesionSeleccionada(null)
    recargar()
    mostrarAviso('La sesión quedó sin pesajes activos y se cerró')
  }

  /** Tras guardar desde "Nuevo pesaje" (cualquiera de las dos pestañas): cierra el modal, recarga el listado y avisa. */
  function alGuardarNuevoPesaje(mensaje) {
    setModalNuevoAbierto(false)
    recargar()
    mostrarAviso(mensaje)
  }

  /** "Guardar y agregar otro" de la pestaña Individual: recarga y avisa, pero el modal se queda abierto para seguir cargando. */
  function alGuardarParcialNuevoPesaje(mensaje) {
    recargar()
    mostrarAviso(mensaje)
  }

  const sinSesiones = !cargando && !error && sesiones.length === 0
  const sinCoincidencias = !cargando && !error && sesiones.length > 0 && resultado.length === 0
  const hayResultados = !cargando && !error && resultado.length > 0

  return (
    <div className="pesajes-pagina">
      <EncabezadoPagina titulo="Pesajes">
        <div role="tablist" aria-label="Vista de pesajes" className="pesajes-vistas">
          <button
            type="button"
            ref={refTabSesiones}
            role="tab"
            id="pesajes-tab-sesiones"
            aria-selected={vista === 'sesiones'}
            aria-controls="pesajes-panel-sesiones"
            tabIndex={vista === 'sesiones' ? 0 : -1}
            className={`pesajes-vista-tab${vista === 'sesiones' ? ' pesajes-vista-tab--activa' : ''}`}
            onClick={() => setVista('sesiones')}
            onKeyDown={manejarTeclaVista}
          >
            Sesiones
          </button>
          <button
            type="button"
            ref={refTabAnulados}
            role="tab"
            id="pesajes-tab-anulados"
            aria-selected={vista === 'anulados'}
            aria-controls="pesajes-panel-anulados"
            tabIndex={vista === 'anulados' ? 0 : -1}
            className={`pesajes-vista-tab${vista === 'anulados' ? ' pesajes-vista-tab--activa' : ''}`}
            onClick={() => setVista('anulados')}
            onKeyDown={manejarTeclaVista}
          >
            Anulados
          </button>
        </div>
      </EncabezadoPagina>

      <div className="pesajes-controles">
        <div className="pesajes-busqueda-fila">
          {vista === 'sesiones' && (
            <div className="campo-busqueda campo-busqueda--con-icono">
              <label htmlFor="pesajes-busqueda">Buscar por lote, grupo o código de sesión</label>
              <div className="campo-busqueda-entrada">
                <Search aria-hidden="true" size={18} className="campo-busqueda-icono" />
                <input
                  id="pesajes-busqueda"
                  type="search"
                  value={busqueda}
                  onChange={(evento) => setBusqueda(evento.target.value)}
                  placeholder="Ej. Recría o S-261029-3"
                />
              </div>
            </div>
          )}

          <button
            type="button"
            ref={refBotonNuevoPesaje}
            className="pesajes-boton-nuevo"
            onClick={() => setModalNuevoAbierto(true)}
          >
            <Plus aria-hidden="true" size={18} />
            Nuevo pesaje
          </button>

          {vista === 'sesiones' && (
            <PanelOpciones
              columnasObligatorias={COLUMNAS_OBLIGATORIAS}
              columnasOpcionales={COLUMNAS_OPCIONALES}
              columnasVisibles={columnasVisibles}
              onCambiarColumnaVisible={cambiarColumnaVisible}
              filasPorPagina={filasPorPagina}
              onCambiarFilasPorPagina={cambiarFilasPorPagina}
              onRestablecer={restablecer}
            />
          )}
        </div>

        <Intervalo desde={desde} hasta={hasta} onCambiar={cambiarIntervalo} />

        {vista === 'sesiones' && (
          <div className="campo-filtro">
            <label htmlFor="pesajes-filtro-lote">Lote</label>
            <select id="pesajes-filtro-lote" value={lote} onChange={(evento) => setLote(evento.target.value)}>
              <option value="todos">Todos los lotes</option>
              <option value="sin-lote">Sin lote</option>
              {lotesDisponibles.map((opcion) => (
                <option key={opcion.valor} value={opcion.valor}>
                  {opcion.etiqueta}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {aviso && (
        <p className="pesajes-aviso" role="status" aria-live="polite">
          {aviso}
        </p>
      )}

      {vista === 'anulados' && (
        <div id="pesajes-panel-anulados" role="tabpanel" aria-labelledby="pesajes-tab-anulados">
          <VistaAnulados desde={desde} hasta={hasta} />
        </div>
      )}

      {vista === 'sesiones' && (
        <div id="pesajes-panel-sesiones" role="tabpanel" aria-labelledby="pesajes-tab-sesiones">
          <div className="campo-filtro pesajes-orden-movil">
            <label htmlFor="pesajes-orden-movil">Ordenar por</label>
            <select
              id="pesajes-orden-movil"
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
              {resultado.length === 1 ? '1 sesión encontrada' : `${resultado.length} sesiones encontradas`}
            </p>
          )}

          {cargando && <p role="status">Cargando pesajes…</p>}

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

          {sinSesiones && (
            <div className="estado-mensaje tarjeta">
              <Inbox aria-hidden="true" size={40} className="estado-mensaje-icono" />
              <p>Todavía no hay pesajes registrados</p>
            </div>
          )}

          {sinCoincidencias && (
            <div className="estado-mensaje tarjeta">
              <SearchX aria-hidden="true" size={40} className="estado-mensaje-icono" />
              <p>No hay sesiones que coincidan</p>
              <button type="button" className="boton boton-secundario" onClick={limpiarFiltros}>
                <FilterX aria-hidden="true" size={16} />
                Limpiar filtros
              </button>
            </div>
          )}

          {hayResultados && (
            <>
              <div className="pesajes-tabla-solo-escritorio">
                <TablaSesiones
                  sesiones={sesionesDeLaPagina}
                  columnasVisibles={columnasVisibles}
                  orden={orden}
                  onOrdenar={alOrdenar}
                  onAbrirDetalle={alAbrirDetalle}
                />
              </div>

              <div className="pesajes-tarjetas-solo-movil">
                {sesionesDeLaPagina.map((sesion) => (
                  <TarjetaSesion
                    key={`${sesion.fecha}-${sesion.subGrupoId ?? 'sin-lote'}`}
                    sesion={sesion}
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
        </div>
      )}

      {modalNuevoAbierto && (
        <ModalNuevoPesaje
          onCerrar={() => setModalNuevoAbierto(false)}
          onGuardado={alGuardarNuevoPesaje}
          onGuardadoParcial={alGuardarParcialNuevoPesaje}
          refDisparador={refBotonNuevoPesaje}
        />
      )}

      {sesionSeleccionada && (
        <ModalDetalleSesion
          sesion={sesionSeleccionada}
          onCerrar={() => setSesionSeleccionada(null)}
          onCambiada={alCambiarSesion}
          onQuedoSinAnimales={alQuedarSinAnimales}
          refDisparador={refDisparadorDetalle}
        />
      )}
    </div>
  )
}
