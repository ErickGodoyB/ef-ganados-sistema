/**
 * Filtro de rango de fechas reutilizable: un botón con ícono de calendario
 * que abre un panel con "Desde"/"Hasta", atajos ("Hoy", "Últimos 7 días",
 * "Últimos 30 días", "Este mes") y "Aplicar"/"Limpiar". Reemplaza a los dos
 * campos sueltos Desde/Hasta (ver Pesajes.jsx).
 *
 * Es controlado por quien lo usa: "desde"/"hasta" son el rango YA APLICADO
 * (lo que se está filtrando en este momento); el panel trabaja sobre una
 * copia local ("borrador") que solo se confirma al tocar "Aplicar" (o se
 * descarta si se cierra sin aplicar). "onCambiar" se llama con
 * {desde, hasta} tanto al aplicar como al limpiar.
 *
 * Accesible: el botón tiene aria-expanded y aria-haspopup; el panel atrapa
 * el foco (como Modal.jsx, pero acotado a este panel en vez de toda la
 * pantalla) y Escape lo cierra devolviendo el foco al botón. En celular es
 * una hoja inferior (mismo criterio que PanelOpciones.jsx); desde 768px es
 * un desplegable anclado al botón.
 *
 * También se cierra con un clic/toque fuera del panel, con el mismo
 * mecanismo (mousedown + ref del contenedor) que ya usa PanelOpciones.jsx,
 * para que los dos paneles del listado se comporten igual. Como el panel
 * atrapa el foco mientras está abierto, no hace falta escuchar aparte
 * cuándo se abre un modal u otro panel (Lote, Opciones): para llegar a ese
 * botón con el mouse hay que primero hacer clic fuera de este panel, lo
 * que ya lo cierra; y por teclado no se puede, porque el foco no puede
 * salir de acá mientras está abierto. El z-index del panel queda por
 * debajo del de Modal.css a propósito, para el caso en que de todos modos
 * quedaran montados juntos.
 */

import { Calendar, X } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { calcularAtajoIntervalo, rangoDeFechasEsValido } from '../utilidades/fechas'
import { formatearFechaCorta } from '../utilidades/formato'
import './Intervalo.css'

const ATAJOS = [
  { clave: 'hoy', etiqueta: 'Hoy' },
  { clave: '7dias', etiqueta: 'Últimos 7 días' },
  { clave: '30dias', etiqueta: 'Últimos 30 días' },
  { clave: 'esteMes', etiqueta: 'Este mes' },
]

