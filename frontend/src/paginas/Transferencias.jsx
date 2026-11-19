/**
 * Pantalla de Transferencias entre lotes, con el mismo formato que Pesajes,
 * Personas y Razas: el listado de transferencias (tabla desde 768px,
 * tarjetas en celular) con un buscador por lote, responsable o motivo, el
 * filtro de Intervalo de fechas y paginación en el cliente; el botón
 * "Nueva transferencia" abre ModalNuevaTransferencia, y tocar una fila o
 * tarjeta abre ModalDetalleTransferencia (con los animales y, si
 * corresponde, "Devolver").
 *
 * El intervalo se filtra en el servidor (se vuelve a pedir la lista cuando
 * cambia) y la búsqueda en el cliente, sobre lo ya cargado (ver
 * transferencias/listadoTransferencias.js). Tras registrar una
 * transferencia o devolver una, la lista se recarga conservando la
 * búsqueda y el intervalo, y se muestra un aviso breve.
 */

import { FilterX, Inbox, Plus, RefreshCw, Search, SearchX, TriangleAlert } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import BotonExportar from '../componentes/BotonExportar'
import EncabezadoPagina from '../componentes/EncabezadoPagina'
import Intervalo from '../componentes/Intervalo'
import Paginacion from '../componentes/Paginacion'
import { formatearFecha } from '../utilidades/formato'
import { filtrosInicialesTransferencias } from './transferencias/exportacionTransferencias'
import { filtrarTransferencias } from './transferencias/listadoTransferencias'
import ModalExportarTransferencias from './transferencias/ModalExportarTransferencias'
import ModalDetalleTransferencia from './transferencias/ModalDetalleTransferencia'
import ModalNuevaTransferencia from './transferencias/ModalNuevaTransferencia'
import { etiquetaMotivoTransferencia, textoCantidadAnimales, textoOrigenDestino } from './transferencias/motivos'
import { useTransferencias } from './transferencias/useTransferencias'
import './Transferencias.css'

const FILAS_POR_PAGINA = 10

function EtiquetaDevuelta() {
  return <span className="badge">Devuelta</span>
}

/** Texto accesible del botón que abre el detalle de una fila/tarjeta. */
function etiquetaVerDetalle(transferencia) {
  return `Ver la transferencia del ${formatearFecha(transferencia.fecha)} (${textoCantidadAnimales(transferencia.cantidadAnimales)})`
}

