/**
 * Tabla semántica del listado de sesiones de pesaje (>= 768px, ver
 * TablaSesiones.css y la convención mobile-first de index.css). Las
 * columnas opcionales se muestran u ocultan según columnasVisibles;
 * "Fecha" y "Lote" son obligatorias y van primero. El encabezado de cada
 * columna es un botón: clic alterna ascendente/descendente y actualiza
 * aria-sort en el <th>, para que el estado del orden no dependa solo de un
 * ícono (mismo criterio que TablaAnimales.jsx).
 *
 * Cada fila abre el detalle de la sesión (ver ModalDetalleSesion.jsx) al
 * hacer clic en cualquier parte de ella. El <button> de la fecha es la
 * forma accesible de hacerlo (focuseable, con su propio aria-label); el
 * resto de la fila no tiene su propio manejador, sino que el clic burbujea
 * hasta el único onClick de la fila.
 */

import { valorCelda } from './celdasSesion'
import { COLUMNAS } from './columnas'
import './TablaSesiones.css'

/** Clave única de una sesión: no trae un id propio del backend (es un agregado), así que se arma con fecha + lote. */
function claveDeSesion(sesion) {
  return `${sesion.fecha}-${sesion.subGrupoId ?? 'sin-lote'}`
}

export default function TablaSesiones({ sesiones, columnasVisibles, orden, onOrdenar, onAbrirDetalle }) {
  const columnas = COLUMNAS.filter((columna) => columna.obligatoria || columnasVisibles[columna.clave])

  function ariaSortDe(campoOrden) {
    if (orden.campo !== campoOrden) {
      return 'none'
    }
    return orden.direccion === 'asc' ? 'ascending' : 'descending'
  }

  return (
    <div className="tabla-sesiones-contenedor">
      <table className="tabla-sesiones">
        <caption className="visualmente-oculto">Listado de sesiones de pesaje</caption>
        <thead>
          <tr>
            {columnas.map((columna) => (
              <th key={columna.clave} scope="col" aria-sort={ariaSortDe(columna.campoOrden)}>
                <button type="button" className="tabla-sesiones-orden" onClick={() => onOrdenar(columna.campoOrden)}>
                  {columna.etiqueta}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sesiones.map((sesion) => (
            <tr key={claveDeSesion(sesion)} onClick={(evento) => onAbrirDetalle(sesion, evento)}>
              {columnas.map((columna) =>
                columna.clave === 'fecha' ? (
                  <td key={columna.clave}>
                    <button
                      type="button"
                      className="tabla-sesiones-boton-fecha"
                      aria-label={`Ver detalle de la sesión del ${valorCelda(sesion, 'fecha')}`}
                    >
                      {valorCelda(sesion, 'fecha')}
                    </button>
                  </td>
                ) : (
                  <td key={columna.clave}>{valorCelda(sesion, columna.clave)}</td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
