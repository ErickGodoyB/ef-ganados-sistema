/**
 * Página de Reportes: un selector de reporte (tarjetas) y, debajo, el
 * reporte elegido. Pensada para sumar más reportes después: alcanza con
 * agregar un elemento a REPORTES (id, título, descripción y el componente
 * que lo dibuja); el selector y el cambio entre reportes ya funcionan solos.
 * Hoy hay uno solo, "Rendimiento por proveedor", que queda elegido de entrada.
 */

import { useState } from 'react'
import EncabezadoPagina from '../componentes/EncabezadoPagina'
import ReporteRendimientoProveedor from './reportes/ReporteRendimientoProveedor'
import './Reportes.css'

const REPORTES = [
  {
    id: 'proveedores',
    titulo: 'Rendimiento por proveedor',
    descripcion: 'Compara la ganancia diaria de los animales según quién los proveyó.',
    Componente: ReporteRendimientoProveedor,
  },
]

export default function Reportes() {
  const [reporteId, setReporteId] = useState(REPORTES[0].id)
  const reporte = REPORTES.find((candidato) => candidato.id === reporteId) ?? REPORTES[0]

  return (
    <div className="reportes-pagina">
      <EncabezadoPagina titulo="Reportes" />

      <nav aria-label="Reportes disponibles">
        <ul className="reportes-selector">
          {REPORTES.map((candidato) => {
            const elegido = candidato.id === reporte.id
            return (
              <li key={candidato.id}>
                <button
                  type="button"
                  className={`reportes-opcion tarjeta${elegido ? ' reportes-opcion--elegida' : ''}`}
                  aria-pressed={elegido}
                  onClick={() => setReporteId(candidato.id)}
                >
                  <span className="reportes-opcion-titulo">{candidato.titulo}</span>
                  <span className="reportes-opcion-descripcion">{candidato.descripcion}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </nav>

      <reporte.Componente />
    </div>
  )
}
