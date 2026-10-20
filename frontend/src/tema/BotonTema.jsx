/**
 * Botón que alterna entre tema claro y oscuro. Muestra un ícono de sol o
 * luna según el tema actual, con un aria-label descriptivo para quienes
 * usan lectores de pantalla. variante="sidebar" lo pinta para verse bien
 * sobre el fondo verde oscuro fijo de la barra lateral (ver BotonTema.css):
 * esa barra no cambia con el tema claro/oscuro de la página, así que no
 * puede usar las mismas variables genéricas que el resto de los botones.
 */

import { Moon, Sun } from 'lucide-react'
import { useTema } from './useTema'
import './BotonTema.css'

export default function BotonTema({ variante }) {
  const { tema, alternarTema } = useTema()
  const esOscuro = tema === 'oscuro'

  return (
    <button
      type="button"
      className={`boton-tema${variante === 'sidebar' ? ' boton-tema--sidebar' : ''}`}
      onClick={alternarTema}
      aria-label={esOscuro ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
      title={esOscuro ? 'Tema claro' : 'Tema oscuro'}
    >
      {esOscuro ? <Sun aria-hidden="true" size={18} /> : <Moon aria-hidden="true" size={18} />}
    </button>
  )
}
