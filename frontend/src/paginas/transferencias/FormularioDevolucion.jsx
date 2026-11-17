/**
 * Formulario para devolver una transferencia (POST
 * /api/transferencias/{id}/devolver): fecha, nota opcional y responsable.
 * La devolución lleva cada animal a su lote de origen original, pero solo a
 * los que siguen en el lote de destino y activos; el backend omite al
 * resto y devuelve cuántos fueron de cada tipo (ver "onDevuelta").
 *
 * La fecha no puede ser futura ni anterior a la de la transferencia que se
 * devuelve (el "min" del campo y la validación del cliente reflejan la
 * misma regla que el backend, para avisar antes de enviar). Los errores del
 * backend se muestran acá, sin cerrar nada, para poder corregir y reintentar.
 */

import { useRef, useState } from 'react'
import { ErrorHttp, peticionProtegida } from '../../api/cliente'
import { useAuth } from '../../auth/useAuth'
import { fechaHoyIso } from '../../utilidades/fechas'
import { formatearFecha } from '../../utilidades/formato'
import '../animales/FormularioAnimal.css'
import CampoResponsable from '../pesajes/CampoResponsable'
import { usePersonasResponsable } from '../pesajes/usePersonasResponsable'
import { LARGO_MAXIMO_NOTA } from './motivos'

export default function FormularioDevolucion({ transferencia, onDevuelta, onCancelar }) {
  const { personaId, personaNombre, errorYo } = useAuth()
  const { personas, cargandoPersonas, errorPersonas } = usePersonasResponsable(personaId)

  const [fecha, setFecha] = useState(() => fechaHoyIso())
  const [nota, setNota] = useState('')
  const [responsableElegido, setResponsableElegido] = useState(null)
  const [errores, setErrores] = useState({})
  const [errorEnvio, setErrorEnvio] = useState('')
  const [enviando, setEnviando] = useState(false)
  const refFecha = useRef(null)
  const refNota = useRef(null)

  const responsableId = responsableElegido ?? personaId

  function validar() {
    const encontrados = {}
    if (!fecha) {
      encontrados.fecha = 'Ingresá la fecha'
    } else if (fecha > fechaHoyIso()) {
      encontrados.fecha = 'La fecha no puede ser futura'
    } else if (fecha < transferencia.fecha) {
      encontrados.fecha = `La fecha no puede ser anterior a la de la transferencia original (${formatearFecha(transferencia.fecha)})`
    }
    if (nota.length > LARGO_MAXIMO_NOTA) {
      encontrados.nota = `La nota no puede superar los ${LARGO_MAXIMO_NOTA} caracteres`
    }
    if (responsableId == null) {
      encontrados.responsable = errorYo || 'No se encontró una persona asociada a tu usuario'
    }
    return encontrados
  }

  async function manejarEnviar(evento) {
    evento.preventDefault()
    const encontrados = validar()
    setErrores(encontrados)
    if (Object.keys(encontrados).length > 0) {
      ;[
        ['fecha', refFecha],
        ['nota', refNota],
      ]
        .find(([clave]) => encontrados[clave])?.[1]
        .current?.focus()
      return
    }

    setEnviando(true)
    setErrorEnvio('')
    try {
      const resultado = await peticionProtegida(`/api/transferencias/${transferencia.traId}/devolver`, {
        method: 'POST',
        body: JSON.stringify({ fecha, nota: nota.trim() || null, responsableId }),
      })
      onDevuelta(resultado)
    } catch (err) {
      setErrorEnvio(err instanceof ErrorHttp ? err.message : 'No se pudo conectar con el servidor.')
      setEnviando(false)
    }
  }

  return (
    <form className="formulario-devolucion" onSubmit={manejarEnviar} noValidate>
      <p className="formulario-devolucion-intro">
        Los animales que sigan en el lote de destino vuelven a su lote de origen; los demás se omiten.
      </p>

      <div className="campo">
        <label htmlFor="devolucion-fecha">Fecha</label>
        <input
          id="devolucion-fecha"
          ref={refFecha}
          type="date"
          value={fecha}
          min={transferencia.fecha}
          max={fechaHoyIso()}
          onChange={(evento) => setFecha(evento.target.value)}
          aria-invalid={Boolean(errores.fecha)}
          aria-describedby={errores.fecha ? 'devolucion-fecha-error' : undefined}
          disabled={enviando}
        />
        {errores.fecha && (
          <p id="devolucion-fecha-error" className="campo-error" role="alert">
            {errores.fecha}
          </p>
        )}
      </div>

      <div className="campo">
        <label htmlFor="devolucion-nota">Nota (opcional)</label>
        <textarea
          id="devolucion-nota"
          ref={refNota}
          rows={3}
          maxLength={LARGO_MAXIMO_NOTA}
          value={nota}
          onChange={(evento) => setNota(evento.target.value)}
          aria-invalid={Boolean(errores.nota)}
          aria-describedby={errores.nota ? 'devolucion-nota-error' : undefined}
          disabled={enviando}
        />
        {errores.nota && (
          <p id="devolucion-nota-error" className="campo-error" role="alert">
            {errores.nota}
          </p>
        )}
      </div>

      <div>
        <CampoResponsable
          id="devolucion-responsable"
          personas={personas}
          cargando={cargandoPersonas}
          error={errorPersonas}
          personaActualId={personaId}
          personaActualNombre={personaNombre}
          valor={responsableId}
          onCambiar={setResponsableElegido}
          disabled={enviando}
        />
        {errores.responsable && (
          <p className="campo-error" role="alert">
            {errores.responsable}
          </p>
        )}
      </div>

      {errorEnvio && (
        <p className="campo-error" role="alert">
          {errorEnvio}
        </p>
      )}

      <div className="formulario-devolucion-acciones">
        <button type="button" className="boton-secundario" onClick={onCancelar} disabled={enviando}>
          Cancelar
        </button>
        <button type="submit" className="boton-primario" disabled={enviando}>
          {enviando ? 'Devolviendo...' : 'Devolver transferencia'}
        </button>
      </div>
    </form>
  )
}
