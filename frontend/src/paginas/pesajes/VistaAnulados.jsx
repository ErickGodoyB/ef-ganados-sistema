/**
 * Vista "Anulados" de Pesajes (RF011, ver Pesajes.jsx): pesajes anulados en
 * el rango de fechas elegido (GET /api/pesajes/anulados?desde=&hasta=),
 * de solo lectura (sin editar ni anular desde acá: ya están anulados). Trae
 * de nuevo la lista cada vez que cambia el intervalo; el buscador por
 * caravana filtra en el cliente sobre lo ya traído (ver listadoAnulados.js).
 */

import { Inbox, RefreshCw, Search, SearchX, TriangleAlert } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { peticionProtegida } from '../../api/cliente'
import { formatearFecha, formatearFechaHora, formatearPeso } from '../../utilidades/formato'
import { filtrarAnulados } from './listadoAnulados'
import './VistaAnulados.css'

export default function VistaAnulados({ desde, hasta }) {
  const [anulados, setAnulados] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [busqueda, setBusqueda] = useState('')

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
      const datos = await peticionProtegida(`/api/pesajes/anulados${cadena ? `?${cadena}` : ''}`)
      setAnulados(datos ?? [])
    } catch {
      setError('No se pudo cargar el listado de pesajes anulados.')
    } finally {
      setCargando(false)
    }
  }, [desde, hasta])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargar()
  }, [cargar])

  const resultado = filtrarAnulados(anulados, busqueda)

  const sinAnulados = !cargando && !error && anulados.length === 0
  const sinCoincidencias = !cargando && !error && anulados.length > 0 && resultado.length === 0
  const hayResultados = !cargando && !error && resultado.length > 0

  return (
    <div className="vista-anulados">
      <div className="campo-busqueda campo-busqueda--con-icono">
        <label htmlFor="anulados-busqueda">Buscar por caravana</label>
        <div className="campo-busqueda-entrada">
          <Search aria-hidden="true" size={18} className="campo-busqueda-icono" />
          <input
            id="anulados-busqueda"
            type="search"
            value={busqueda}
            onChange={(evento) => setBusqueda(evento.target.value)}
            placeholder="Ej. CAR-001"
          />
        </div>
      </div>

      {cargando && <p role="status">Cargando pesajes anulados…</p>}

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

      {sinAnulados && (
        <div className="estado-mensaje tarjeta">
          <Inbox aria-hidden="true" size={40} className="estado-mensaje-icono" />
          <p>No hay pesajes anulados</p>
        </div>
      )}

      {sinCoincidencias && (
        <div className="estado-mensaje tarjeta">
          <SearchX aria-hidden="true" size={40} className="estado-mensaje-icono" />
          <p>No hay pesajes anulados que coincidan con "{busqueda}"</p>
        </div>
      )}

      {hayResultados && (
        <>
          <div className="vista-anulados-tabla-solo-escritorio">
            <table className="tabla-anulados">
              <caption className="visualmente-oculto">Pesajes anulados</caption>
              <thead>
                <tr>
                  <th scope="col">Fecha del pesaje</th>
                  <th scope="col">Caravana</th>
                  <th scope="col">Lote</th>
                  <th scope="col">Peso</th>
                  <th scope="col">Motivo</th>
                  <th scope="col">Anulado el</th>
                  <th scope="col">Anulado por</th>
                </tr>
              </thead>
              <tbody>
                {resultado.map((item) => (
                  <tr key={item.pesaId}>
                    <td>{formatearFecha(item.fecha)}</td>
                    <td className="tabla-anulados-caravana">{item.caravana}</td>
                    <td>{item.subGrupoDescripcion || 'Sin lote'}</td>
                    <td>{formatearPeso(item.peso)}</td>
                    <td className="tabla-anulados-motivo">{item.motivo}</td>
                    <td>{formatearFechaHora(item.anuladoEn)}</td>
                    <td>{item.anuladoPorNombre || 'Sin datos'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="vista-anulados-tarjetas-solo-movil">
            {resultado.map((item) => (
              <article key={item.pesaId} className="tarjeta-anulado tarjeta">
                <div className="tarjeta-anulado-encabezado">
                  <span className="tarjeta-anulado-caravana">{item.caravana}</span>
                  <span>{formatearPeso(item.peso)}</span>
                </div>
                <dl className="tarjeta-anulado-datos">
                  <div>
                    <dt>Fecha del pesaje</dt>
                    <dd>{formatearFecha(item.fecha)}</dd>
                  </div>
                  <div>
                    <dt>Lote</dt>
                    <dd>{item.subGrupoDescripcion || 'Sin lote'}</dd>
                  </div>
                  <div>
                    <dt>Motivo</dt>
                    <dd>{item.motivo}</dd>
                  </div>
                  <div>
                    <dt>Anulado el</dt>
                    <dd>{formatearFechaHora(item.anuladoEn)}</dd>
                  </div>
                  <div>
                    <dt>Anulado por</dt>
                    <dd>{item.anuladoPorNombre || 'Sin datos'}</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
