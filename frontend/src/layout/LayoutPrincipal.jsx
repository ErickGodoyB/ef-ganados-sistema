/**
 * Layout de las rutas protegidas: barra lateral de navegación + contenido
 * de la sección activa (vía <Outlet />).
 *
 * En pantallas chicas (< 1024px) la barra lateral es un panel deslizable
 * que este componente controla: lo abre/cierra el botón de menú de la
 * barra superior, se puede cerrar tocando el fondo oscurecido, con la
 * tecla Escape, o tocando un acceso dentro del panel (BarraLateral llama a
 * onNavegar). Mientras está abierto, el foco queda atrapado dentro (Tab/
 * Shift+Tab no se escapa del panel) y al cerrarse vuelve al botón de menú.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { MARCA } from '../configuracion/marca'
import BarraLateral from './BarraLateral'
import './LayoutPrincipal.css'

export default function LayoutPrincipal() {
  const [menuAbierto, setMenuAbierto] = useState(false)
  const refPanel = useRef(null)
  const refBotonMenu = useRef(null)

  /** Cierra el panel y devuelve el foco al botón de menú que lo abrió. */
  const cerrarMenu = useCallback(() => {
    setMenuAbierto(false)
    refBotonMenu.current?.focus()
  }, [])

  // Mientras el panel está abierto: Escape lo cierra, y Tab/Shift+Tab queda
  // atrapado dentro de él en vez de escaparse hacia el contenido de atrás.
  useEffect(() => {
    if (!menuAbierto) {
      return undefined
    }

    const panel = refPanel.current
    if (!panel) {
      return undefined
    }

    const elementosFocables = panel.querySelectorAll('a[href], button:not(:disabled)')
    const primero = elementosFocables[0]
    const ultimo = elementosFocables[elementosFocables.length - 1]

    primero?.focus()

    function alPresionarTecla(evento) {
      if (evento.key === 'Escape') {
        cerrarMenu()
        return
      }
      if (evento.key !== 'Tab' || elementosFocables.length === 0) {
        return
      }
      if (evento.shiftKey && document.activeElement === primero) {
        evento.preventDefault()
        ultimo.focus()
      } else if (!evento.shiftKey && document.activeElement === ultimo) {
        evento.preventDefault()
        primero.focus()
      }
    }

    document.addEventListener('keydown', alPresionarTecla)
    return () => document.removeEventListener('keydown', alPresionarTecla)
  }, [menuAbierto, cerrarMenu])

  return (
    <div className="layout">
      <header className="layout-barra-superior">
        <button
          type="button"
          ref={refBotonMenu}
          className="layout-boton-menu"
          aria-label={menuAbierto ? 'Cerrar menú' : 'Abrir menú'}
          aria-expanded={menuAbierto}
          aria-controls="barra-lateral"
          onClick={() => setMenuAbierto((valor) => !valor)}
        >
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false">
            <path
              d="M3 6h18M3 12h18M3 18h18"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              fill="none"
            />
          </svg>
        </button>
        <span className="layout-marca-movil">{MARCA.nombre}</span>
      </header>

      {menuAbierto && <div className="layout-fondo" aria-hidden="true" onClick={cerrarMenu} />}

      <BarraLateral ref={refPanel} abierta={menuAbierto} onNavegar={cerrarMenu} />

      <main className="layout-contenido">
        <Outlet />
      </main>
    </div>
  )
}
