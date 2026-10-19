/**
 * Tabla semántica del listado de animales (>= 768px, ver TablaAnimales.css
 * y la convención mobile-first de index.css). Las columnas opcionales se
 * muestran u ocultan según columnasVisibles; "Caravana" es obligatoria y
 * siempre va primero. El encabezado de cada columna es un botón: clic
 * alterna ascendente/descendente y actualiza aria-sort en el <th>, para
 * que el estado del orden no dependa solo de un ícono.
 */

import { valorCelda } from './celdasAnimal'
import { COLUMNAS } from './columnas'
import './TablaAnimales.css'

export default function TablaAnimales({ animales, columnasVisibles, orden, onOrdenar }) {
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
            <tr key={animal.aniId}>
              {columnas.map((columna) => (
                <td key={columna.clave}>{valorCelda(animal, columna.clave)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
