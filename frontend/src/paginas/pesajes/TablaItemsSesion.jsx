/**
 * Tabla de los animales de una sesión de pesaje (>= 768px, ver
 * ModalDetalleSesion.jsx y TablaItemsSesion.css). Cada fila muestra sus
 * datos de lectura, salvo la que está en accionActiva (edición o
 * confirmación de anulación): esa fila cambia su contenido para mostrar el
 * formulario o la confirmación correspondiente; el resto queda
 * deshabilitado mientras tanto.
 */

import { Ban, Pencil } from 'lucide-react'
import { useState } from 'react'
import ValorGmd from '../../componentes/ValorGmd'
import ValorPesoAnterior from '../../componentes/ValorPesoAnterior'
import { formatearPeso } from '../../utilidades/formato'
import { parsearPeso, pesoTextoEsValido } from '../../utilidades/peso'
import { motivoEsValido } from '../../utilidades/anulacion'
import SelectorMotivoAnulacion from './SelectorMotivoAnulacion'
import './TablaItemsSesion.css'

export default function TablaItemsSesion({
  items,
  fecha,
  accionActiva,
  guardando,
  errorAccion,
  onEditar,
  onAnular,
  onGuardarEdicion,
  onCancelar,
  onConfirmarAnular,
}) {
  return (
    <div className="tabla-items-sesion-contenedor">
      <table className="tabla-items-sesion">
        <caption className="visualmente-oculto">Animales de la sesión</caption>
        <thead>
          <tr>
            <th scope="col">Caravana</th>
            <th scope="col">Raza</th>
            <th scope="col">Peso</th>
            <th scope="col">Peso anterior</th>
            <th scope="col">GMD</th>
            <th scope="col">Responsable</th>
            <th scope="col">Observación</th>
            <th scope="col">
              <span className="visualmente-oculto">Acciones</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const activa = accionActiva?.pesaId === item.pesaId
            const tipoAccion = activa ? accionActiva.tipo : null
            const deshabilitada = accionActiva != null && !activa

            if (tipoAccion === 'editar') {
              return (
                <FilaEdicion
                  key={item.pesaId}
                  item={item}
                  guardando={guardando}
                  error={errorAccion}
                  onGuardar={(peso, observaciones) => onGuardarEdicion(item, peso, observaciones)}
                  onCancelar={onCancelar}
                />
              )
            }

            if (tipoAccion === 'anular') {
              return (
                <FilaConfirmarAnular
                  key={item.pesaId}
                  item={item}
                  fecha={fecha}
                  guardando={guardando}
                  error={errorAccion}
                  onCancelar={onCancelar}
                  onConfirmar={(motivo) => onConfirmarAnular(item, motivo)}
                />
              )
            }

            return (
              <tr key={item.pesaId}>
                <td className="tabla-items-sesion-caravana">{item.caravana}</td>
                <td>{item.razaDescripcion}</td>
                <td>{formatearPeso(item.peso)}</td>
                <td>
                  <ValorPesoAnterior
                    pesoAnterior={item.pesoAnterior}
                    pesoAnteriorEsIngreso={item.pesoAnteriorEsIngreso}
                    fechaPesoAnterior={item.fechaPesoAnterior}
                  />
                </td>
                <td>
                  <ValorGmd gmd={item.gmd} />
                </td>
                <td>{item.responsableNombre || 'Sin datos'}</td>
                <td className="tabla-items-sesion-observacion">{item.observaciones || '—'}</td>
                <td>
                  <div className="tabla-items-sesion-acciones">
                    <button
                      type="button"
                      className="boton-fantasma tabla-items-sesion-boton-accion"
                      onClick={() => onEditar(item)}
                      disabled={deshabilitada}
                      aria-label={`Editar el pesaje de ${item.caravana}`}
                    >
                      <Pencil aria-hidden="true" size={16} />
                    </button>
                    <button
                      type="button"
                      className="boton-fantasma tabla-items-sesion-boton-accion"
                      onClick={() => onAnular(item)}
                      disabled={deshabilitada}
                      aria-label={`Anular el pesaje de ${item.caravana}`}
                    >
                      <Ban aria-hidden="true" size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

/** Fila de edición: solo peso y observación son editables; el resto se muestra fijo. */
function FilaEdicion({ item, guardando, error, onGuardar, onCancelar }) {
  const [peso, setPeso] = useState(String(item.peso).replace('.', ','))
  const [observaciones, setObservaciones] = useState(item.observaciones ?? '')
  const [errorLocal, setErrorLocal] = useState('')

  function manejarGuardar() {
    if (!pesoTextoEsValido(peso)) {
      setErrorLocal('Ingresá un peso válido (mayor a 0 y hasta 2000 kg)')
      return
    }
    setErrorLocal('')
    onGuardar(parsearPeso(peso), observaciones)
  }

  return (
    <tr className="tabla-items-sesion-fila-edicion">
      <td className="tabla-items-sesion-caravana">{item.caravana}</td>
      <td>{item.razaDescripcion}</td>
      <td colSpan={2}>
        <label className="visualmente-oculto" htmlFor={`edicion-peso-${item.pesaId}`}>
          Peso de {item.caravana}
        </label>
        <input
          id={`edicion-peso-${item.pesaId}`}
          className="entrada"
          type="text"
          inputMode="decimal"
          autoFocus
          value={peso}
          onChange={(evento) => setPeso(evento.target.value)}
          disabled={guardando}
          aria-invalid={Boolean(errorLocal)}
        />
      </td>
      <td>
        <ValorGmd gmd={item.gmd} />
      </td>
      <td>{item.responsableNombre || 'Sin datos'}</td>
      <td>
        <label className="visualmente-oculto" htmlFor={`edicion-observacion-${item.pesaId}`}>
          Observación de {item.caravana}
        </label>
        <input
          id={`edicion-observacion-${item.pesaId}`}
          className="entrada"
          type="text"
          value={observaciones}
          onChange={(evento) => setObservaciones(evento.target.value)}
          disabled={guardando}
        />
      </td>
      <td>
        <div className="tabla-items-sesion-acciones">
          <button type="button" className="boton-secundario" onClick={onCancelar} disabled={guardando}>
            Cancelar
          </button>
          <button type="button" className="boton-primario" onClick={manejarGuardar} disabled={guardando}>
            {guardando ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
        {(errorLocal || error) && (
          <p className="campo-error" role="alert">
            {errorLocal || error}
          </p>
        )}
      </td>
    </tr>
  )
}

/** Fila de confirmación de anulación: pide el motivo (chips + texto) y reemplaza las acciones por Cancelar/Anular. */
function FilaConfirmarAnular({ item, fecha, guardando, error, onCancelar, onConfirmar }) {
  const [motivo, setMotivo] = useState('')
  const [errorLocal, setErrorLocal] = useState('')

  function manejarConfirmar() {
    if (!motivoEsValido(motivo)) {
      setErrorLocal('Ingresá un motivo de entre 3 y 255 caracteres')
      return
    }
    setErrorLocal('')
    onConfirmar(motivo)
  }

  return (
    <tr className="tabla-items-sesion-fila-anular">
      <td colSpan={6}>
        <p className="tabla-items-sesion-anular-texto">
          ¿Anular el pesaje de {item.caravana} del {fecha}? El pesaje deja de contar en reportes y se conserva en
          Anulados.
        </p>
        <SelectorMotivoAnulacion
          id={`anular-motivo-${item.pesaId}`}
          motivo={motivo}
          onCambiarMotivo={setMotivo}
          disabled={guardando}
          error={errorLocal || error}
        />
      </td>
      <td colSpan={2}>
        <div className="tabla-items-sesion-acciones">
          <button type="button" className="boton-secundario" onClick={onCancelar} disabled={guardando}>
            Cancelar
          </button>
          <button type="button" className="boton-peligro" onClick={manejarConfirmar} disabled={guardando}>
            <Ban aria-hidden="true" size={16} />
            {guardando ? 'Anulando...' : 'Anular'}
          </button>
        </div>
      </td>
    </tr>
  )
}
