/**
 * Barra lateral de navegación: el logo y el nombre de la marca arriba, los
 * accesos a las secciones principales en el medio (con ícono), y abajo la
 * tarjeta del usuario conectado (inicial en un círculo + nombre), el botón
 * de tema y "Cerrar sesión".
 *
 * En pantallas grandes (>= 1024px, ver BarraLateral.css) queda fija a la
 * izquierda. En pantallas chicas es un panel deslizable: LayoutPrincipal es
 * quien decide si está "abierta", oscurece el fondo y maneja el foco; este
 * componente solo expone su nodo raíz vía ref para que esa trampa de foco
 * pueda encontrar sus elementos enfocables.
 */

import { Beef, ChartColumn, LogOut, Scale } from 'lucide-react'
import { forwardRef, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { MARCA } from '../configuracion/marca'
import BotonTema from '../tema/BotonTema'
import './BarraLateral.css'

const ACCESOS = [
  { ruta: '/animales', etiqueta: 'Animales', Icono: Beef },
  { ruta: '/pesajes', etiqueta: 'Pesajes', Icono: Scale },
  { ruta: '/reportes', etiqueta: 'Reportes', Icono: ChartColumn },
]

const BarraLateral = forwardRef(function BarraLateral({ abierta, onNavegar }, ref) {
  const { usuario, cerrarSesion } = useAuth()
  const [logoFallo, setLogoFallo] = useState(false)

  const inicialUsuario = usuario?.usuNombre?.trim().charAt(0).toUpperCase() || '?'

  return (
    <aside
      id="barra-lateral"
      ref={ref}
      className={`barra-lateral${abierta ? ' barra-lateral--abierta' : ''}`}
    >
      <div className="barra-lateral-marca">
        {/* El logo trae su propio fondo crema (ver /logo.png): sobre el
            verde oscuro de la barra se le pone un marco crema redondeado
            para que no se note como un rectángulo pegado encima. */}
        <div className="barra-lateral-logo-marco">
          {!logoFallo ? (
            <img
              src={MARCA.rutaLogo}
              alt=""
              className="barra-lateral-logo"
              onError={() => setLogoFallo(true)}
            />
          ) : (
            <span className="barra-lateral-logo barra-lateral-logo--provisional" aria-hidden="true">
              {MARCA.iniciales}
            </span>
          )}
        </div>
        <div>
          <p className="barra-lateral-nombre">{MARCA.nombre}</p>
          <p className="barra-lateral-subtitulo">{MARCA.subtitulo}</p>
        </div>
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
                <acceso.Icono aria-hidden="true" size={20} />
                {acceso.etiqueta}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="barra-lateral-pie">
        <NavLink
          to="/cuenta"
          className={({ isActive }) =>
            `barra-lateral-tarjeta-usuario${isActive ? ' barra-lateral-tarjeta-usuario--activa' : ''}`
          }
          onClick={onNavegar}
        >
          <span className="barra-lateral-avatar" aria-hidden="true">
            {inicialUsuario}
          </span>
          <span className="barra-lateral-tarjeta-usuario-textos">
            <span className="barra-lateral-usuario">{usuario?.usuNombre}</span>
            <span className="barra-lateral-mi-cuenta">Mi cuenta</span>
          </span>
        </NavLink>
        <div className="barra-lateral-pie-acciones">
          <BotonTema variante="sidebar" />
          <button type="button" className="barra-lateral-salir" onClick={cerrarSesion}>
            <LogOut aria-hidden="true" size={18} />
            Cerrar sesión
          </button>
        </div>
      </div>
    </aside>
  )
})

export default BarraLateral
