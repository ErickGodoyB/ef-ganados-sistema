/**
 * Tabla semántica del listado de animales (>= 768px, ver TablaAnimales.css
 * y la convención mobile-first de index.css). Las columnas opcionales se
 * muestran u ocultan según columnasVisibles; "Caravana" es obligatoria y
 * siempre va primero. El encabezado de cada columna es un botón: clic
 * alterna ascendente/descendente y actualiza aria-sort en el <th>, para
 * que el estado del orden no dependa solo de un ícono.
 *
 * Cada fila abre el detalle del animal (ver ModalDetalleAnimal.jsx) al
 * hacer clic en cualquier parte de ella. El <button> de la caravana es la
 * forma accesible de hacerlo (focuseable, con su propio aria-label); el
 * resto de la fila no tiene su propio manejador, sino que el clic burbujea
 * hasta el único onClick de la fila, así que ambos disparan exactamente lo
 * mismo sin duplicar lógica.
 */

import { valorCelda } from './celdasAnimal'
import { COLUMNAS } from './columnas'
import './TablaAnimales.css'

export default function TablaAnimales({ animales, columnasVisibles, orden, onOrdenar, onAbrirDetalle }) {
  const columnas = COLUMNAS.filter((columna) => columna.obligatoria || columnasVisibles[columna.clave])

  function ariaSortDe(campoOrden) {
    if (orden.campo !== campoOrden) {
      return 'none'
    }
    return orden.direccion === 'asc' ? 'ascending' : 'descending'
  }

  return (
    <div className="tabla-animales-contenedor">
      <table className="tabla-animales">
        <caption className="visualmente-oculto">Listado de animales</caption>
        <thead>
          <tr>
            {columnas.map((columna) => (
              <th key={columna.clave} scope="col" aria-sort={ariaSortDe(columna.campoOrden)}>
                <button
                  type="button"
                  className="tabla-animales-orden"
                  onClick={() => onOrdenar(columna.campoOrden)}
                >
                  {columna.etiqueta}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {animales.map((animal) => (
            <tr key={animal.aniId} onClick={(evento) => onAbrirDetalle(animal, evento)}>
              {columnas.map((columna) =>
                columna.clave === 'aniCaravana' ? (
                  <td key={columna.clave}>
                    <button
                      type="button"
                      className="tabla-animales-boton-caravana"
                      aria-label={`Ver detalle de ${animal.aniCaravana}`}
                    >
                      {animal.aniCaravana}
                    </button>
                  </td>
                ) : (
                  <td key={columna.clave}>{valorCelda(animal, columna.clave)}</td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
