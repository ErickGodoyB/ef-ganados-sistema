/**
 * Tarjeta de un animal de una sesión de pesaje para pantallas chicas
 * (< 768px, ver ModalDetalleSesion.jsx y TarjetaItemSesion.css). Según
 * "tipoAccion" muestra los datos de lectura, el formulario de edición (solo
 * peso y observación) o la confirmación de anulación (motivo);
 * "deshabilitada" es true cuando OTRA tarjeta está en alguno de esos dos
 * modos.
 */

import { Ban, Pencil } from 'lucide-react'
import { useState } from 'react'
import ValorGmd from '../../componentes/ValorGmd'
import ValorPesoAnterior from '../../componentes/ValorPesoAnterior'
import { formatearPeso } from '../../utilidades/formato'
import { parsearPeso, pesoTextoEsValido } from '../../utilidades/peso'
import { motivoEsValido } from '../../utilidades/anulacion'
import SelectorMotivoAnulacion from './SelectorMotivoAnulacion'
import './TarjetaItemSesion.css'

export default function TarjetaItemSesion({
  item,
  fecha,
  activa,
  tipoAccion,
  deshabilitada,
  guardando,
  errorAccion,
  onEditar,
  onAnular,
  onGuardarEdicion,
  onCancelar,
  onConfirmarAnular,
}) {
  if (activa && tipoAccion === 'editar') {
    return (
      <TarjetaEdicion item={item} guardando={guardando} error={errorAccion} onGuardar={onGuardarEdicion} onCancelar={onCancelar} />
    )
  }

  if (activa && tipoAccion === 'anular') {
    return (
      <TarjetaConfirmarAnular
        item={item}
        fecha={fecha}
        guardando={guardando}
        error={errorAccion}
        onCancelar={onCancelar}
        onConfirmar={onConfirmarAnular}
      />
    )
  }

  return (
    <article className="tarjeta-item-sesion tarjeta">
      <div className="tarjeta-item-sesion-encabezado">
        <span className="tarjeta-item-sesion-caravana">{item.caravana}</span>
        <span className="tarjeta-item-sesion-peso">{formatearPeso(item.peso)}</span>
      </div>

      <dl className="tarjeta-item-sesion-datos">
        <div className="tarjeta-item-sesion-dato">
          <dt>Raza</dt>
          <dd>{item.razaDescripcion}</dd>
        </div>
        <div className="tarjeta-item-sesion-dato">
          <dt>Peso anterior</dt>
          <dd>
            <ValorPesoAnterior
              pesoAnterior={item.pesoAnterior}
              pesoAnteriorEsIngreso={item.pesoAnteriorEsIngreso}
              fechaPesoAnterior={item.fechaPesoAnterior}
            />
          </dd>
        </div>
        <div className="tarjeta-item-sesion-dato">
          <dt>GMD</dt>
          <dd>
            <ValorGmd gmd={item.gmd} />
          </dd>
        </div>
        <div className="tarjeta-item-sesion-dato">
          <dt>Responsable</dt>
          <dd>{item.responsableNombre || 'Sin datos'}</dd>
        </div>
        <div className="tarjeta-item-sesion-dato tarjeta-item-sesion-dato--ancho">
          <dt>Observación</dt>
          <dd>{item.observaciones || 'Sin observaciones'}</dd>
        </div>
      </dl>

      <div className="tarjeta-item-sesion-acciones">
        <button
          type="button"
          className="boton-secundario"
          onClick={onEditar}
          disabled={deshabilitada}
        >
          <Pencil aria-hidden="true" size={16} />
          Editar
        </button>
        <button type="button" className="boton-peligro" onClick={onAnular} disabled={deshabilitada}>
          <Ban aria-hidden="true" size={16} />
          Anular
        </button>
      </div>
    </article>
  )
}

/** Confirmación de anulación de la tarjeta: pide el motivo (chips + texto) antes de anular. */
function TarjetaConfirmarAnular({ item, fecha, guardando, error, onCancelar, onConfirmar }) {
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
    <article className="tarjeta-item-sesion tarjeta">
      <p>
        ¿Anular el pesaje de {item.caravana} del {fecha}? El pesaje deja de contar en reportes y se conserva en
        Anulados.
      </p>
      <SelectorMotivoAnulacion
        id={`tarjeta-anular-motivo-${item.pesaId}`}
        motivo={motivo}
        onCambiarMotivo={setMotivo}
        disabled={guardando}
        error={errorLocal || error}
      />
      <div className="tarjeta-item-sesion-acciones">
        <button type="button" className="boton-secundario" onClick={onCancelar} disabled={guardando}>
          Cancelar
        </button>
        <button type="button" className="boton-peligro" onClick={manejarConfirmar} disabled={guardando}>
          <Ban aria-hidden="true" size={16} />
          {guardando ? 'Anulando...' : 'Anular'}
        </button>
      </div>
    </article>
  )
}

/** Formulario de edición de la tarjeta: solo peso y observación son editables. */
function TarjetaEdicion({ item, guardando, error, onGuardar, onCancelar }) {
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
    <article className="tarjeta-item-sesion tarjeta">
      <div className="tarjeta-item-sesion-encabezado">
        <span className="tarjeta-item-sesion-caravana">{item.caravana}</span>
      </div>

      <div className="campo">
        <label htmlFor={`tarjeta-edicion-peso-${item.pesaId}`}>Peso (kg)</label>
        <input
          id={`tarjeta-edicion-peso-${item.pesaId}`}
          type="text"
          inputMode="decimal"
          autoFocus
          value={peso}
          onChange={(evento) => setPeso(evento.target.value)}
          disabled={guardando}
          aria-invalid={Boolean(errorLocal)}
        />
        {errorLocal && (
          <p className="campo-error" role="alert">
            {errorLocal}
          </p>
        )}
      </div>

      <div className="campo">
        <label htmlFor={`tarjeta-edicion-observacion-${item.pesaId}`}>Observación</label>
        <input
          id={`tarjeta-edicion-observacion-${item.pesaId}`}
          type="text"
          value={observaciones}
          onChange={(evento) => setObservaciones(evento.target.value)}
          disabled={guardando}
        />
      </div>

      {error && (
        <p className="campo-error" role="alert">
          {error}
        </p>
      )}

      <div className="tarjeta-item-sesion-acciones">
        <button type="button" className="boton-secundario" onClick={onCancelar} disabled={guardando}>
          Cancelar
        </button>
        <button type="button" className="boton-primario" onClick={manejarGuardar} disabled={guardando}>
          {guardando ? 'Guardando...' : 'Guardar'}
        </button>
      </div>
    </article>
  )
}