export default function Transferencias() {
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const { transferencias, cargando, error, recargar } = useTransferencias(desde, hasta)

  const [busqueda, setBusqueda] = useState('')
  const [pagina, setPagina] = useState(1)
  const [modalNuevoAbierto, setModalNuevoAbierto] = useState(false)
  const [abierta, setAbierta] = useState(null)
  const [aviso, setAviso] = useState('')
  const [modalExportarAbierto, setModalExportarAbierto] = useState(false)
  const refBotonNueva = useRef(null)
  const refBotonExportar = useRef(null)
  const refDisparadorDetalle = useRef(null)
  const refTemporizadorAviso = useRef(null)

  // Volver a la página 1 cuando cambia la búsqueda o el intervalo (mismo
  // patrón que Animales.jsx: se ajusta durante el render, no en un useEffect).
  const [filtrosPrevios, setFiltrosPrevios] = useState({ busqueda, desde, hasta })
  if (filtrosPrevios.busqueda !== busqueda || filtrosPrevios.desde !== desde || filtrosPrevios.hasta !== hasta) {
    setFiltrosPrevios({ busqueda, desde, hasta })
    setPagina(1)
  }

  const resultado = useMemo(() => filtrarTransferencias(transferencias, busqueda), [transferencias, busqueda])

  const totalPaginas = Math.max(1, Math.ceil(resultado.length / FILAS_POR_PAGINA))
  const paginaActual = Math.min(pagina, totalPaginas)
  const inicio = (paginaActual - 1) * FILAS_POR_PAGINA
  const filas = resultado.slice(inicio, inicio + FILAS_POR_PAGINA)

  /** Cambia el intervalo aplicado (ver componentes/Intervalo.jsx); ya viene validado (desde <= hasta o alguno vacío). */
  function cambiarIntervalo({ desde: nuevoDesde, hasta: nuevoHasta }) {
    setDesde(nuevoDesde)
    setHasta(nuevoHasta)
  }

  function limpiarFiltros() {
    setBusqueda('')
    setDesde('')
    setHasta('')
  }

  /** Muestra un aviso breve y lo retira solo a los pocos segundos (mismo patrón que Pesajes.jsx). */
  function mostrarAviso(mensaje) {
    setAviso(mensaje)
    window.clearTimeout(refTemporizadorAviso.current)
    refTemporizadorAviso.current = window.setTimeout(() => setAviso(''), 6000)
  }

  /** Transferencia registrada: cierra el modal, recarga la lista (conserva búsqueda e intervalo) y avisa. */
  function alTransferir(mensaje) {
    setModalNuevoAbierto(false)
    recargar()
    mostrarAviso(mensaje)
  }

  /** Abre el detalle de la transferencia tocada; guarda qué elemento lo disparó para devolverle el foco al cerrar. */
  function abrirDetalle(transferencia, evento) {
    refDisparadorDetalle.current = evento.currentTarget.querySelector('button') ?? evento.currentTarget
    setAbierta(transferencia.traId)
  }

  const sinTransferencias = !cargando && !error && transferencias.length === 0
  const sinCoincidencias = !cargando && !error && transferencias.length > 0 && resultado.length === 0
  const hayResultados = !cargando && !error && resultado.length > 0

  return (
    <div className="transferencias-pagina">
      <EncabezadoPagina titulo="Transferencias" subtitulo="Mové animales de un lote a otro y consultá el historial" />

      <div className="transferencias-controles">
        <div className="transferencias-busqueda-fila">
          <div className="campo-busqueda campo-busqueda--con-icono">
            <label htmlFor="transferencias-busqueda">Buscar por lote, responsable o motivo</label>
            <div className="campo-busqueda-entrada">
              <Search aria-hidden="true" size={18} className="campo-busqueda-icono" />
              <input
                id="transferencias-busqueda"
                type="search"
                value={busqueda}
                onChange={(evento) => setBusqueda(evento.target.value)}
                placeholder="Ej. Recría, Ana o sanitario"
              />
            </div>
          </div>

          <BotonExportar
            onClick={(evento) => {
              refBotonExportar.current = evento.currentTarget
              setModalExportarAbierto(true)
            }}
          />

          <button
            type="button"
            ref={refBotonNueva}
            className="transferencias-boton-nueva"
            onClick={() => setModalNuevoAbierto(true)}
          >
            <Plus aria-hidden="true" size={18} />
            Nueva transferencia
          </button>
        </div>

        <Intervalo desde={desde} hasta={hasta} onCambiar={cambiarIntervalo} />
      </div>

      {aviso && (
        <p className="transferencias-aviso" role="status" aria-live="polite">
          {aviso}
        </p>
      )}

      {!cargando && !error && (
        <p className="visualmente-oculto" aria-live="polite">
          {resultado.length === 1 ? '1 transferencia encontrada' : `${resultado.length} transferencias encontradas`}
        </p>
      )}

      {cargando && <p role="status">Cargando transferencias…</p>}

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

      {sinTransferencias && (
        <div className="estado-mensaje tarjeta">
          <Inbox aria-hidden="true" size={40} className="estado-mensaje-icono" />
          <p>{desde || hasta ? 'No hay transferencias en ese intervalo' : 'Todavía no hay transferencias registradas'}</p>
        </div>
      )}

      {sinCoincidencias && (
        <div className="estado-mensaje tarjeta">
          <SearchX aria-hidden="true" size={40} className="estado-mensaje-icono" />
          <p>No hay transferencias que coincidan</p>
          <button type="button" className="boton boton-secundario" onClick={limpiarFiltros}>
            <FilterX aria-hidden="true" size={16} />
            Limpiar filtros
          </button>
        </div>
      )}

      {hayResultados && (
        <>
          <div className="transferencias-tabla-solo-escritorio">
            <table className="transferencias-tabla">
              <caption className="visualmente-oculto">Transferencias entre lotes</caption>
              <thead>
                <tr>
                  <th scope="col">Fecha</th>
                  <th scope="col">Motivo</th>
                  <th scope="col">Animales</th>
                  <th scope="col">Origen → destino</th>
                  <th scope="col">Responsable</th>
                  <th scope="col">
                    <span className="visualmente-oculto">Detalle</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filas.map((transferencia) => (
                  <tr key={transferencia.traId} onClick={(evento) => abrirDetalle(transferencia, evento)}>
                    <td>{formatearFecha(transferencia.fecha)}</td>
                    <td>
                      {etiquetaMotivoTransferencia(transferencia.motivo)}
                      {transferencia.devuelta && <EtiquetaDevuelta />}
                    </td>
                    <td>{transferencia.cantidadAnimales}</td>
                    <td>{textoOrigenDestino(transferencia.origenes, transferencia.destinos)}</td>
                    <td>{transferencia.responsableNombre}</td>
                    <td>
                      <button type="button" className="boton-fantasma" aria-label={etiquetaVerDetalle(transferencia)}>
                        Ver detalle
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="transferencias-tarjetas-solo-movil">
            {filas.map((transferencia) => (
              <article
                key={transferencia.traId}
                className="transferencias-tarjeta tarjeta"
                onClick={(evento) => abrirDetalle(transferencia, evento)}
              >
                <div className="transferencias-tarjeta-encabezado">
                  <span className="transferencias-tarjeta-fecha">{formatearFecha(transferencia.fecha)}</span>
                  {transferencia.devuelta && <EtiquetaDevuelta />}
                </div>
                <p className="transferencias-tarjeta-ruta">
                  {textoOrigenDestino(transferencia.origenes, transferencia.destinos)}
                </p>
                <dl className="transferencias-tarjeta-datos">
                  <div>
                    <dt>Motivo</dt>
                    <dd>{etiquetaMotivoTransferencia(transferencia.motivo)}</dd>
                  </div>
                  <div>
                    <dt>Animales</dt>
                    <dd>{transferencia.cantidadAnimales}</dd>
                  </div>
                  <div>
                    <dt>Responsable</dt>
                    <dd>{transferencia.responsableNombre}</dd>
                  </div>
                </dl>
                <button type="button" className="boton-secundario" aria-label={etiquetaVerDetalle(transferencia)}>
                  Ver detalle
                </button>
              </article>
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

      {modalNuevoAbierto && (
        <ModalNuevaTransferencia
          onCerrar={() => setModalNuevoAbierto(false)}
          onTransferida={alTransferir}
          refDisparador={refBotonNueva}
        />
      )}

      {modalExportarAbierto && (
        <ModalExportarTransferencias
          filtrosIniciales={filtrosInicialesTransferencias({ busqueda, desde, hasta })}
          onCerrar={() => setModalExportarAbierto(false)}
          onGenerado={(nombre) => mostrarAviso(`Archivo ${nombre} generado`)}
          refDisparador={refBotonExportar}
        />
      )}

      {abierta != null && (
        <ModalDetalleTransferencia
          transferenciaId={abierta}
          onCerrar={() => setAbierta(null)}
          onDevuelta={recargar}
          refDisparador={refDisparadorDetalle}
        />
      )}
    </div>
  )
}
