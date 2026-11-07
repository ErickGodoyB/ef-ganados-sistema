/**
 * Sección "Historial de pesajes" del detalle de un animal (ver
 * ModalDetalleAnimal.jsx): GET /api/animales/{id}/pesajes, solo ACTIVOS
 * (el valor por defecto del endpoint). La primera fila es siempre
 * "Ingreso" (fecha de ingreso y peso inicial, que ya vienen en el
 * resumen, sin pedir nada aparte); después, un pesaje por fila, del más
 * reciente al más antiguo (el endpoint los trae al revés, en orden
 * cronológico, así que se invierten acá para mostrar).
 *
 * El código de sesión de cada pesaje se calcula con SU fecha y el lote
 * ACTUAL del animal (no hay forma de saber qué lote tenía en el momento
 * de ese pesaje); "Ver sesión" navega a /pesajes con ese código como
 * parámetro, que Pesajes.jsx lee para precargar la búsqueda.
 *
 * El gráfico de evolución de peso queda fuera de alcance acá (ver
 * Reportes, a futuro): esta sección es solo la lista.
 */

import { TriangleAlert } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { peticionProtegida } from '../../api/cliente'
import ValorDiferenciaPeso from '../../componentes/ValorDiferenciaPeso'
import ValorGmd from '../../componentes/ValorGmd'
import { calcularCodigoSesion } from '../../utilidades/codigoSesion'
import { formatearFecha, formatearPeso } from '../../utilidades/formato'
import { calcularDiferenciaPeso } from '../../utilidades/peso'
import './HistorialPesajesAnimal.css'

export default function HistorialPesajesAnimal({ animal }) {
  const [pesajes, setPesajes] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    let cancelado = false
    async function cargar() {
      setCargando(true)
      setError('')
      try {
        const datos = await peticionProtegida(`/api/animales/${animal.aniId}/pesajes`)
        if (!cancelado) {
          setPesajes(datos ?? [])
        }
      } catch {
        if (!cancelado) {
          setError('No se pudo cargar el historial de pesajes.')
        }
      } finally {
        if (!cancelado) {
          setCargando(false)
        }
      }
    }
    cargar()
    return () => {
      cancelado = true
    }
  }, [animal.aniId])

  /** Código de sesión del pesaje: su fecha + el lote ACTUAL del animal (ver el porqué en el comentario de arriba). */
  function codigoDe(item) {
    return calcularCodigoSesion(item.fecha, animal.subGrupoId)
  }

  function verSesion(item) {
    navigate(`/pesajes?codigo=${encodeURIComponent(codigoDe(item))}`)
  }

  const masRecientePrimero = [...pesajes].reverse()

  return (
    <section className="historial-pesajes">
      <h3 className="historial-pesajes-titulo">Historial de pesajes</h3>

      {cargando && <p role="status">Cargando historial…</p>}

      {!cargando && error && (
        <div className="estado-mensaje tarjeta">
          <TriangleAlert aria-hidden="true" size={28} className="estado-mensaje-icono" />
          <p>{error}</p>
        </div>
      )}

      {!cargando && !error && pesajes.length === 0 && (
        <p className="historial-pesajes-vacio">Este animal todavía no tiene pesajes</p>
      )}

      {!cargando && !error && (
        <>
          <div className="historial-pesajes-tabla-solo-escritorio">
            <table className="tabla-historial-pesajes">
              <caption className="visualmente-oculto">Historial de pesajes de {animal.aniCaravana}</caption>
              <thead>
                <tr>
                  <th scope="col">Fecha</th>
                  <th scope="col">Sesión</th>
                  <th scope="col">Peso</th>
                  <th scope="col">Diferencia</th>
                  <th scope="col">GMD</th>
                  <th scope="col">Responsable</th>
                  <th scope="col">
                    <span className="visualmente-oculto">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>{formatearFecha(animal.aniFechaIngreso)}</td>
                  <td>
                    <span className="historial-pesajes-etiqueta-ingreso">Ingreso</span>
                  </td>
                  <td>{formatearPeso(animal.aniPesoInicial)}</td>
                  <td>—</td>
                  <td>—</td>
                  <td>—</td>
                  <td></td>
                </tr>
                {masRecientePrimero.map((item) => (
                  <tr key={item.pesaId}>
                    <td>{formatearFecha(item.fecha)}</td>
                    <td>
                      <span className="historial-pesajes-codigo">{codigoDe(item)}</span>
                    </td>
                    <td>{formatearPeso(item.peso)}</td>
                    <td>
                      <ValorDiferenciaPeso diferencia={calcularDiferenciaPeso(item.peso, item.pesoAnterior)} />
                    </td>
                    <td>
                      <ValorGmd gmd={item.gmd} />
                    </td>
                    <td>{item.responsableNombre || 'Sin datos'}</td>
                    <td>
                      <button type="button" className="boton-fantasma" onClick={() => verSesion(item)}>
                        Ver sesión
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="historial-pesajes-tarjetas-solo-movil">
            <article className="historial-pesajes-tarjeta tarjeta">
              <div className="historial-pesajes-tarjeta-encabezado">
                <span className="historial-pesajes-etiqueta-ingreso">Ingreso</span>
                <span className="historial-pesajes-tarjeta-peso">{formatearPeso(animal.aniPesoInicial)}</span>
              </div>
              <p className="historial-pesajes-tarjeta-fecha">{formatearFecha(animal.aniFechaIngreso)}</p>
            </article>

            {masRecientePrimero.map((item) => (
              <article key={item.pesaId} className="historial-pesajes-tarjeta tarjeta">
                <div className="historial-pesajes-tarjeta-encabezado">
                  <span className="historial-pesajes-codigo">{codigoDe(item)}</span>
                  <span className="historial-pesajes-tarjeta-peso">{formatearPeso(item.peso)}</span>
                </div>
                <p className="historial-pesajes-tarjeta-fecha">{formatearFecha(item.fecha)}</p>
                <dl className="historial-pesajes-tarjeta-datos">
                  <div>
                    <dt>Diferencia</dt>
                    <dd>
                      <ValorDiferenciaPeso diferencia={calcularDiferenciaPeso(item.peso, item.pesoAnterior)} />
                    </dd>
                  </div>
                  <div>
                    <dt>GMD</dt>
                    <dd>
                      <ValorGmd gmd={item.gmd} />
                    </dd>
                  </div>
                  <div>
                    <dt>Responsable</dt>
                    <dd>{item.responsableNombre || 'Sin datos'}</dd>
                  </div>
                </dl>
                <button type="button" className="boton-secundario" onClick={() => verSesion(item)}>
                  Ver sesión
                </button>
              </article>
            ))}
          </div>
        </>
      )}
    </section>
  )
}
