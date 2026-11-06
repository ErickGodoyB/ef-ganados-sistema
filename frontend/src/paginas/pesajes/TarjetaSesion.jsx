/**
 * Tarjeta de una sesión de pesaje para pantallas chicas (< 768px, ver
 * TarjetaSesion.css y Pesajes.css). Alternativa a la fila de tabla: el
 * código de sesión primero (si está visible, como chip; ver columnas.js),
 * la fecha destacada (obligatoria, como encabezado), el lote (también
 * obligatorio, justo debajo) y el resto de los campos visibles en pares
 * etiqueta/valor. Al igual que la fila de tabla, toda la tarjeta abre el
 * detalle de la sesión (ver ModalDetalleSesion.jsx); el <button> de la
 * fecha es la forma accesible de hacerlo, y el resto de la tarjeta no
 * tiene su propio manejador (el clic burbujea hasta el único onClick de
 * <article>).
 */

import { valorCelda } from './celdasSesion'
import { COLUMNAS_OPCIONALES } from './columnas'
import './TarjetaSesion.css'

export default function TarjetaSesion({ sesion, columnasVisibles, onAbrirDetalle }) {
  // "codigo" se muestra por separado, como primer dato de la tarjeta (ver
  // de abajo), así que se saca del resto de los campos opcionales para no
  // mostrarlo dos veces.
  const campos = COLUMNAS_OPCIONALES.filter((campo) => campo.clave !== 'codigo' && columnasVisibles[campo.clave])
  const fecha = valorCelda(sesion, 'fecha')

  return (
    <article className="tarjeta-sesion tarjeta" onClick={(evento) => onAbrirDetalle(sesion, evento)}>
      {columnasVisibles.codigo && <div className="tarjeta-sesion-codigo">{valorCelda(sesion, 'codigo')}</div>}

      <button type="button" className="tarjeta-sesion-fecha" aria-label={`Ver detalle de la sesión del ${fecha}`}>
        {fecha}
      </button>

      <div className="tarjeta-sesion-lote">{valorCelda(sesion, 'lote')}</div>

      {campos.length > 0 && (
        <dl className="tarjeta-sesion-datos">
          {campos.map((campo) => (
            <div key={campo.clave} className="tarjeta-sesion-dato">
              <dt>{campo.etiqueta}</dt>
              <dd>{valorCelda(sesion, campo.clave)}</dd>
            </div>
          ))}
        </dl>
      )}
    </article>
  )
}
