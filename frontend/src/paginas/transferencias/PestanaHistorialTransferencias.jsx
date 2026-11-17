/**
 * Pestaña "Historial": las transferencias registradas (GET
 * /api/transferencias?desde=&hasta=, la más reciente primero), con el
 * filtro de Intervalo de fechas (se vuelve a pedir al backend cada vez que
 * cambia, igual que VistaAnulados). Tabla desde 768px y tarjetas en celular.
 * Abrir una fila muestra el detalle (ModalDetalleTransferencia), desde
 * donde se puede devolver; al devolverla, la lista se recarga de fondo para
 * que aparezca la etiqueta "Devuelta" y se avisa hacia arriba
 * ("onCambio") para que la pestaña "Nueva transferencia" también se
 * refresque (los animales cambiaron de lote).
 */

import { Inbox, RefreshCw, TriangleAlert } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { peticionProtegida } from '../../api/cliente'
import Intervalo from '../../componentes/Intervalo'
import Paginacion from '../../componentes/Paginacion'
import { formatearFecha } from '../../utilidades/formato'
import { etiquetaMotivoTransferencia, textoCantidadAnimales, textoOrigenDestino } from './motivos'
import ModalDetalleTransferencia from './ModalDetalleTransferencia'

const FILAS_POR_PAGINA = 15

function EtiquetaDevuelta() {
  return <span className="badge">Devuelta</span>
}

export default function PestanaHistorialTransferencias({ onCambio }) {
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [transferencias, setTransferencias] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [pagina, setPagina] = useState(1)
  const [abierta, setAbierta] = useState(null)
  const refDisparador = useRef(null)

  const cargar = useCallback(async () => {
    setCargando(true)
    setError('')
    try {
      const parametros = new URLSearchParams()
      if (desde) {
        parametros.set('desde', desde)
      }
      if (hasta) {
        parametros.set('hasta', hasta)
      }
      const cadena = parametros.toString()
      const datos = await peticionProtegida(`/api/transferencias${cadena ? `?${cadena}` : ''}`)
      setTransferencias(Array.isArray(datos) ? datos : [])
    } catch {
      setError('No se pudo cargar el historial de transferencias.')
    } finally {
      setCargando(false)
    }
  }, [desde, hasta])

  useEffect(() => {
    // Ver la justificación de este mismo patrón en useAnimalesResumen.js.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargar()
  }, [cargar])

  /** Cambia el intervalo (ya viene validado) y vuelve a la primera página. */
  function cambiarIntervalo({ desde: nuevoDesde, hasta: nuevoHasta }) {
    setDesde(nuevoDesde)
    setHasta(nuevoHasta)
    setPagina(1)
  }

  function abrirDetalle(transferencia, evento) {
    refDisparador.current = evento.currentTarget
    setAbierta(transferencia.traId)
  }

  /** Tras devolver una transferencia: recarga la lista de fondo (sin cerrar el modal) y avisa a la pantalla. */
  function alDevolver() {
    cargar()
    onCambio?.()
  }

  const totalPaginas = Math.max(1, Math.ceil(transferencias.length / FILAS_POR_PAGINA))
  const paginaActual = Math.min(pagina, totalPaginas)
  const inicio = (paginaActual - 1) * FILAS_POR_PAGINA
  const filas = transferencias.slice(inicio, inicio + FILAS_POR_PAGINA)

  const hayResultados = !cargando && !error && transferencias.length > 0
  const sinResultados = !cargando && !error && transferencias.length === 0

  return (
    <div className="historial-transferencias">
      <div className="historial-transferencias-controles">
        <Intervalo desde={desde} hasta={hasta} onCambiar={cambiarIntervalo} />
      </div>

      {cargando && <p role="status">Cargando historial…</p>}

      {!cargando && error && (
        <div className="estado-mensaje tarjeta">
          <TriangleAlert aria-hidden="true" size={40} className="estado-mensaje-icono" />
          <p>{error}</p>
          <button type="button" className="boton boton-secundario" onClick={cargar}>
            <RefreshCw aria-hidden="true" size={16} />
            Reintentar
          </button>
        </div>
      )}

      {sinResultados && (
        <div className="estado-mensaje tarjeta">
          <Inbox aria-hidden="true" size={40} className="estado-mensaje-icono" />
          <p>{desde || hasta ? 'No hay transferencias en ese intervalo' : 'Todavía no hay transferencias registradas'}</p>
        </div>
      )}

      {hayResultados && (
        <>
          <div className="historial-tabla-solo-escritorio">
            <table className="historial-tabla">
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
                  <tr key={transferencia.traId}>
                    <td>{formatearFecha(transferencia.fecha)}</td>
                    <td>
                      {etiquetaMotivoTransferencia(transferencia.motivo)}
                      {transferencia.devuelta && <EtiquetaDevuelta />}
                    </td>
                    <td>{transferencia.cantidadAnimales}</td>
                    <td>{textoOrigenDestino(transferencia.origenes, transferencia.destinos)}</td>
                    <td>{transferencia.responsableNombre}</td>
                    <td>
                      <button
                        type="button"
                        className="boton-fantasma"
                        onClick={(evento) => abrirDetalle(transferencia, evento)}
                        aria-label={`Ver la transferencia del ${formatearFecha(transferencia.fecha)} (${textoCantidadAnimales(transferencia.cantidadAnimales)})`}
                      >
                        Ver detalle
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="historial-tarjetas-solo-movil">
            {filas.map((transferencia) => (
              <article key={transferencia.traId} className="historial-tarjeta tarjeta">
                <div className="historial-tarjeta-encabezado">
                  <span className="historial-tarjeta-fecha">{formatearFecha(transferencia.fecha)}</span>
                  {transferencia.devuelta && <EtiquetaDevuelta />}
                </div>
                <p className="historial-tarjeta-ruta">
                  {textoOrigenDestino(transferencia.origenes, transferencia.destinos)}
                </p>
                <dl className="historial-tarjeta-datos">
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
                <button
                  type="button"
                  className="boton-secundario"
                  onClick={(evento) => abrirDetalle(transferencia, evento)}
                  aria-label={`Ver la transferencia del ${formatearFecha(transferencia.fecha)} (${textoCantidadAnimales(transferencia.cantidadAnimales)})`}
                >
                  Ver detalle
                </button>
              </article>
            ))}
          </div>

          <Paginacion
            paginaActual={paginaActual}
            totalPaginas={totalPaginas}
            totalResultados={transferencias.length}
            filasPorPagina={FILAS_POR_PAGINA}
            onCambiarPagina={setPagina}
          />
        </>
      )}

      {abierta != null && (
        <ModalDetalleTransferencia
          transferenciaId={abierta}
          onCerrar={() => setAbierta(null)}
          onDevuelta={alDevolver}
          refDisparador={refDisparador}
        />
      )}
    </div>
  )
}
