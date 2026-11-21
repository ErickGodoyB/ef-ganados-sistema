/**
 * Bloque "Por proveedor" del detalle de una sesión: una fila por proveedor
 * con sus animales, peso promedio, diferencia promedio con el pesaje anterior
 * y GMD promedio (tabla desde 768px, tarjetas en celular). El de mayor GMD
 * promedio lleva la etiqueta "Mejor GMD en esta sesión" (ícono y texto, nunca
 * solo color). Solo se muestra si los animales de la sesión son de 2 o más
 * proveedores (contando "Sin proveedor"); con uno solo no hay nada que
 * comparar y devuelve null. Los cálculos están en porProveedorSesion.js.
 */

import { Award } from 'lucide-react'
import ValorDiferenciaPeso from '../../componentes/ValorDiferenciaPeso'
import ValorGmd from '../../componentes/ValorGmd'
import { formatearPeso } from '../../utilidades/formato'
import './BloquePorProveedor.css'
import { mostrarPorProveedor, resumenPorProveedor } from './porProveedorSesion'

function EtiquetaMejor() {
  return (
    <span className="badge por-proveedor-etiqueta-mejor">
      <Award aria-hidden="true" size={14} />
      Mejor GMD en esta sesión
    </span>
  )
}

export default function BloquePorProveedor({ items }) {
  const filas = resumenPorProveedor(items)
  if (!mostrarPorProveedor(filas)) {
    return null
  }

  return (
    <section className="por-proveedor" aria-labelledby="por-proveedor-titulo">
      <h3 id="por-proveedor-titulo" className="por-proveedor-titulo">
        Por proveedor
      </h3>

      <div className="por-proveedor-tabla-solo-escritorio">
        <table className="por-proveedor-tabla">
          <caption className="visualmente-oculto">Resumen de la sesión por proveedor</caption>
          <thead>
            <tr>
              <th scope="col">Proveedor</th>
              <th scope="col">Animales</th>
              <th scope="col">Peso promedio</th>
              <th scope="col">Diferencia promedio</th>
              <th scope="col">GMD promedio</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((fila) => (
              <tr key={fila.proveedorId ?? 'sin-proveedor'}>
                <th scope="row" className="por-proveedor-nombre">
                  {fila.nombre}
                  {fila.mejor && <EtiquetaMejor />}
                </th>
                <td>{fila.animales}</td>
                <td>{formatearPeso(fila.pesoPromedio)}</td>
                <td>
                  <ValorDiferenciaPeso diferencia={fila.diferenciaPromedio} />
                </td>
                <td>
                  <ValorGmd gmd={fila.gmdPromedio} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="por-proveedor-tarjetas-solo-movil">
        {filas.map((fila) => (
          <article key={fila.proveedorId ?? 'sin-proveedor'} className="por-proveedor-tarjeta tarjeta">
            <div className="por-proveedor-tarjeta-encabezado">
              <span className="por-proveedor-nombre">{fila.nombre}</span>
              {fila.mejor && <EtiquetaMejor />}
            </div>
            <dl className="por-proveedor-tarjeta-datos">
              <div>
                <dt>Animales</dt>
                <dd>{fila.animales}</dd>
              </div>
              <div>
                <dt>Peso promedio</dt>
                <dd>{formatearPeso(fila.pesoPromedio)}</dd>
              </div>
              <div>
                <dt>Diferencia promedio</dt>
                <dd>
                  <ValorDiferenciaPeso diferencia={fila.diferenciaPromedio} />
                </dd>
              </div>
              <div>
                <dt>GMD promedio</dt>
                <dd>
                  <ValorGmd gmd={fila.gmdPromedio} />
                </dd>
              </div>
            </dl>
          </article>
        ))}
      </div>
    </section>
  )
}
