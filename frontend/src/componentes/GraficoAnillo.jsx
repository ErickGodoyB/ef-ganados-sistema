/**
 * Gráfico de anillo dibujado a mano con SVG (sin librerías). Cada porción
 * lleva el color de serie de su posición (--serie-1 a --serie-6, ver
 * index.css; la agrupada como "Otros" usa --serie-otros) y está separada de
 * las vecinas por un trazo del color de la tarjeta. En el centro va el total.
 *
 * Accesibilidad: el SVG es una imagen (role="img") con un aria-label que
 * resume los datos, y la leyenda visible (una lista con la etiqueta, el
 * número y el porcentaje de cada porción) es la alternativa en texto con los
 * mismos datos. Nunca depende solo del color: además del color están el
 * número y el porcentaje de la leyenda. No tiene animaciones, así que no hay
 * nada que adaptar a prefers-reduced-motion.
 */

import { calcularPorciones, caminoDeSector } from '../utilidades/graficos'
import './GraficoAnillo.css'

const CENTRO = 60
const RADIO_EXTERIOR = 56
const RADIO_INTERIOR = 36

/** Color de una porción: el de "Otros" o el de serie según su posición (--serie-1 a --serie-6). */
function colorDe(porcion) {
  return porcion.esOtros ? 'var(--serie-otros)' : `var(--serie-${(porcion.indice % 6) + 1})`
}

/**
 * @param {object} props
 * @param {string} props.titulo Qué muestra el gráfico (para el aria-label), ej. "Animales por lote".
 * @param {{etiqueta: string, valor: number, esOtros?: boolean}[]} props.items Porciones, en el orden de los colores.
 * @param {string} [props.etiquetaTotal] Texto bajo el total del centro, ej. "animales".
 * @param {boolean} [props.mostrarCeros] Si las porciones de valor 0 aparecen igual en la leyenda.
 * @param {string} [props.mensajeVacio] Texto cuando el total es 0.
 */
export default function GraficoAnillo({
  titulo,
  items,
  etiquetaTotal = 'animales',
  mostrarCeros = false,
  mensajeVacio = 'No hay datos para mostrar.',
}) {
  const porciones = calcularPorciones(items)
  const total = items.reduce((suma, item) => suma + item.valor, 0)
  const enLeyenda = porciones.filter((porcion) => mostrarCeros || porcion.valor > 0)

  if (total <= 0) {
    return <p className="grafico-anillo-vacio">{mensajeVacio}</p>
  }

  const resumen = `${titulo}: ${enLeyenda
    .map((porcion) => `${porcion.etiqueta} ${porcion.valor} (${porcion.porcentaje} %)`)
    .join(', ')}. Total: ${total} ${etiquetaTotal}.`

  return (
    <div className="grafico-anillo">
      <svg className="grafico-anillo-svg" viewBox="0 0 120 120" role="img" aria-label={resumen}>
        {porciones
          .filter((porcion) => porcion.valor > 0)
          .map((porcion) => (
            <path
              key={porcion.etiqueta}
              d={caminoDeSector({
                cx: CENTRO,
                cy: CENTRO,
                radioExterior: RADIO_EXTERIOR,
                radioInterior: RADIO_INTERIOR,
                anguloInicio: porcion.anguloInicio,
                anguloFin: porcion.anguloFin,
              })}
              fillRule="evenodd"
              fill={colorDe(porcion)}
              stroke="var(--superficie)"
              strokeWidth="1.5"
            >
              <title>{`${porcion.etiqueta}: ${porcion.valor} (${porcion.porcentaje} %)`}</title>
            </path>
          ))}
        <text className="grafico-anillo-total" x={CENTRO} y={CENTRO + 2} textAnchor="middle">
          {total}
        </text>
        <text className="grafico-anillo-total-etiqueta" x={CENTRO} y={CENTRO + 16} textAnchor="middle">
          {etiquetaTotal}
        </text>
      </svg>

      <ul className="grafico-anillo-leyenda">
        {enLeyenda.map((porcion) => (
          <li key={porcion.etiqueta} className="grafico-anillo-item">
            <span className="grafico-anillo-muestra" style={{ background: colorDe(porcion) }} aria-hidden="true" />
            <span className="grafico-anillo-etiqueta">{porcion.etiqueta}</span>
            <span className="grafico-anillo-numero">
              {porcion.valor} ({porcion.porcentaje} %)
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
