/**
 * Detalle de una transferencia (GET /api/transferencias/{id}): sus datos y
 * la tabla de animales con su origen, destino y si siguen hoy en el lote
 * de destino. Desde acá se la puede devolver ("Devolver"), salvo que ella
 * misma sea una devolución o ya haya sido devuelta (el backend respondería
 * 409, así que el botón ni se ofrece).
 *
 * Es una sola instancia de Modal con tres vistas ('detalle', 'devolver' y
 * 'resultado'), igual que ModalDetalleAnimal con su formulario de salida:
 * así el foco y el cierre con Escape se manejan en un solo lugar. En la
 * vista 'resultado' queda a la vista cuántos animales se devolvieron y
 * cuántos se omitieron hasta que se cierre el modal.
 */

import { CircleCheck, CircleX, RefreshCw, TriangleAlert, Undo2 } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { peticionProtegida } from '../../api/cliente'
import BotonExportar from '../../componentes/BotonExportar'
import Modal from '../../componentes/Modal'
import ModalExportar from '../../componentes/ModalExportar'
import { useUsuarioExportacion } from '../../utilidades/exportacion/useUsuarioExportacion'
import {
  COLUMNAS_DETALLE_TRANSFERENCIA,
  contextoDeTransferencia,
  filaDeAnimalTransferencia,
} from './exportacionTransferencias'
import { formatearFecha, formatearFechaHora } from '../../utilidades/formato'
import FormularioDevolucion from './FormularioDevolucion'
import { etiquetaMotivoTransferencia, textoCantidadAnimales } from './motivos'
import './ModalDetalleTransferencia.css'

const TITULOS = {
  detalle: 'Detalle de la transferencia',
  devolver: 'Devolver transferencia',
  resultado: 'Transferencia devuelta',
}

/** "1 devuelto" / "N devueltos" y "1 omitido" / "N omitidos". */
function textoResultado(devueltos, omitidos) {
  const textoDevueltos = devueltos === 1 ? '1 devuelto' : `${devueltos} devueltos`
  const textoOmitidos = omitidos === 1 ? '1 omitido' : `${omitidos} omitidos`
  return `${textoDevueltos}, ${textoOmitidos}`
}

