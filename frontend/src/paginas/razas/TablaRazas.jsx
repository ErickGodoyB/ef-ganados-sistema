/**
 * Tabla del catálogo de razas (>= 768px, ver Razas.css). A diferencia de
 * TablaAnimales, ninguna fila es clickeable entera: las acciones (Editar/
 * Eliminar) son los únicos controles de cada fila, así que no hace falta
 * un botón "fantasma" que imite el resto de la fila.
 */

import { Pencil, Trash2 } from 'lucide-react'
import { formatearPeso } from '../../utilidades/formato'
import './TablaRazas.css'

export default function TablaRazas({ razas, onEditar, onEliminar }) {
  return (
    <div className="tabla-razas-contenedor">
      <table className="tabla-razas">
        <caption className="visualmente-oculto">Catálogo de razas</caption>
        <thead>
          <tr>
            <th scope="col">Raza</th>
            <th scope="col">Peso objetivo de venta</th>
            <th scope="col">Cantidad de animales</th>
            <th scope="col">
              <span className="visualmente-oculto">Acciones</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {razas.map((raza) => {
            const tieneAnimales = raza.cantidadAnimales > 0
            const idAviso = `razas-aviso-${raza.rzId}`
            return (
              <tr key={raza.rzId}>
                <td className="tabla-razas-descripcion">{raza.rzDescripcion}</td>
                <td>{formatearPeso(raza.rzPesoObjetivoVenta)}</td>
                <td>{raza.cantidadAnimales}</td>
                <td>
                  <div className="tabla-razas-acciones">
                    <button type="button" className="boton-secundario" onClick={(evento) => onEditar(raza, evento)}>
                      <Pencil aria-hidden="true" size={16} />
                      Editar
                    </button>
                    <div className="tabla-razas-accion-eliminar">
                      <button
                        type="button"
                        className="boton-peligro"
                        onClick={(evento) => onEliminar(raza, evento)}
                        disabled={tieneAnimales}
                        aria-describedby={tieneAnimales ? idAviso : undefined}
                      >
                        <Trash2 aria-hidden="true" size={16} />
                        Eliminar
                      </button>
                      {tieneAnimales && (
                        <p id={idAviso} className="tabla-razas-aviso">
                          Tiene {raza.cantidadAnimales} animales
                        </p>
                      )}
                    </div>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