export default function Intervalo({ desde, hasta, onCambiar, etiqueta = 'Intervalo' }) {
  const [abierto, setAbierto] = useState(false)
  const [borradorDesde, setBorradorDesde] = useState(desde)
  const [borradorHasta, setBorradorHasta] = useState(hasta)

  const idPanel = useId()
  const refContenedor = useRef(null)
  const refBoton = useRef(null)
  const refPanel = useRef(null)

  const hayRangoAplicado = Boolean(desde || hasta)
  const borradorInvalido = !rangoDeFechasEsValido(borradorDesde, borradorHasta)

  function abrir() {
    setBorradorDesde(desde)
    setBorradorHasta(hasta)
    setAbierto(true)
  }

  function cerrar() {
    setAbierto(false)
    refBoton.current?.focus()
  }

  function aplicarAtajo(clave) {
    const rango = calcularAtajoIntervalo(clave)
    setBorradorDesde(rango.desde)
    setBorradorHasta(rango.hasta)
  }

  function aplicar() {
    if (borradorInvalido) {
      return
    }
    onCambiar({ desde: borradorDesde, hasta: borradorHasta })
    cerrar()
  }

  function limpiar() {
    setBorradorDesde('')
    setBorradorHasta('')
    onCambiar({ desde: '', hasta: '' })
    cerrar()
  }

  // Trampa de foco + Escape mientras el panel está abierto (mismo criterio
  // que Modal.jsx, acotado a refPanel en vez de todo el documento), más el
  // cierre al hacer clic/toque afuera (mismo mecanismo que PanelOpciones.jsx:
  // mousedown + ref del contenedor completo, botón incluido, para que un
  // clic en el propio botón no cuente como "afuera" y lo siga manejando su
  // onClick de siempre).
  useEffect(() => {
    if (!abierto) {
      return undefined
    }

    function elementosFocables() {
      if (!refPanel.current) {
        return []
      }
      return Array.from(
        refPanel.current.querySelectorAll('a[href], button:not(:disabled), input:not(:disabled)'),
      )
    }

    elementosFocables()[0]?.focus()

    function alHacerClicAfuera(evento) {
      if (refContenedor.current && !refContenedor.current.contains(evento.target)) {
        setAbierto(false)
      }
    }

    function alPresionarTecla(evento) {
      if (evento.key === 'Escape') {
        evento.preventDefault()
        cerrar()
        return
      }
      if (evento.key !== 'Tab') {
        return
      }
      const focables = elementosFocables()
      if (focables.length === 0) {
        return
      }
      const primero = focables[0]
      const ultimo = focables[focables.length - 1]
      if (evento.shiftKey && document.activeElement === primero) {
        evento.preventDefault()
        ultimo.focus()
      } else if (!evento.shiftKey && document.activeElement === ultimo) {
        evento.preventDefault()
        primero.focus()
      }
    }

    document.addEventListener('mousedown', alHacerClicAfuera)
    document.addEventListener('keydown', alPresionarTecla)
    return () => {
      document.removeEventListener('mousedown', alHacerClicAfuera)
      document.removeEventListener('keydown', alPresionarTecla)
    }
  }, [abierto])

  return (
    <div className="intervalo" ref={refContenedor}>
      <button
        type="button"
        ref={refBoton}
        className="intervalo-boton"
        aria-haspopup="true"
        aria-expanded={abierto}
        aria-controls={idPanel}
        onClick={() => (abierto ? cerrar() : abrir())}
      >
        <Calendar aria-hidden="true" size={18} />
        {hayRangoAplicado ? `${formatearFechaCorta(desde)} – ${formatearFechaCorta(hasta)}` : etiqueta}
      </button>

      {hayRangoAplicado && (
        <button
          type="button"
          className="intervalo-boton-limpiar"
          aria-label="Quitar el filtro de intervalo"
          onClick={() => onCambiar({ desde: '', hasta: '' })}
        >
          <X aria-hidden="true" size={16} />
        </button>
      )}

      {abierto && (
        <>
          <div className="intervalo-fondo" aria-hidden="true" onClick={cerrar} />
          <div id={idPanel} ref={refPanel} role="group" aria-label="Elegir intervalo de fechas" className="intervalo-panel">
            <div className="intervalo-atajos">
              {ATAJOS.map((atajo) => (
                <button
                  key={atajo.clave}
                  type="button"
                  className="boton-secundario"
                  onClick={() => aplicarAtajo(atajo.clave)}
                >
                  {atajo.etiqueta}
                </button>
              ))}
            </div>

            <div className="intervalo-campos">
              <div className="campo">
                <label htmlFor={`${idPanel}-desde`}>Desde</label>
                <input
                  id={`${idPanel}-desde`}
                  type="date"
                  value={borradorDesde}
                  max={borradorHasta || undefined}
                  onChange={(evento) => setBorradorDesde(evento.target.value)}
                  aria-invalid={borradorInvalido}
                />
              </div>
              <div className="campo">
                <label htmlFor={`${idPanel}-hasta`}>Hasta</label>
                <input
                  id={`${idPanel}-hasta`}
                  type="date"
                  value={borradorHasta}
                  min={borradorDesde || undefined}
                  onChange={(evento) => setBorradorHasta(evento.target.value)}
                  aria-invalid={borradorInvalido}
                />
              </div>
            </div>

            {borradorInvalido && (
              <p className="intervalo-error" role="alert">
                La fecha Desde no puede ser posterior a Hasta
              </p>
            )}

            <div className="intervalo-acciones">
              <button type="button" className="boton-secundario" onClick={limpiar}>
                Limpiar
              </button>
              <button type="button" className="boton-primario" onClick={aplicar} disabled={borradorInvalido}>
                Aplicar
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
