/**
 * Alertas de Inicio: tres botones tipo pestaña ("Aptos para venta", "Sin
 * pesaje reciente" y "Ganancia baja") con su total, y debajo la lista de
 * animales de la alerta elegida (GET /api/inicio/alertas), en tabla desde
 * 768px y tarjetas en celular. Por defecto queda elegida la primera con
 * total mayor a 0 (si todas están en 0, la primera). Los totales de las
 * pestañas salen del resumen que ya cargó la pantalla; la lista se pide
 * recién al elegir la alerta. Cada animal lleva a Animales con su caravana
 * precargada en el buscador. Si el total supera lo mostrado, una nota lo
 * avisa y "Ver todos en Animales" lleva al listado.
 */

import { Inbox, RefreshCw, TriangleAlert } from 'lucide-react'
import { useId, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import ValorGmd from '../../componentes/ValorGmd'
import { formatearFecha, formatearPeso } from '../../utilidades/formato'
import { fechaHoyIso, textoDiasTranscurridos } from '../../utilidades/fechas'
import { useAlertasInicio } from './useDatosInicio'
import './AlertasInicio.css'

const LIMITE = 10

/** Ruta de Animales con la caravana precargada en el buscador. */
function rutaDeAnimal(caravana) {
  return `/animales?caravana=${encodeURIComponent(caravana)}`
}

/** Último pesaje: la fecha y "hace N días", o "Sin pesajes" si nunca se lo pesó. */
function textoUltimoPesaje(animal, hoy) {
  if (!animal.fechaUltimoPesaje) {
    return 'Sin pesajes'
  }
  const hace = textoDiasTranscurridos(animal.fechaUltimoPesaje, hoy)
  return hace ? `${formatearFecha(animal.fechaUltimoPesaje)} · ${hace}` : formatearFecha(animal.fechaUltimoPesaje)
}

function ListaDeAlerta({ tipo, hoy }) {
  const { alerta, cargando, error, recargar } = useAlertasInicio(tipo, LIMITE)
  const navigate = useNavigate()
  const mostrarDias = tipo === 'SIN_PESAJE'

  /** Clic en la fila (no en el enlace de la caravana, que ya navega solo): lleva a Animales. */
  function alTocarFila(evento, caravana) {
    if (evento.target.closest('a')) {
      return
    }
    navigate(rutaDeAnimal(caravana))
  }

  if (cargando) {
    return <p role="status">Cargando alertas…</p>
  }

  if (error) {
    return (
      <div className="estado-mensaje tarjeta">
        <TriangleAlert aria-hidden="true" size={40} className="estado-mensaje-icono" />
        <p>{error}</p>
        <button type="button" className="boton boton-secundario" onClick={recargar}>
          <RefreshCw aria-hidden="true" size={16} />
          Reintentar
        </button>
      </div>
    )
  }

  if (!alerta || alerta.animales.length === 0) {
    return (
      <div className="estado-mensaje tarjeta">
        <Inbox aria-hidden="true" size={40} className="estado-mensaje-icono" />
        <p>No hay animales en esta alerta.</p>
      </div>
    )
  }

  return (
    <>
      <div className="alertas-tabla-solo-escritorio">
        <table className="alertas-tabla">
          <caption className="visualmente-oculto">Animales de la alerta</caption>
          <thead>
            <tr>
              <th scope="col">Caravana</th>
              <th scope="col">Raza</th>
              <th scope="col">Lote</th>
              <th scope="col">Peso actual</th>
              <th scope="col">GMD</th>
              <th scope="col">Último pesaje</th>
              {mostrarDias && <th scope="col">Días sin pesaje</th>}
            </tr>
          </thead>
          <tbody>
            {alerta.animales.map((animal) => (
              <tr key={animal.animalId} onClick={(evento) => alTocarFila(evento, animal.caravana)}>
                <th scope="row">
                  <Link to={rutaDeAnimal(animal.caravana)} className="alertas-caravana">
                    {animal.caravana}
                  </Link>
                </th>
                <td>{animal.razaDescripcion}</td>
                <td>{animal.loteDescripcion || 'Sin lote'}</td>
                <td>{formatearPeso(animal.pesoActual)}</td>
                <td>
                  <ValorGmd gmd={animal.gmd} />
                </td>
                <td>{textoUltimoPesaje(animal, hoy)}</td>
                {mostrarDias && <td>{animal.diasSinPesaje}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="alertas-tarjetas-solo-movil">
        {alerta.animales.map((animal) => (
          <article
            key={animal.animalId}
            className="alertas-tarjeta tarjeta"
            onClick={(evento) => alTocarFila(evento, animal.caravana)}
          >
            <div className="alertas-tarjeta-encabezado">
              <Link to={rutaDeAnimal(animal.caravana)} className="alertas-caravana">
                {animal.caravana}
              </Link>
              <span className="alertas-tarjeta-peso">{formatearPeso(animal.pesoActual)}</span>
            </div>
            <dl className="alertas-tarjeta-datos">
              <div>
                <dt>Raza</dt>
                <dd>{animal.razaDescripcion}</dd>
              </div>
              <div>
                <dt>Lote</dt>
                <dd>{animal.loteDescripcion || 'Sin lote'}</dd>
              </div>
              <div>
                <dt>GMD</dt>
                <dd>
                  <ValorGmd gmd={animal.gmd} />
                </dd>
              </div>
              {mostrarDias && (
                <div>
                  <dt>Días sin pesaje</dt>
                  <dd>{animal.diasSinPesaje}</dd>
                </div>
              )}
              <div className="alertas-dato--ancho">
                <dt>Último pesaje</dt>
                <dd>{textoUltimoPesaje(animal, hoy)}</dd>
              </div>
            </dl>
          </article>
        ))}
      </div>

      {alerta.total > alerta.animales.length && (
        <div className="alertas-mas">
          <p className="alertas-nota">
            Mostrando {alerta.animales.length} de {alerta.total}
          </p>
          <Link to="/animales" className="boton boton-secundario">
            Ver todos en Animales
          </Link>
        </div>
      )}
    </>
  )
}

export default function AlertasInicio({ resumen }) {
  const idPanel = useId()
  const opciones = [
    { tipo: 'APTOS', etiqueta: 'Aptos para venta', total: resumen.aptosVenta },
    { tipo: 'SIN_PESAJE', etiqueta: 'Sin pesaje reciente', total: resumen.sinPesajeReciente },
    {
      tipo: 'GANANCIA_BAJA',
      etiqueta: 'Ganancia baja',
      total: resumen.gananciaBaja,
      detalle: `GMD menor a ${String(resumen.parametros.gananciaMinima).replace('.', ',')} kg/día`,
    },
  ]
  // Hasta que se elija una a mano, queda la primera con total mayor a 0.
  const [elegida, setElegida] = useState(null)
  const porDefecto = (opciones.find((opcion) => opcion.total > 0) ?? opciones[0]).tipo
  const tipo = elegida ?? porDefecto
  const hoy = fechaHoyIso()

  return (
    <div className="alertas">
      <div className="alertas-pestanas">
        {opciones.map((opcion) => (
          <button
            key={opcion.tipo}
            type="button"
            className={`alertas-pestana${opcion.tipo === tipo ? ' alertas-pestana--elegida' : ''}`}
            aria-pressed={opcion.tipo === tipo}
            aria-controls={idPanel}
            onClick={() => setElegida(opcion.tipo)}
          >
            <span className="alertas-pestana-titulo">
              {opcion.etiqueta} <span className="alertas-pestana-total">({opcion.total})</span>
            </span>
            {opcion.detalle && <span className="alertas-pestana-detalle">{opcion.detalle}</span>}
          </button>
        ))}
      </div>

      <div id={idPanel}>
        <ListaDeAlerta key={tipo} tipo={tipo} hoy={hoy} />
      </div>
    </div>
  )
}
