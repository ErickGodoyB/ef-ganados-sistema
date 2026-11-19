/**
 * Tarjeta "Mejor proveedor" de Inicio: el proveedor con el mayor GMD
 * promedio del reporte de rendimiento (GET /api/reportes/proveedores, ver
 * mejorProveedor en rankingInicio.js), con su cantidad de animales y su
 * mejor animal, y un enlace "Ver ranking" al reporte completo. Se pide por
 * su cuenta: si falla, muestra su error con "Reintentar" sin afectar al
 * resto de Inicio.
 */

import { Award, RefreshCw, TriangleAlert } from 'lucide-react'
import { Link } from 'react-router-dom'
import { formatearGmd } from '../../utilidades/formato'
import { mejorProveedor } from './rankingInicio'
import TarjetaGrafico from './TarjetaGrafico'
import { useProveedoresInicio } from './useDatosInicio'
import './MejorProveedor.css'

export default function MejorProveedor() {
  const { filas, cargando, error, recargar } = useProveedoresInicio()
  const mejor = mejorProveedor(filas)

  let contenido
  if (cargando) {
    contenido = <p role="status">Cargando proveedores…</p>
  } else if (error) {
    contenido = (
      <div className="estado-mensaje">
        <TriangleAlert aria-hidden="true" size={32} className="estado-mensaje-icono" />
        <p>{error}</p>
        <button type="button" className="boton boton-secundario" onClick={recargar}>
          <RefreshCw aria-hidden="true" size={16} />
          Reintentar
        </button>
      </div>
    )
  } else if (!mejor) {
    contenido = (
      <>
        <p className="tarjeta-grafico-vacio">Todavía no hay proveedores con pesajes</p>
        <Link to="/reportes" className="boton boton-secundario mejor-proveedor-enlace">
          Ver ranking
        </Link>
      </>
    )
  } else {
    contenido = (
      <>
        <p className="mejor-proveedor-nombre">
          <Award aria-hidden="true" size={20} />
          {mejor.proveedorNombre}
        </p>
        <dl className="mejor-proveedor-datos">
          <div>
            <dt>GMD promedio</dt>
            <dd>{formatearGmd(mejor.gmdPromedio)}</dd>
          </div>
          <div>
            <dt>Animales</dt>
            <dd>{mejor.cantidadAnimales}</dd>
          </div>
          <div className="mejor-proveedor-dato--ancho">
            <dt>Mejor animal</dt>
            <dd>
              {mejor.mejorAnimalCaravana
                ? `${mejor.mejorAnimalCaravana} · ${formatearGmd(mejor.mejorAnimalGmd)}`
                : '—'}
            </dd>
          </div>
        </dl>
        <Link to="/reportes" className="boton boton-secundario mejor-proveedor-enlace">
          Ver ranking
        </Link>
      </>
    )
  }

  return <TarjetaGrafico titulo="Mejor proveedor">{contenido}</TarjetaGrafico>
}
