/**
 * Listado de animales (RF010): trae el resumen desde el backend
 * (GET /api/animales/resumen) y permite buscar por caravana, filtrar por
 * lote y por estado, ordenar por cualquier columna, paginar en el cliente,
 * y elegir qué columnas opcionales mostrar (preferencia que se recuerda en
 * localStorage, ver usePreferenciasListadoAnimales). El botón "+ Nuevo
 * animal" (RF001) abre ModalNuevoAnimal; al guardar, se recarga el listado
 * sin perder búsqueda, filtros, orden ni opciones (son estados propios de
 * esta pantalla, ajenos a la recarga) y se muestra un aviso breve.
 */

import { useMemo, useRef, useState } from 'react'
import { OPCIONES_ORDEN_MOVIL } from './animales/columnas'
import { filtrarYOrdenarAnimales, obtenerLotesDisponibles } from './animales/listadoAnimales'
import ModalNuevoAnimal from './animales/ModalNuevoAnimal'
import Paginacion from './animales/Paginacion'
import PanelOpciones from './animales/PanelOpciones'
import TablaAnimales from './animales/TablaAnimales'
import TarjetaAnimal from './animales/TarjetaAnimal'
import { useAnimalesResumen } from './animales/useAnimalesResumen'
import { usePreferenciasListadoAnimales } from './animales/usePreferenciasListadoAnimales'
import './Animales.css'

const ESTADOS_FILTRO = [
  { valor: 'todos', etiqueta: 'Todos' },
  { valor: 'aptos', etiqueta: 'Aptos para venta' },
  { valor: 'no-aptos', etiqueta: 'No aptos' },
]

export default function Animales() {
  const { animales, cargando, error, recargar } = useAnimalesResumen()
  const { columnasVisibles, filasPorPagina, cambiarColumnaVisible, cambiarFilasPorPagina, restablecer } =
    usePreferenciasListadoAnimales()

  const [busqueda, setBusqueda] = useState('')
  const [lote, setLote] = useState('todos')
  const [estado, setEstado] = useState('todos')
  const [orden, setOrden] = useState({ campo: 'aniCaravana', direccion: 'asc' })
  const [pagina, setPagina] = useState(1)

  const [modalAbierto, setModalAbierto] = useState(false)
  const [aviso, setAviso] = useState('')
  const refBotonNuevoAnimal = useRef(null)
  const refTemporizadorAviso = useRef(null)

  // Volver a la página 1 cuando cambia la búsqueda, un filtro o el orden
  // (una página 5 con el filtro anterior puede no existir más). Se ajusta
  // durante el render en vez de en un useEffect: es el patrón que React
  // recomienda para "reiniciar estado cuando cambia otra cosa" (evita un
  // re-render extra y el aviso de set-state-in-effect).
  const [filtrosPrevios, setFiltrosPrevios] = useState({ busqueda, lote, estado, orden })
  if (
    filtrosPrevios.busqueda !== busqueda ||
    filtrosPrevios.lote !== lote ||
    filtrosPrevios.estado !== estado ||
    filtrosPrevios.orden !== orden
  ) {
    setFiltrosPrevios({ busqueda, lote, estado, orden })
    setPagina(1)
  }

  const lotesDisponibles = useMemo(() => obtenerLotesDisponibles(animales), [animales])

  const resultado = useMemo(
    () => filtrarYOrdenarAnimales(animales, { busqueda, lote, estado, orden }),
    [animales, busqueda, lote, estado, orden],
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

  const sinAnimales = !cargando && !error && animales.length === 0
  const sinCoincidencias = !cargando && !error && animales.length > 0 && resultado.length === 0
  const hayResultados = !cargando && !error && resultado.length > 0

  return (
    <div className="animales-pagina">
      <div className="animales-encabezado">
        <h1>Animales</h1>
      </div>

      <div className="animales-controles">
        <div className="animales-busqueda-fila">
          <div className="campo-busqueda">
            <label htmlFor="animales-busqueda">Buscar por caravana</label>
            <input
              id="animales-busqueda"
              type="search"
              value={busqueda}
              onChange={(evento) => setBusqueda(evento.target.value)}
              placeholder="Ej. CAR-001"
            />
          </div>

          <button
            type="button"
            ref={refBotonNuevoAnimal}
            className="animales-boton-nuevo"
            onClick={() => setModalAbierto(true)}
          >
            + Nuevo animal
          </button>

          <PanelOpciones
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
            {lotesDisponibles.map((nombreLote) => (
              <option key={nombreLote} value={nombreLote}>
                {nombreLote}
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
        <div className="animales-estado-mensaje">
          <p>{error}</p>
          <button type="button" onClick={recargar}>
            Reintentar
          </button>
        </div>
      )}

      {sinAnimales && (
        <div className="animales-estado-mensaje">
          <p>Todavía no hay animales registrados</p>
        </div>
      )}

      {sinCoincidencias && (
        <div className="animales-estado-mensaje">
          <p>No hay animales que coincidan</p>
          <button type="button" onClick={limpiarFiltros}>
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
            />
          </div>

          <div className="animales-tarjetas-solo-movil">
            {animalesDeLaPagina.map((animal) => (
              <TarjetaAnimal key={animal.aniId} animal={animal} columnasVisibles={columnasVisibles} />
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
    </div>
  )
}
