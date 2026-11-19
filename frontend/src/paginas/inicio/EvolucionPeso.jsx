/**
 * Gráfico de línea "Evolución del peso promedio" de Inicio, dibujado a mano
 * con SVG, a partir de las sesiones de pesaje (GET /api/pesajes/sesiones:
 * una por fecha y lote, con su peso promedio). Un selector elige el lote
 * (solo los que tienen sesiones, con "Sin lote" incluido); de entrada queda
 * el del pesaje más reciente. El eje X lleva fechas dd/mm, el Y kg con
 * líneas guía suaves, y cada punto muestra su valor al enfocarlo, pasar el
 * mouse o tocarlo (además de su title/aria-label). Con un solo punto se
 * dibuja solo el punto, con su valor, y un aviso de que hace falta otra
 * sesión para ver la línea.
 *
 * Accesibilidad: el SVG es una imagen (role="img") con un aria-label que
 * resume la serie, y una tabla visualmente oculta trae los mismos datos para
 * lectores de pantalla. Los puntos son enfocables con teclado para quien ve
 * la pantalla pero no usa mouse (los lectores de pantalla usan la tabla).
 * Sin animaciones, así que no hay nada que adaptar a prefers-reduced-motion.
 */

import { RefreshCw, TriangleAlert } from 'lucide-react'
import { useId, useMemo, useState } from 'react'
import { formatearFechaCorta, formatearPeso } from '../../utilidades/formato'
import {
  loteDeLaSesionMasReciente,
  lotesDeSesiones,
  puntosDeLinea,
  serieDePesoPorLote,
} from '../../utilidades/graficos'
import TarjetaGrafico from './TarjetaGrafico'
import { useSesionesInicio } from './useDatosInicio'
import './EvolucionPeso.css'

const ANCHO = 360
const ALTO = 210
const MARGEN = { arriba: 22, derecha: 16, abajo: 30, izquierda: 46 }

/** "1 sesión" / "N sesiones". */
function textoSesiones(cantidad) {
  return cantidad === 1 ? '1 sesión' : `${cantidad} sesiones`
}

/** Etiqueta flotante de un punto: fecha y peso, centrada sobre el punto (o debajo si no hay lugar arriba) y sin salirse del dibujo. */
function EtiquetaDePunto({ punto }) {
  const texto = `${formatearFechaCorta(punto.fecha)} · ${formatearPeso(punto.valor)}`
  const ancho = texto.length * 6.2 + 12
  const x = Math.min(Math.max(punto.x, ancho / 2 + 2), ANCHO - ancho / 2 - 2)
  const arriba = punto.y - 30 >= 0
  const y = arriba ? punto.y - 30 : punto.y + 10
  return (
    <g className="evolucion-etiqueta" aria-hidden="true">
      <rect x={x - ancho / 2} y={y} width={ancho} height={20} rx={4} />
      <text x={x} y={y + 14} textAnchor="middle">
        {texto}
      </text>
    </g>
  )
}

