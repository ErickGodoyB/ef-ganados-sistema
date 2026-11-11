/**
 * Vista "Registrar salida" dentro del mismo modal de detalle del animal
 * (ver ModalDetalleAnimal.jsx; nunca un modal aparte): fecha (hoy por
 * defecto; no futura; no anterior al ingreso ni al último pesaje activo
 * del animal, que llega en fechaUltimoPesaje del resumen), motivo (Venta/
 * Muerte/Otro), nota (obligatoria si el motivo es Otro) y, solo con
 * motivo Venta, un comprador opcional (con alta rápida de un cliente
 * nuevo, ver AltaRapidaCliente.jsx). PUT /api/animales/{id}/salida; las
 * reglas del cliente reflejan las de AnimalService en el backend, para
 * no hacer esperar un error del servidor por algo que ya se podía avisar
 * acá.
 */

import { useRef, useState } from 'react'
import { ErrorHttp, peticionProtegida } from '../../api/cliente'
import { formatearFecha } from '../../utilidades/formato'
import AltaRapidaCliente from './AltaRapidaCliente'
import { MOTIVOS_SALIDA } from './tiposSalida'
import { usePersonasComprador } from './usePersonasComprador'
import './FormularioAnimal.css'

/** Fecha de hoy en formato aaaa-mm-dd, en hora local (evita que el huso corra la fecha un día). */
function obtenerFechaHoyIso() {
  const ahora = new Date()
  const anio = ahora.getFullYear()
  const mes = String(ahora.getMonth() + 1).padStart(2, '0')
  const dia = String(ahora.getDate()).padStart(2, '0')
  return `${anio}-${mes}-${dia}`
}

