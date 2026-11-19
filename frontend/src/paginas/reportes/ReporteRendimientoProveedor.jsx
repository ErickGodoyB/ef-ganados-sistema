/**
 * Reporte "Rendimiento por proveedor": compara la GMD acumulada de los
 * animales según su proveedor (GET /api/reportes/proveedores). Muestra el
 * ranking (tabla desde 768px, tarjetas en celular), con una barra
 * proporcional al mayor GMD promedio (siempre acompañada del número escrito:
 * la barra sola no informa), la etiqueta "Mejor rendimiento" en el primero y
 * la fila "Sin proveedor" al final con una nota para completar el dato. Cada
 * fila abre, con "Ver animales", el detalle por animal (ModalAnimalesProveedor).
 * La casilla "Solo animales activos" (desmarcada por defecto, así se
 * comparan también los animales que ya salieron) se la pasa al servidor.
 */

import { Award, Inbox, RefreshCw, TriangleAlert } from 'lucide-react'
import { useRef, useState } from 'react'
import BarraGmd from '../../componentes/BarraGmd'
import { formatearGmd, formatearPeso } from '../../utilidades/formato'
import ModalAnimalesProveedor from './ModalAnimalesProveedor'
import {
  esFilaSinProveedor,
  mayorGmdPromedio,
  posicionEnRanking,
  proveedorConMejorRendimiento,
} from './rankingProveedores'
import { useRendimientoProveedores } from './useRendimientoProveedores'
import './ReporteRendimientoProveedor.css'

const NOTA_SIN_PROVEEDOR = 'Asigná el proveedor editando los animales para incluirlos en la comparación'

function EtiquetaMejor() {
  return (
    <span className="badge reporte-etiqueta-mejor">
      <Award aria-hidden="true" size={14} />
      Mejor rendimiento
    </span>
  )
}

function textoMejorAnimal(fila) {
  return fila.mejorAnimalCaravana ? `${fila.mejorAnimalCaravana} · ${formatearGmd(fila.mejorAnimalGmd)}` : '—'
}

function textoGanancia(fila) {
  return fila.gananciaPromedioKg == null ? '—' : formatearPeso(fila.gananciaPromedioKg)
}

export default function ReporteRendimientoProveedor() {
  const [soloActivos, setSoloActivos] = useState(false)
  const [verAnimalesDe, setVerAnimalesDe] = useState(null) // null | fila del ranking
  const refDisparador = useRef(null)
  const { filas, cargando, error, recargar } = useRendimientoProveedores(soloActivos)

  const maximo = mayorGmdPromedio(filas)
  const idMejor = proveedorConMejorRendimiento(filas)

  function abrirAnimales(fila, evento) {
    refDisparador.current = evento.currentTarget
    setVerAnimalesDe(fila)
  }

  function boton(fila) {
    return (
      <button
        type="button"
        className="boton-secundario"
        aria-label={`Ver animales de ${fila.proveedorNombre}`}
        onClick={(evento) => abrirAnimales(fila, evento)}
      >
        Ver animales
      </button>
    )
  }

  return (
    <section className="reporte-proveedor" aria-labelledby="reporte-proveedor-titulo">
      <h2 id="reporte-proveedor-titulo" className="reporte-titulo">
        Rendimiento por proveedor
      </h2>

      <p className="reporte-explicacion">
        GMD acumulado = (peso actual − peso inicial) ÷ días entre el ingreso y el último pesaje. El promedio incluye
        solo los animales con pesajes.
      </p>

      <label className="reporte-casilla" htmlFor="reporte-solo-activos">
        <input
          id="reporte-solo-activos"
          type="checkbox"
          checked={soloActivos}
          onChange={(evento) => setSoloActivos(evento.target.checked)}
        />
        Solo animales activos
      </label>

      {cargando && <p role="status">Cargando reporte…</p>}

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

      {!cargando && !error && filas.length === 0 && (
        <div className="estado-mensaje tarjeta">
          <Inbox aria-hidden="true" size={40} className="estado-mensaje-icono" />
          <p>
            {soloActivos
              ? 'No hay animales activos para comparar.'
              : 'Todavía no hay animales registrados para comparar.'}
          </p>
        </div>
      )}

      {!cargando && !error && filas.length > 0 && (
        <>
          <div className="reporte-tabla-solo-escritorio">
            <table className="reporte-tabla">
              <caption className="visualmente-oculto">Ranking de rendimiento por proveedor</caption>
              <thead>
                <tr>
                  <th scope="col">Posición</th>
                  <th scope="col">Proveedor</th>
                  <th scope="col">Animales</th>
                  <th scope="col">Con datos</th>
                  <th scope="col">GMD promedio</th>
                  <th scope="col">Ganancia promedio</th>
                  <th scope="col">Mejor animal</th>
                  <th scope="col">
                    <span className="visualmente-oculto">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filas.map((fila, indice) => (
                  <tr key={fila.proveedorId ?? 'sin-proveedor'}>
                    <td>{posicionEnRanking(filas, indice) ?? '—'}</td>
                    <th scope="row" className="reporte-proveedor-nombre">
                      {fila.proveedorNombre}
                      {fila.proveedorId === idMejor && idMejor != null && <EtiquetaMejor />}
                      {esFilaSinProveedor(fila) && <p className="reporte-nota">{NOTA_SIN_PROVEEDOR}</p>}
                    </th>
                    <td>{fila.cantidadAnimales}</td>
                    <td>{fila.animalesConDatos}</td>
                    <td>
                      <BarraGmd gmd={fila.gmdPromedio} maximo={maximo} />
                    </td>
                    <td>{textoGanancia(fila)}</td>
                    <td>{textoMejorAnimal(fila)}</td>
                    <td>{boton(fila)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="reporte-tarjetas-solo-movil">
            {filas.map((fila, indice) => (
              <article key={fila.proveedorId ?? 'sin-proveedor'} className="reporte-tarjeta tarjeta">
                <div className="reporte-tarjeta-encabezado">
                  <p className="reporte-tarjeta-nombre">
                    {posicionEnRanking(filas, indice) != null && (
                      <span className="reporte-tarjeta-posicion">{posicionEnRanking(filas, indice)}.</span>
                    )}{' '}
                    {fila.proveedorNombre}
                  </p>
                  {fila.proveedorId === idMejor && idMejor != null && <EtiquetaMejor />}
                </div>

                <BarraGmd gmd={fila.gmdPromedio} maximo={maximo} />

                <dl className="reporte-tarjeta-datos">
                  <div>
                    <dt>Animales</dt>
                    <dd>{fila.cantidadAnimales}</dd>
                  </div>
                  <div>
                    <dt>Con datos</dt>
                    <dd>{fila.animalesConDatos}</dd>
                  </div>
                  <div>
                    <dt>Ganancia promedio</dt>
                    <dd>{textoGanancia(fila)}</dd>
                  </div>
                  <div>
                    <dt>Mejor animal</dt>
                    <dd>{textoMejorAnimal(fila)}</dd>
                  </div>
                </dl>

                {esFilaSinProveedor(fila) && <p className="reporte-nota">{NOTA_SIN_PROVEEDOR}</p>}
                {boton(fila)}
              </article>
            ))}
          </div>
        </>
      )}

      {verAnimalesDe && (
        <ModalAnimalesProveedor
          proveedorId={verAnimalesDe.proveedorId}
          proveedorNombre={verAnimalesDe.proveedorNombre}
          soloActivos={soloActivos}
          onCerrar={() => setVerAnimalesDe(null)}
          refDisparador={refDisparador}
        />
      )}
    </section>
  )
}