function Grafico({ serie, nombreLote }) {
  const idTabla = useId()
  const [activo, setActivo] = useState(null)
  const { puntos, marcasX, marcasY, area } = useMemo(
    () => puntosDeLinea(serie, { ancho: ANCHO, alto: ALTO, margen: MARGEN }),
    [serie],
  )
  const unico = puntos.length === 1
  const primero = puntos[0]
  const ultimo = puntos[puntos.length - 1]
  const resumen = unico
    ? `Evolución del peso promedio de ${nombreLote}: una sola sesión, ${formatearPeso(primero.valor)} el ${formatearFechaCorta(primero.fecha)}.`
    : `Evolución del peso promedio de ${nombreLote}: de ${formatearPeso(primero.valor)} el ${formatearFechaCorta(primero.fecha)} a ${formatearPeso(ultimo.valor)} el ${formatearFechaCorta(ultimo.fecha)}, ${textoSesiones(puntos.length)}.`
  const visible = unico ? puntos[0] : puntos[activo]

  return (
    <>
      <svg className="evolucion-svg" viewBox={`0 0 ${ANCHO} ${ALTO}`} role="img" aria-label={resumen}>
        {marcasY.map((marca) => (
          <g key={marca.valor}>
            <line className="evolucion-guia" x1={area.x0} x2={area.x1} y1={marca.y} y2={marca.y} />
            <text className="evolucion-eje" x={area.x0 - 6} y={marca.y + 3} textAnchor="end">
              {marca.valor} kg
            </text>
          </g>
        ))}
        {marcasX.map((marca) => (
          <text key={marca.fecha} className="evolucion-eje" x={marca.x} y={area.y1 + 18} textAnchor="middle">
            {formatearFechaCorta(marca.fecha)}
          </text>
        ))}
        {!unico && (
          <polyline className="evolucion-linea" points={puntos.map((punto) => `${punto.x},${punto.y}`).join(' ')} />
        )}
        {puntos.map((punto, indice) => {
          const descripcion = `${formatearFechaCorta(punto.fecha)}: ${formatearPeso(punto.valor)}`
          return (
            <circle
              key={punto.fecha}
              className="evolucion-punto"
              cx={punto.x}
              cy={punto.y}
              r={unico ? 6 : 5}
              tabIndex={0}
              aria-label={descripcion}
              onFocus={() => setActivo(indice)}
              onBlur={() => setActivo(null)}
              onMouseEnter={() => setActivo(indice)}
              onMouseLeave={() => setActivo(null)}
              onClick={() => setActivo(indice)}
            >
              <title>{descripcion}</title>
            </circle>
          )
        })}
        {visible && <EtiquetaDePunto punto={visible} />}
      </svg>

      <table id={idTabla} className="visualmente-oculto">
        <caption>Evolución del peso promedio de {nombreLote}</caption>
        <thead>
          <tr>
            <th scope="col">Fecha</th>
            <th scope="col">Peso promedio</th>
          </tr>
        </thead>
        <tbody>
          {puntos.map((punto) => (
            <tr key={punto.fecha}>
              <td>{formatearFechaCorta(punto.fecha)}</td>
              <td>{formatearPeso(punto.valor)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="evolucion-nota">{textoSesiones(puntos.length)}</p>
      {unico && <p className="evolucion-aviso">Hace falta otra sesión de este lote para ver la línea.</p>}
    </>
  )
}

export default function EvolucionPeso() {
  const { sesiones, cargando, error, recargar } = useSesionesInicio()
  const lotes = useMemo(() => lotesDeSesiones(sesiones), [sesiones])
  const [elegido, setElegido] = useState(null)
  // Hasta que se elija uno a mano, el del pesaje más reciente.
  const lote = elegido ?? loteDeLaSesionMasReciente(sesiones)
  const serie = useMemo(() => serieDePesoPorLote(sesiones, lote), [sesiones, lote])
  const opcion = lotes.find((candidato) => candidato.valor === lote)

  const selector = lotes.length > 0 && (
    <div className="campo-filtro evolucion-selector">
      <label htmlFor="evolucion-lote">Lote</label>
      <select id="evolucion-lote" value={lote} onChange={(evento) => setElegido(evento.target.value)}>
        {lotes.map((candidato) => (
          <option key={candidato.valor} value={candidato.valor}>
            {candidato.etiqueta}
          </option>
        ))}
      </select>
    </div>
  )

  let contenido
  if (cargando) {
    contenido = <p role="status">Cargando evolución del peso…</p>
  } else if (error) {
    contenido = (
      <div className="estado-mensaje">
        <TriangleAlert aria-hidden="true" size={32} className="estado-mensaje-icono" />
        <p>{error}</p>
        <button type="button" className="boton boton-secundario" onClick={recargar}>
          <RefreshCw aria-hidden="true" size={16} />
          Reintentar
        </button>
      </div>
    )
  } else if (serie.length === 0) {
    contenido = <p className="tarjeta-grafico-vacio">Todavía no hay sesiones de pesaje.</p>
  } else {
    // "key" reinicia el punto activo al cambiar de lote.
    contenido = <Grafico key={lote} serie={serie} nombreLote={opcion?.etiqueta ?? 'este lote'} />
  }

  return (
    <TarjetaGrafico titulo="Evolución del peso promedio">
      {!cargando && !error && selector}
      {contenido}
    </TarjetaGrafico>
  )
}
