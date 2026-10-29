/**
 * Listado de sesiones de pesaje (RF011): trae el resumen desde el backend
 * (GET /api/pesajes/sesiones) y permite buscar por lote o grupo, filtrar
 * por lote (por subGrupoId; ver listadoSesiones.js) y por rango de fechas,
 * ordenar por cualquier columna, paginar en el cliente, y elegir qué
 * columnas opcionales mostrar (preferencia que se recuerda en localStorage,
 * ver usePreferenciasListadoPesajes). Tocar una fila/tarjeta abre
 * ModalDetalleSesion (ver ese archivo), desde donde se puede editar,
 * eliminar o agregar pesajes de la sesión. Tras cualquier cambio ahí
 * dentro, se recarga este listado sin perder búsqueda, filtros, orden ni
 * página (mismo criterio que Animales.jsx). Todavía no tiene un botón
 * "+ Nuevo pesaje" (se agrega en un tramo aparte).
 */

import { FilterX, Inbox, RefreshCw, Search, SearchX, TriangleAlert } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import EncabezadoPagina from '../componentes/EncabezadoPagina'
import Paginacion from '../componentes/Paginacion'
import PanelOpciones from '../componentes/PanelOpciones'
import './Pesajes.css'
import { COLUMNAS_OPCIONALES, OPCIONES_ORDEN_MOVIL } from './pesajes/columnas'
import { filtrarYOrdenarSesiones, obtenerLotesDisponibles } from './pesajes/listadoSesiones'
import ModalDetalleSesion from './pesajes/ModalDetalleSesion'
import TablaSesiones from './pesajes/TablaSesiones'
import TarjetaSesion from './pesajes/TarjetaSesion'
import { usePreferenciasListadoPesajes } from './pesajes/usePreferenciasListadoPesajes'
import { useSesionesResumen } from './pesajes/useSesionesResumen'

const COLUMNAS_OBLIGATORIAS = [
  { clave: 'fecha', etiqueta: 'Fecha' },
  { clave: 'lote', etiqueta: 'Lote' },
]

export default function Pesajes() {
  const { sesiones, cargando, error, recargar } = useSesionesResumen()
  const { columnasVisibles, filasPorPagina, cambiarColumnaVisible, cambiarFilasPorPagina, restablecer } =
    usePreferenciasListadoPesajes()

  const [busqueda, setBusqueda] = useState('')
  const [lote, setLote] = useState('todos')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [orden, setOrden] = useState({ campo: 'fecha', direccion: 'desc' })
  const [pagina, setPagina] = useState(1)

  const [sesionSeleccionada, setSesionSeleccionada] = useState(null)
  const [aviso, setAviso] = useState('')
  const refDisparadorDetalle = useRef(null)
  const refTemporizadorAviso = useRef(null)

  const rangoInvalido = Boolean(desde && hasta && desde > hasta)

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
    () =>
      filtrarYOrdenarSesiones(sesiones, {
        busqueda,
        lote,
        // Mientras el rango esté invertido, se ignora (ver el mensaje de
        // error bajo "Hasta"): mostrar "sin coincidencias" sería más
        // confuso que simplemente no filtrar por fecha todavía.
        desde: rangoInvalido ? '' : desde,
        hasta: rangoInvalido ? '' : hasta,
        orden,
      }),
    [sesiones, busqueda, lote, desde, hasta, rangoInvalido, orden],
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

  /** La sesión que se estaba viendo se quedó sin animales (se eliminó el último pesaje): cierra el detalle, recarga y avisa. */
  function alQuedarSinAnimales() {
    setSesionSeleccionada(null)
    recargar()
    mostrarAviso('La sesión quedó sin animales y se eliminó')
  }

  const sinSesiones = !cargando && !error && sesiones.length === 0
  const sinCoincidencias = !cargando && !error && sesiones.length > 0 && resultado.length === 0
  const hayResultados = !cargando && !error && resultado.length > 0

  return (
    <div className="pesajes-pagina">
      <EncabezadoPagina titulo="Pesajes" />

      <div className="pesajes-controles">
        <div className="pesajes-busqueda-fila">
          <div className="campo-busqueda campo-busqueda--con-icono">
            <label htmlFor="pesajes-busqueda">Buscar por lote o grupo</label>
            <div className="campo-busqueda-entrada">
              <Search aria-hidden="true" size={18} className="campo-busqueda-icono" />
              <input
                id="pesajes-busqueda"
                type="search"
                value={busqueda}
                onChange={(evento) => setBusqueda(evento.target.value)}
                placeholder="Ej. Recría"
              />
            </div>
          </div>

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

        <div className="campo-filtro">
          <label htmlFor="pesajes-filtro-desde">Desde</label>
          <input
            id="pesajes-filtro-desde"
            type="date"
            value={desde}
            max={hasta || undefined}
            onChange={(evento) => setDesde(evento.target.value)}
            aria-invalid={rangoInvalido}
            aria-describedby={rangoInvalido ? 'pesajes-filtro-rango-error' : undefined}
          />
        </div>

        <div className="campo-filtro">
          <label htmlFor="pesajes-filtro-hasta">Hasta</label>
          <input
            id="pesajes-filtro-hasta"
            type="date"
            value={hasta}
            min={desde || undefined}
            onChange={(evento) => setHasta(evento.target.value)}
            aria-invalid={rangoInvalido}
            aria-describedby={rangoInvalido ? 'pesajes-filtro-rango-error' : undefined}
          />
        </div>
      </div>

      {rangoInvalido && (
        <p id="pesajes-filtro-rango-error" className="pesajes-filtro-error" role="alert">
          "Desde" no puede ser posterior a "Hasta"
        </p>
      )}

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

      {aviso && (
        <p className="pesajes-aviso" role="status" aria-live="polite">
          {aviso}
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
