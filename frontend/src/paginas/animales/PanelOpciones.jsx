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

import { RotateCcw, SlidersHorizontal } from 'lucide-react'
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
        <SlidersHorizontal aria-hidden="true" size={18} />
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

            <button type="button" className="boton boton-secundario" onClick={onRestablecer}>
              <RotateCcw aria-hidden="true" size={16} />
              Restablecer
            </button>
          </div>
        </>
      )}
    </div>
  )
}