export default function FormularioSalidaAnimal({ animal, alGuardar, alCancelar }) {
  const { personas: personasDelServidor, cargandoPersonas, errorPersonas } = usePersonasComprador()

  // Copia propia (no la del hook), porque la alta rápida de cliente agrega
  // una opción nueva sin pedirle de nuevo todo al backend (mismo criterio
  // que razas/subGrupos en FormularioAnimal.jsx).
  const [personasPrevias, setPersonasPrevias] = useState(personasDelServidor)
  const [personas, setPersonas] = useState(personasDelServidor)
  if (personasPrevias !== personasDelServidor) {
    setPersonasPrevias(personasDelServidor)
    setPersonas(personasDelServidor)
  }

  const hoy = obtenerFechaHoyIso()
  // La fecha de salida no puede quedar antes del ingreso ni del último
  // pesaje activo del animal (ver AnimalService.registrarSalida): el
  // límite mínimo real es el más tardío de los dos.
  const fechaMinima =
    animal.fechaUltimoPesaje && animal.fechaUltimoPesaje > animal.aniFechaIngreso
      ? animal.fechaUltimoPesaje
      : animal.aniFechaIngreso

  const [fecha, setFecha] = useState(hoy)
  const [motivo, setMotivo] = useState('')
  const [nota, setNota] = useState('')
  const [compradorId, setCompradorId] = useState('')
  const [errores, setErrores] = useState({})
  const [errorGeneral, setErrorGeneral] = useState('')
  const [guardando, setGuardando] = useState(false)

  const refFecha = useRef(null)
  const refMotivo = useRef(null)
  const refNota = useRef(null)
  const refComprador = useRef(null)

  const camposEnOrden = [
    ['fecha', refFecha],
    ['motivo', refMotivo],
    ['nota', refNota],
    ['comprador', refComprador],
  ]

  function validar() {
    const encontrados = {}
    if (!fecha) {
      encontrados.fecha = 'Ingresá la fecha de salida'
    } else if (fecha > hoy) {
      encontrados.fecha = 'La fecha de salida no puede ser futura'
    } else if (fecha < fechaMinima) {
      encontrados.fecha = `La fecha de salida no puede ser anterior al ${formatearFecha(fechaMinima)}`
    }
    if (!motivo) {
      encontrados.motivo = 'Elegí un motivo'
    }
    if (motivo === 'OTRO' && !nota.trim()) {
      encontrados.nota = 'Ingresá la nota'
    }
    return encontrados
  }

  function enfocarPrimerError(encontrados) {
    const primero = camposEnOrden.find(([clave]) => encontrados[clave])
    primero?.[1].current?.focus()
  }

  /** Si se cambia a un motivo que no sea Venta, un comprador ya elegido deja de tener sentido. */
  function alCambiarMotivo(valor) {
    setMotivo(valor)
    if (valor !== 'VENTA') {
      setCompradorId('')
    }
  }

  async function manejarEnviar(evento) {
    evento.preventDefault()
    const encontrados = validar()
    if (Object.keys(encontrados).length > 0) {
      setErrores(encontrados)
      enfocarPrimerError(encontrados)
      return
    }

    const cuerpo = {
      fecha,
      motivo,
      nota: nota.trim() || null,
      compradorId: motivo === 'VENTA' && compradorId ? Number(compradorId) : null,
    }

    setErrores({})
    setGuardando(true)
    setErrorGeneral('')
    try {
      const actualizado = await peticionProtegida(`/api/animales/${animal.aniId}/salida`, {
        method: 'PUT',
        body: JSON.stringify(cuerpo),
      })
      alGuardar(actualizado)
    } catch (err) {
      // "CI"/"RUC"/"teléfono"/"correo" no aplican acá (ese es el enrutamiento
      // de ModalFormularioPersona): el 400/404/409 de este endpoint siempre
      // habla de fecha, motivo, nota o comprador (ver AnimalService.registrarSalida).
      if (!(err instanceof ErrorHttp)) {
        setErrorGeneral('No se pudo conectar con el servidor.')
      } else if (err.message.includes('fecha')) {
        setErrores((actual) => ({ ...actual, fecha: err.message }))
      } else if (err.message.includes('motivo')) {
        setErrores((actual) => ({ ...actual, motivo: err.message }))
      } else if (err.message.includes('nota')) {
        setErrores((actual) => ({ ...actual, nota: err.message }))
      } else if (err.message.includes('comprador') || err.message.includes('Persona')) {
        setErrores((actual) => ({ ...actual, comprador: err.message }))
      } else {
        setErrorGeneral(err.message || 'No se pudo registrar la salida.')
      }
    } finally {
      setGuardando(false)
    }
  }

  /** El cliente recién creado por alta rápida se agrega a las opciones, queda seleccionado, y el foco vuelve al select. */
  function alCrearCliente(clienteCreado) {
    setPersonas((actual) => [...actual, clienteCreado])
    setCompradorId(String(clienteCreado.perId))
    refComprador.current?.focus()
  }

  return (
    <form className="formulario-animal" onSubmit={manejarEnviar} noValidate>
      <div className="campo">
        <label htmlFor="salida-fecha">Fecha</label>
        <input
          id="salida-fecha"
          ref={refFecha}
          type="date"
          value={fecha}
          min={fechaMinima}
          max={hoy}
          onChange={(evento) => setFecha(evento.target.value)}
          aria-invalid={Boolean(errores.fecha)}
          disabled={guardando}
          autoFocus
        />
        <p className="campo-ayuda">No puede ser anterior al {formatearFecha(fechaMinima)}.</p>
        {errores.fecha && (
          <p className="campo-error" role="alert">
            {errores.fecha}
          </p>
        )}
      </div>

      <div className="campo">
        <label htmlFor="salida-motivo">Motivo</label>
        <select
          id="salida-motivo"
          ref={refMotivo}
          value={motivo}
          onChange={(evento) => alCambiarMotivo(evento.target.value)}
          aria-invalid={Boolean(errores.motivo)}
          disabled={guardando}
        >
          <option value="">Elegí un motivo</option>
          {MOTIVOS_SALIDA.map((opcion) => (
            <option key={opcion.valor} value={opcion.valor}>
              {opcion.etiqueta}
            </option>
          ))}
        </select>
        {errores.motivo && (
          <p className="campo-error" role="alert">
            {errores.motivo}
          </p>
        )}
      </div>

      <div className="campo">
        <label htmlFor="salida-nota">Nota{motivo === 'OTRO' ? '' : ' (opcional)'}</label>
        <textarea
          id="salida-nota"
          ref={refNota}
          rows={3}
          value={nota}
          onChange={(evento) => setNota(evento.target.value)}
          aria-invalid={Boolean(errores.nota)}
          disabled={guardando}
        />
        {errores.nota && (
          <p className="campo-error" role="alert">
            {errores.nota}
          </p>
        )}
      </div>

      {motivo === 'VENTA' && (
        <div className="campo">
          <label htmlFor="salida-comprador">Comprador (opcional)</label>
          <div className="campo-con-alta-rapida">
            <select
              id="salida-comprador"
              ref={refComprador}
              value={compradorId}
              onChange={(evento) => setCompradorId(evento.target.value)}
              aria-invalid={Boolean(errores.comprador)}
              disabled={guardando || cargandoPersonas}
            >
              <option value="">{cargandoPersonas ? 'Cargando personas…' : 'Sin comprador'}</option>
              {!cargandoPersonas &&
                personas.map((persona) => (
                  <option key={persona.perId} value={persona.perId}>
                    {persona.perNombre} {persona.perApellido ?? ''}
                  </option>
                ))}
            </select>
            <AltaRapidaCliente onCreado={alCrearCliente} />
          </div>
          {errorPersonas && <p className="campo-ayuda">{errorPersonas}</p>}
          {errores.comprador && (
            <p className="campo-error" role="alert">
              {errores.comprador}
            </p>
          )}
        </div>
      )}

      {errorGeneral && (
        <p className="formulario-animal-error-general" role="alert">
          {errorGeneral}
        </p>
      )}

      <div className="formulario-animal-acciones">
        <button type="button" className="boton-secundario" onClick={alCancelar} disabled={guardando}>
          Cancelar
        </button>
        <button type="submit" className="boton-primario" disabled={guardando}>
          {guardando ? 'Guardando...' : 'Registrar salida'}
        </button>
      </div>
    </form>
  )
}
