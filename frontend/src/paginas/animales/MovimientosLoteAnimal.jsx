/**
 * Sección "Movimientos de lote" del detalle de un animal (ver
 * ModalDetalleAnimal.jsx): GET /api/animales/{id}/movimientos, del más
 * reciente al más antiguo (ya viene ordenado del backend). Cada movimiento
 * es una transferencia o una devolución: fecha, motivo, de qué lote a qué
 * lote ("Sin lote" si no tenía) y quién lo registró. Es una lista y no una
 * tabla porque cada movimiento tiene poco texto y así se lee igual en
 * celular que en escritorio, sin scroll horizontal.
 */

import { ArrowRight, TriangleAlert } from 'lucide-react'
import { useEffect, useState } from 'react'
import { peticionProtegida } from '../../api/cliente'
import { formatearFecha } from '../../utilidades/formato'
import { etiquetaMotivoTransferencia } from '../transferencias/motivos'
import './MovimientosLoteAnimal.css'

export default function MovimientosLoteAnimal({ animal }) {
  const [movimientos, setMovimientos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelado = false
    async function cargar() {
      setCargando(true)
      setError('')
      try {
        const datos = await peticionProtegida(`/api/animales/${animal.aniId}/movimientos`)
        if (!cancelado) {
          setMovimientos(Array.isArray(datos) ? datos : [])
        }
      } catch {
        if (!cancelado) {
          setError('No se pudieron cargar los movimientos de lote.')
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

  return (
    <section className="movimientos-lote" aria-labelledby="movimientos-lote-titulo">
      <h3 id="movimientos-lote-titulo" className="movimientos-lote-titulo">
        Movimientos de lote
      </h3>

      {cargando && <p role="status">Cargando movimientos…</p>}

      {!cargando && error && (
        <div className="estado-mensaje tarjeta">
          <TriangleAlert aria-hidden="true" size={28} className="estado-mensaje-icono" />
          <p>{error}</p>
        </div>
      )}

      {!cargando && !error && movimientos.length === 0 && (
        <p className="movimientos-lote-vacio">Este animal todavía no cambió de lote</p>
      )}

      {!cargando && !error && movimientos.length > 0 && (
        <ol className="movimientos-lote-lista">
          {movimientos.map((movimiento) => (
            <li key={movimiento.transferenciaId} className="movimientos-lote-item tarjeta">
              <div className="movimientos-lote-encabezado">
                <span className="movimientos-lote-fecha">{formatearFecha(movimiento.fecha)}</span>
                <span className="badge">{etiquetaMotivoTransferencia(movimiento.motivo)}</span>
              </div>
              <p className="movimientos-lote-ruta">
                <span>{movimiento.origen}</span>
                <ArrowRight aria-label="a" size={16} />
                <span>{movimiento.destino}</span>
              </p>
              <p className="movimientos-lote-responsable">Registró: {movimiento.responsableNombre}</p>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
