/**
 * Tarjeta de un animal para pantallas chicas (< 768px, ver TarjetaAnimal.css
 * y Animales.css). Alternativa a la fila de tabla: caravana destacada,
 * badge de estado (si esa columna está visible) y el resto de los campos
 * visibles en pares etiqueta/valor.
 */

import { valorCelda } from './celdasAnimal'
import { COLUMNAS_OPCIONALES } from './columnas'
import EstadoBadge from './EstadoBadge'
import './TarjetaAnimal.css'

// El estado se muestra como badge en el encabezado, no como par etiqueta/
// valor más abajo (para no repetirlo dos veces en la misma tarjeta).
const CAMPOS_TARJETA = COLUMNAS_OPCIONALES.filter((columna) => columna.clave !== 'estado')

export default function TarjetaAnimal({ animal, columnasVisibles }) {
  const campos = CAMPOS_TARJETA.filter((campo) => columnasVisibles[campo.clave])

  return (
    <article className="tarjeta-animal tarjeta">
      <div className="tarjeta-animal-encabezado">
        <span className="tarjeta-animal-caravana">{animal.aniCaravana}</span>
        {columnasVisibles.estado && <EstadoBadge apto={animal.aptoVenta} />}
      </div>

      {campos.length > 0 && (
        <dl className="tarjeta-animal-datos">
          {campos.map((campo) => (
            <div key={campo.clave} className="tarjeta-animal-dato">
              <dt>{campo.etiqueta}</dt>
              <dd>{valorCelda(animal, campo.clave)}</dd>
            </div>
          ))}
        </dl>
      )}
    </article>
  )
}
