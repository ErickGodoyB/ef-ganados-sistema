/**
 * Botón que alterna entre tema claro y oscuro. Muestra un ícono de sol o
 * luna según el tema actual, con un aria-label descriptivo para quienes
 * usan lectores de pantalla.
 */

import { useTema } from './useTema'
import './BotonTema.css'

export default function BotonTema() {
  const { tema, alternarTema } = useTema()
  const esOscuro = tema === 'oscuro'

  return (
    <button
      type="button"
      className="boton-tema"
      onClick={alternarTema}
      aria-label={esOscuro ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
      title={esOscuro ? 'Tema claro' : 'Tema oscuro'}
    >
      <span aria-hidden="true">{esOscuro ? '☀️' : '🌙'}</span>
    </button>
  )
}
