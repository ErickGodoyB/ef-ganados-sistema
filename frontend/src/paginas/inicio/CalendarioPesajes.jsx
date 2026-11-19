/**
 * Calendario de pesajes de Inicio, hecho a mano (sin librerías): cuadrícula
 * del mes con la semana desde el lunes, botones "Mes anterior", "Mes
 * siguiente" y "Hoy", y los días con pesajes marcados con un punto y la
 * cantidad de animales, dentro de una cuadrícula con borde (los días del mes
 * anterior y siguiente que completan las semanas se ven atenuados). El día
 * de hoy lleva borde de acento (y aria-current="date").
 * Los días con pesajes son botones con una etiqueta completa ("15 de
 * noviembre: 2 sesiones, 40 animales"); al elegir uno se muestran sus
 * sesiones y animales y un enlace a Pesajes con ese día precargado. Los
 * datos del mes se piden al cambiar de mes (GET /api/inicio/calendario) y
 * sus errores no afectan al resto de Inicio. Las cuentas de fechas están en
 * utilidades/calendario.js (puras, con fechas aaaa-mm-dd).
 */

import { ChevronLeft, ChevronRight, RefreshCw, TriangleAlert } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  armarSemanas,
  DIAS_SEMANA,
  desplazarMes,
  etiquetaDiaMes,
  partesDeFecha,
  tituloDelMes,
} from '../../utilidades/calendario'
import { fechaHoyIso } from '../../utilidades/fechas'
import { useCalendarioInicio } from './useDatosInicio'
import './CalendarioPesajes.css'

/** "1 sesión" / "N sesiones". */
function textoSesiones(cantidad) {
  return cantidad === 1 ? '1 sesión' : `${cantidad} sesiones`
}

/** "1 animal" / "N animales". */
function textoAnimales(cantidad) {
  return cantidad === 1 ? '1 animal' : `${cantidad} animales`
}

export default function CalendarioPesajes() {
  const hoy = fechaHoyIso()
  const partesHoy = partesDeFecha(hoy)
  const [mesVisible, setMesVisible] = useState({ anio: partesHoy.anio, mes: partesHoy.mes })
  const [elegido, setElegido] = useState(null)
  const { dias, cargando, error, recargar } = useCalendarioInicio(mesVisible.anio, mesVisible.mes)

  const diasConPesajes = useMemo(() => new Map(dias.map((dia) => [dia.fecha, dia])), [dias])
  const semanas = useMemo(() => armarSemanas(mesVisible.anio, mesVisible.mes), [mesVisible])
  const diaElegido = elegido ? diasConPesajes.get(elegido) : undefined

  function irAlMes(delta) {
    setMesVisible((actual) => desplazarMes(actual, delta))
    setElegido(null)
  }

  function irAHoy() {
    setMesVisible({ anio: partesHoy.anio, mes: partesHoy.mes })
    setElegido(hoy)
  }

  return (
    <div className="calendario">
      <div className="calendario-barra">
        <button type="button" className="calendario-nav" aria-label="Mes anterior" onClick={() => irAlMes(-1)}>
          <ChevronLeft aria-hidden="true" size={20} />
        </button>
        <h3 className="calendario-titulo" aria-live="polite">
          {tituloDelMes(mesVisible.anio, mesVisible.mes)}
        </h3>
        <button type="button" className="calendario-nav" aria-label="Mes siguiente" onClick={() => irAlMes(1)}>
          <ChevronRight aria-hidden="true" size={20} />
        </button>
        <button type="button" className="boton boton-secundario calendario-hoy" onClick={irAHoy}>
          Hoy
        </button>
      </div>

      {cargando && <p role="status">Cargando calendario…</p>}

      {!cargando && error && (
        <div className="estado-mensaje tarjeta">
          <TriangleAlert aria-hidden="true" size={40} className="estado-mensaje-icono" />
          <p>{error}</p>
          <button type="button" className="boton boton-secundario" onClick={recargar}>
            <RefreshCw aria-hidden="true" size={16} />
            Reintentar
          </button>
        </div>
      )}

      <table className="calendario-tabla">
        <caption className="visualmente-oculto">
          Calendario de pesajes de {tituloDelMes(mesVisible.anio, mesVisible.mes)}
        </caption>
        <thead>
          <tr>
            {DIAS_SEMANA.map((dia) => (
              <th key={dia.corto} scope="col" abbr={dia.largo}>
                {dia.corto}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {semanas.map((semana, indice) => (
            <tr key={indice}>
              {semana.map((celda, columna) => {
                if (celda.fueraDelMes) {
                  // Día del mes anterior o siguiente: solo completa la cuadrícula, atenuado y sin marcas.
                  return (
                    <td key={columna} className="calendario-celda calendario-celda--fuera">
                      <span className="calendario-dia calendario-dia--fuera" aria-hidden="true">
                        <span className="calendario-numero">{celda.dia}</span>
                      </span>
                    </td>
                  )
                }
                const datos = diasConPesajes.get(celda.fechaIso)
                const esHoy = celda.fechaIso === hoy
                const clase = `calendario-dia${esHoy ? ' calendario-dia--hoy' : ''}`
                return (
                  <td key={columna} className="calendario-celda">
                    {datos ? (
                      <button
                        type="button"
                        className={`${clase} calendario-dia--con-pesajes${
                          celda.fechaIso === elegido ? ' calendario-dia--elegido' : ''
                        }`}
                        aria-label={`${etiquetaDiaMes(celda.fechaIso)}: ${textoSesiones(datos.sesiones)}, ${textoAnimales(datos.animales)}`}
                        aria-pressed={celda.fechaIso === elegido}
                        aria-current={esHoy ? 'date' : undefined}
                        onClick={() => setElegido(celda.fechaIso)}
                      >
                        <span className="calendario-numero">{celda.dia}</span>
                        <span className="calendario-marca" aria-hidden="true">
                          <span className="calendario-punto" />
                          {datos.animales}
                        </span>
                      </button>
                    ) : (
                      <span className={clase} aria-current={esHoy ? 'date' : undefined}>
                        <span className="calendario-numero">{celda.dia}</span>
                      </span>
                    )}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>

      {!cargando && !error && dias.length === 0 && (
        <p className="calendario-nota">No hay pesajes registrados en este mes.</p>
      )}

      {diaElegido && (
        <div className="calendario-detalle">
          <p className="calendario-detalle-fecha">{etiquetaDiaMes(diaElegido.fecha)}</p>
          <p className="calendario-detalle-texto">
            {textoSesiones(diaElegido.sesiones)}, {textoAnimales(diaElegido.animales)}
          </p>
          <Link to={`/pesajes?fecha=${diaElegido.fecha}`} className="boton boton-secundario">
            Ver pesajes de ese día
          </Link>
        </div>
      )}
    </div>
  )
}
