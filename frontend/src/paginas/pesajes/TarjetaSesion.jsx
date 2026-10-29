/**
 * Tarjeta de una sesión de pesaje para pantallas chicas (< 768px, ver
 * TarjetaSesion.css y Pesajes.css). Alternativa a la fila de tabla: fecha
 * destacada (obligatoria, como encabezado), lote (también obligatorio,
 * justo debajo) y el resto de los campos visibles en pares etiqueta/valor.
 * Al igual que la fila de tabla, toda la tarjeta abre el detalle de la
 * sesión (ver ModalDetalleSesion.jsx); el <button> de la fecha es la forma
 * accesible de hacerlo, y el resto de la tarjeta no tiene su propio
 * manejador (el clic burbujea hasta el único onClick de <article>).
 */

import { valorCelda } from './celdasSesion'
import { COLUMNAS_OPCIONALES } from './columnas'
import './TarjetaSesion.css'

export default function TarjetaSesion({ sesion, columnasVisibles, onAbrirDetalle }) {
  const campos = COLUMNAS_OPCIONALES.filter((campo) => columnasVisibles[campo.clave])
  const fecha = valorCelda(sesion, 'fecha')

  return (
    <article className="tarjeta-sesion tarjeta" onClick={(evento) => onAbrirDetalle(sesion, evento)}>
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
