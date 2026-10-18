/**
 * Pantalla de inicio, provisional: muestra un saludo con el nombre de la
 * persona logueada, el botón de tema y la opción de cerrar sesión. Se va a
 * reemplazar por el panel real más adelante.
 */

import { useAuth } from '../auth/useAuth'
import BotonTema from '../tema/BotonTema'
import './Inicio.css'

export default function Inicio() {
  const { usuario, cerrarSesion } = useAuth()

  return (
    <div className="inicio-pantalla">
      <div className="inicio-barra">
        <BotonTema />
      </div>

      <div className="inicio-contenido">
        <h1>Hola, {usuario?.usuNombre}</h1>
        <p>Bienvenido/a al sistema de gestión bovina de EF Ganados.</p>
        <button type="button" className="inicio-boton-salir" onClick={cerrarSesion}>
          Cerrar sesión
        </button>
      </div>
    </div>
  )
}
