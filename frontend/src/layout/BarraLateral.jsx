/**
 * Barra lateral de navegación: el logo y el nombre de la marca arriba, los
 * accesos a las secciones principales en el medio, y abajo el usuario
 * conectado, el botón de tema y "Cerrar sesión".
 *
 * En pantallas grandes (>= 1024px, ver BarraLateral.css) queda fija a la
 * izquierda. En pantallas chicas es un panel deslizable: LayoutPrincipal es
 * quien decide si está "abierta", oscurece el fondo y maneja el foco; este
 * componente solo expone su nodo raíz vía ref para que esa trampa de foco
 * pueda encontrar sus elementos enfocables.
 */

import { forwardRef, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { MARCA } from '../configuracion/marca'
import BotonTema from '../tema/BotonTema'
import './BarraLateral.css'

const ACCESOS = [
  { ruta: '/animales', etiqueta: 'Animales' },
  { ruta: '/pesajes', etiqueta: 'Pesajes' },
  { ruta: '/reportes', etiqueta: 'Reportes' },
]

const BarraLateral = forwardRef(function BarraLateral({ abierta, onNavegar }, ref) {
  const { usuario, cerrarSesion } = useAuth()
  const [logoFallo, setLogoFallo] = useState(false)

  return (
    <aside
      id="barra-lateral"
      ref={ref}
      className={`barra-lateral${abierta ? ' barra-lateral--abierta' : ''}`}
    >
      <div className="barra-lateral-marca">
        {!logoFallo ? (
          <img
            src={MARCA.rutaLogo}
            alt=""
            className="barra-lateral-logo"
            onError={() => setLogoFallo(true)}
          />
        ) : (
          <div className="barra-lateral-logo barra-lateral-logo--provisional" aria-hidden="true">
            {MARCA.iniciales}
          </div>
        )}
        <span className="barra-lateral-nombre">{MARCA.nombre}</span>
      </div>

      <nav className="barra-lateral-nav" aria-label="Secciones principales">
        <ul>
          {ACCESOS.map((acceso) => (
            <li key={acceso.ruta}>
              <NavLink
                to={acceso.ruta}
                className={({ isActive }) =>
                  `barra-lateral-enlace${isActive ? ' barra-lateral-enlace--activo' : ''}`
                }
                onClick={onNavegar}
              >
                {acceso.etiqueta}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="barra-lateral-pie">
        <p className="barra-lateral-usuario">{usuario?.usuNombre}</p>
        <div className="barra-lateral-pie-acciones">
          <BotonTema />
          <button type="button" className="barra-lateral-salir" onClick={cerrarSesion}>
            Cerrar sesión
          </button>
        </div>
      </div>
    </aside>
  )
})

export default BarraLateral
