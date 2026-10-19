/**
 * Botón de "Opciones" (solo el ícono, 44x44px, con aria-label y title
 * porque no tiene texto visible) que abre un panel con las columnas
 * opcionales de la tabla, el selector de filas por página y
 * "Restablecer". Se cierra con Escape o al hacer clic fuera (o tocando el
 * fondo oscurecido, en celular). No es un modal (no atrapa el foco): es un
 * panel de opciones común, como un menú desplegable, a diferencia del
 * panel de navegación de celular (ese sí es un modal, ver LayoutPrincipal).
 *
 * Por debajo de 768px el panel se muestra como hoja inferior fija (ver
 * PanelOpciones.css): como el botón ya no está anclado al borde derecho de
 * la pantalla (vive junto al buscador, ver Animales.css), un desplegable
 * con position: absolute podía quedar fuera de la pantalla según dónde
 * cayera el botón. Desde 768px sigue siendo el desplegable anclado al
 * botón de siempre.
 */

import { useEffect, useRef, useState } from 'react'
import { COLUMNAS_OPCIONALES } from './columnas'
import './PanelOpciones.css'

const OPCIONES_FILAS_POR_PAGINA = [10, 25, 50]

export default function PanelOpciones({
  columnasVisibles,
  onCambiarColumnaVisible,
  filasPorPagina,
  onCambiarFilasPorPagina,
  onRestablecer,
}) {
  const [abierto, setAbierto] = useState(false)
  const refContenedor = useRef(null)

  useEffect(() => {
    if (!abierto) {
      return undefined
    }

    function alHacerClic(evento) {
      if (refContenedor.current && !refContenedor.current.contains(evento.target)) {
        setAbierto(false)
      }
    }

    function alPresionarTecla(evento) {
      if (evento.key === 'Escape') {
        setAbierto(false)
      }
    }

    document.addEventListener('mousedown', alHacerClic)
    document.addEventListener('keydown', alPresionarTecla)
    return () => {
      document.removeEventListener('mousedown', alHacerClic)
      document.removeEventListener('keydown', alPresionarTecla)
    }
  }, [abierto])

  return (
    <div className="panel-opciones" ref={refContenedor}>
      <button
        type="button"
        className="panel-opciones-boton"
        aria-haspopup="true"
        aria-expanded={abierto}
        aria-label="Opciones del listado"
        title="Opciones"
        onClick={() => setAbierto((valor) => !valor)}
      >
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
          <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="2" />
          <g stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="12" y1="2" x2="12" y2="5" />
            <line x1="12" y1="19" x2="12" y2="22" />
            <line x1="2" y1="12" x2="5" y2="12" />
            <line x1="19" y1="12" x2="22" y2="12" />
            <line x1="4.9" y1="4.9" x2="7" y2="7" />
            <line x1="17" y1="17" x2="19.1" y2="19.1" />
            <line x1="4.9" y1="19.1" x2="7" y2="17" />
            <line x1="17" y1="7" x2="19.1" y2="4.9" />
          </g>
        </svg>
      </button>

      {abierto && (
        <>
          {/* Solo se ve en celular (ver @media en PanelOpciones.css); en
              escritorio queda oculto y no bloquea nada. */}
          <div className="panel-opciones-fondo" aria-hidden="true" onClick={() => setAbierto(false)} />
          <div className="panel-opciones-contenido" role="group" aria-label="Opciones del listado">
            <fieldset className="panel-opciones-columnas">
              <legend>Columnas visibles</legend>
              <label className="panel-opciones-columna">
                <input type="checkbox" checked disabled />
                Caravana
              </label>
              {COLUMNAS_OPCIONALES.map((columna) => (
                <label key={columna.clave} className="panel-opciones-columna">
                  <input
                    type="checkbox"
                    checked={columnasVisibles[columna.clave]}
                    onChange={(evento) => onCambiarColumnaVisible(columna.clave, evento.target.checked)}
                  />
                  {columna.etiqueta}
                </label>
              ))}
            </fieldset>

            <div className="panel-opciones-filas">
              <label htmlFor="panel-opciones-filas-por-pagina">Filas por página</label>
              <select
                id="panel-opciones-filas-por-pagina"
                value={filasPorPagina}
                onChange={(evento) => onCambiarFilasPorPagina(Number(evento.target.value))}
              >
                {OPCIONES_FILAS_POR_PAGINA.map((opcion) => (
                  <option key={opcion} value={opcion}>
                    {opcion}
                  </option>
                ))}
              </select>
            </div>

            <button type="button" className="panel-opciones-restablecer" onClick={onRestablecer}>
              Restablecer
            </button>
          </div>
        </>
      )}
    </div>
  )
}