export default function ModalDetalleTransferencia({ transferenciaId, onCerrar, onDevuelta, refDisparador }) {
  const [vista, setVista] = useState('detalle')
  const [detalle, setDetalle] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [resultado, setResultado] = useState(null)

  const cargar = useCallback(async () => {
    setCargando(true)
    setError('')
    try {
      setDetalle(await peticionProtegida(`/api/transferencias/${transferenciaId}`))
    } catch {
      setError('No se pudo cargar el detalle de la transferencia.')
    } finally {
      setCargando(false)
    }
  }, [transferenciaId])

  useEffect(() => {
    // Ver la justificación de este mismo patrón en useAnimalesResumen.js.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargar()
  }, [cargar])

  function alDevolver(respuesta) {
    setResultado(respuesta)
    setVista('resultado')
    // Avisa de una vez (no al cerrar): el listado de fondo ya tiene que mostrar "Devuelta".
    onDevuelta()
  }

  const puedeDevolverse = detalle && detalle.motivo !== 'DEVOLUCION' && !detalle.devuelta

  // Exportación (PDF/Excel) de los animales de esta transferencia, sin filtros:
  // el contexto de la transferencia va en la línea de filtros del archivo.
  const [modalExportarAbierto, setModalExportarAbierto] = useState(false)
  const refBotonExportar = useRef(null)
  const usuarioExportacion = useUsuarioExportacion()
  const obtenerFilasExportacion = useCallback(
    () => (detalle ? detalle.animales.map(filaDeAnimalTransferencia) : []),
    [detalle],
  )
  const describirContexto = useCallback(() => (detalle ? contextoDeTransferencia(detalle) : []), [detalle])

  return (
    <Modal titulo={TITULOS[vista]} onCerrar={onCerrar} refDisparador={refDisparador} tamano="grande">
      {cargando && <p role="status">Cargando detalle…</p>}

      {!cargando && error && (
        <div className="estado-mensaje tarjeta">
          <TriangleAlert aria-hidden="true" size={40} className="estado-mensaje-icono" />
          <p>{error}</p>
          <button type="button" className="boton boton-secundario" onClick={cargar}>
            <RefreshCw aria-hidden="true" size={16} />
            Reintentar
          </button>
        </div>
      )}

      {!cargando && !error && detalle && vista === 'detalle' && (
        <div className="detalle-transferencia">
          <dl className="detalle-transferencia-datos">
            <div>
              <dt>Fecha</dt>
              <dd>{formatearFecha(detalle.fecha)}</dd>
            </div>
            <div>
              <dt>Motivo</dt>
              <dd>{etiquetaMotivoTransferencia(detalle.motivo)}</dd>
            </div>
            <div>
              <dt>Responsable</dt>
              <dd>{detalle.responsableNombre}</dd>
            </div>
            <div>
              <dt>Registrada el</dt>
              <dd>{formatearFechaHora(detalle.registradaEn)}</dd>
            </div>
            <div className="detalle-transferencia-dato--ancho">
              <dt>Nota</dt>
              <dd>{detalle.nota || 'Sin nota'}</dd>
            </div>
            {detalle.devuelveA != null && (
              <div className="detalle-transferencia-dato--ancho">
                <dt>Devuelve a</dt>
                <dd>Transferencia n.º {detalle.devuelveA}</dd>
              </div>
            )}
            {detalle.devuelta && (
              <div className="detalle-transferencia-dato--ancho">
                <dt>Estado</dt>
                <dd>
                  <span className="badge">Devuelta</span>
                </dd>
              </div>
            )}
          </dl>

          <h3 className="detalle-transferencia-subtitulo">
            Animales ({textoCantidadAnimales(detalle.animales.length)})
          </h3>

          <div className="detalle-transferencia-tabla-contenedor">
            <table className="detalle-transferencia-tabla">
              <caption className="visualmente-oculto">Animales de la transferencia</caption>
              <thead>
                <tr>
                  <th scope="col">Caravana</th>
                  <th scope="col">Raza</th>
                  <th scope="col">Origen</th>
                  <th scope="col">Destino</th>
                  <th scope="col">Sigue en destino</th>
                </tr>
              </thead>
              <tbody>
                {detalle.animales.map((animal) => (
                  <tr key={animal.animalId}>
                    <td className="detalle-transferencia-caravana">{animal.caravana}</td>
                    <td>{animal.razaDescripcion}</td>
                    <td>{animal.origen}</td>
                    <td>{animal.destino}</td>
                    <td>
                      {animal.enDestino ? (
                        <span className="detalle-transferencia-si">
                          <CircleCheck aria-hidden="true" size={16} /> Sí
                        </span>
                      ) : (
                        <span className="detalle-transferencia-no">
                          <CircleX aria-hidden="true" size={16} /> No
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="detalle-transferencia-acciones">
            <BotonExportar
              onClick={(evento) => {
                refBotonExportar.current = evento.currentTarget
                setModalExportarAbierto(true)
              }}
              disabled={detalle.animales.length === 0}
            />
            <button type="button" className="boton-secundario" onClick={onCerrar}>
              Cerrar
            </button>
            {puedeDevolverse && (
              <button type="button" className="boton-primario" onClick={() => setVista('devolver')}>
                <Undo2 aria-hidden="true" size={16} />
                Devolver
              </button>
            )}
          </div>
        </div>
      )}

      {!cargando && !error && detalle && vista === 'devolver' && (
        <FormularioDevolucion transferencia={detalle} onDevuelta={alDevolver} onCancelar={() => setVista('detalle')} />
      )}

      {modalExportarAbierto && detalle && (
        <ModalExportar
          titulo={`Transferencia n.º ${detalle.traId}`}
          tituloModal="Exportar animales de la transferencia"
          listado={`transferencia-${detalle.traId}`}
          columnas={COLUMNAS_DETALLE_TRANSFERENCIA}
          obtenerFilas={obtenerFilasExportacion}
          describirFiltros={describirContexto}
          usuario={usuarioExportacion}
          onCerrar={() => setModalExportarAbierto(false)}
          refDisparador={refBotonExportar}
        />
      )}

      {vista === 'resultado' && resultado && (
        <div className="detalle-transferencia-resultado">
          <p role="status" className="detalle-transferencia-resultado-texto">
            {textoResultado(resultado.cantidadDevuelta, resultado.cantidadOmitida)}
          </p>
          <div className="detalle-transferencia-acciones">
            <button type="button" className="boton-primario" onClick={onCerrar}>
              Cerrar
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}
