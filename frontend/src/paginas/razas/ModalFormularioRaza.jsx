/**
 * Modal de alta o edición de una raza del catálogo: descripción y peso
 * objetivo de venta (kg, acepta coma o punto). Si "raza" viene con datos,
 * edita esa raza (PUT); si no, crea una nueva (POST).
 *
 * Al editar, si cambia el peso objetivo y la raza ya tiene animales, antes
 * de guardar se muestra un paso de confirmación ("paso" pasa a
 * 'confirmar-impacto'): ese cambio recalcula el apto para venta de todos
 * esos animales (peso actual >= peso objetivo, ver CLAUDE.md), así que
 * conviene que la persona lo sepa antes de aplicarlo. Cambiar solo la
 * descripción, o editar una raza sin animales, no necesita ese paso.
 */

import { useEffect, useRef, useState } from 'react'
import { ErrorHttp, peticionProtegida } from '../../api/cliente'
import Modal from '../../componentes/Modal'
import { parsearPeso, pesoEsValido } from '../../utilidades/peso'
import '../Razas.css'

export default function ModalFormularioRaza({ raza, onCerrar, onGuardado, refDisparador }) {
  const esEdicion = Boolean(raza)

  const [descripcion, setDescripcion] = useState(raza?.rzDescripcion ?? '')
  const [pesoObjetivo, setPesoObjetivo] = useState(raza ? String(raza.rzPesoObjetivoVenta) : '')
  const [errores, setErrores] = useState({})
  const [errorGeneral, setErrorGeneral] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [paso, setPaso] = useState('formulario') // 'formulario' | 'confirmar-impacto'
  // Valores ya validados en el cliente, a la espera de que se confirme el
  // paso de impacto (ver el Javadoc de arriba); separados de los estados
  // del formulario para no tener que volver a parsear/recortar al confirmar.
  const [pendiente, setPendiente] = useState(null)

  const refDescripcion = useRef(null)
  const refPeso = useRef(null)
  const refBotonVolver = useRef(null)

  // Al entrar al paso de confirmación, el foco pasa a "Volver" (la opción
  // que no aplica el cambio todavía), no a "Confirmar".
  useEffect(() => {
    if (paso === 'confirmar-impacto') {
      refBotonVolver.current?.focus()
    }
  }, [paso])

  function validar() {
    const encontrados = {}
    if (!descripcion.trim()) {
      encontrados.descripcion = 'Ingresá la descripción de la raza'
    }
    if (!pesoObjetivo.trim()) {
      encontrados.pesoObjetivo = 'Ingresá el peso objetivo de venta'
    } else {
      const peso = parsearPeso(pesoObjetivo)
      if (Number.isNaN(peso)) {
        encontrados.pesoObjetivo = 'Ingresá un número válido'
      } else if (!pesoEsValido(peso)) {
        encontrados.pesoObjetivo = 'El peso debe ser mayor a 0 y hasta 2000 kg'
      }
    }
    return encontrados
  }

  async function guardarEnServidor(descripcionFinal, pesoFinal) {
    setGuardando(true)
    setErrorGeneral('')
    try {
      const cuerpo = { rzDescripcion: descripcionFinal, rzPesoObjetivoVenta: pesoFinal }
      const guardada = esEdicion
        ? await peticionProtegida(`/api/razas/${raza.rzId}`, { method: 'PUT', body: JSON.stringify(cuerpo) })
        : await peticionProtegida('/api/razas', { method: 'POST', body: JSON.stringify(cuerpo) })
      onGuardado(guardada, esEdicion)
    } catch (err) {
      // Si el error llega durante la confirmación de impacto, se vuelve al
      // formulario para mostrarlo (ahí están los campos, no en ese paso).
      setPaso('formulario')
      if (err instanceof ErrorHttp && err.estado === 409) {
        setErrores((actual) => ({ ...actual, descripcion: err.message }))
      } else if (err instanceof ErrorHttp) {
        setErrorGeneral(err.message || 'No se pudo guardar la raza.')
      } else {
        setErrorGeneral('No se pudo conectar con el servidor.')
      }
    } finally {
      setGuardando(false)
    }
  }

  function manejarEnviar(evento) {
    evento.preventDefault()
    const encontrados = validar()
    if (Object.keys(encontrados).length > 0) {
      setErrores(encontrados)
      if (encontrados.descripcion) {
        refDescripcion.current?.focus()
      } else {
        refPeso.current?.focus()
      }
      return
    }

    setErrores({})
    const descripcionFinal = descripcion.trim()
    const pesoFinal = parsearPeso(pesoObjetivo)

    if (esEdicion && raza.cantidadAnimales > 0 && pesoFinal !== raza.rzPesoObjetivoVenta) {
      setPendiente({ descripcion: descripcionFinal, peso: pesoFinal })
      setPaso('confirmar-impacto')
      return
    }

    guardarEnServidor(descripcionFinal, pesoFinal)
  }

  function confirmarImpacto() {
    guardarEnServidor(pendiente.descripcion, pendiente.peso)
  }

  function volverAlFormulario() {
    setPaso('formulario')
  }

  function manejarCierre() {
    if (paso === 'confirmar-impacto') {
      volverAlFormulario()
      return
    }
    onCerrar()
  }

  const titulo = esEdicion ? 'Editar raza' : 'Nueva raza'

  return (
    <Modal titulo={titulo} onCerrar={manejarCierre} refDisparador={refDisparador}>
      {paso === 'formulario' && (
        <form className="formulario-raza" onSubmit={manejarEnviar} noValidate>
          <div className="campo">
            <label htmlFor="raza-descripcion">Descripción</label>
            <input
              id="raza-descripcion"
              ref={refDescripcion}
              type="text"
              value={descripcion}
              onChange={(evento) => setDescripcion(evento.target.value)}
              aria-invalid={Boolean(errores.descripcion)}
              disabled={guardando}
              autoFocus
            />
            {errores.descripcion && (
              <p className="campo-error" role="alert">
                {errores.descripcion}
              </p>
            )}
          </div>

          <div className="campo">
            <label htmlFor="raza-peso">Peso objetivo de venta (kg)</label>
            <input
              id="raza-peso"
              ref={refPeso}
              type="text"
              inputMode="decimal"
              value={pesoObjetivo}
              onChange={(evento) => setPesoObjetivo(evento.target.value)}
              aria-invalid={Boolean(errores.pesoObjetivo)}
              disabled={guardando}
            />
            {errores.pesoObjetivo && (
              <p className="campo-error" role="alert">
                {errores.pesoObjetivo}
              </p>
            )}
          </div>

          {errorGeneral && (
            <p className="campo-error" role="alert">
              {errorGeneral}
            </p>
          )}

          <div className="formulario-raza-acciones">
            <button type="button" className="boton-secundario" onClick={onCerrar} disabled={guardando}>
              Cancelar
            </button>
            <button type="submit" className="boton-primario" disabled={guardando}>
              {guardando ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      )}

      {paso === 'confirmar-impacto' && (
        <div className="formulario-raza-confirmar">
          <p>Este cambio afecta a {raza.cantidadAnimales} animales: su estado de apto para venta se recalculará.</p>
          {errorGeneral && (
            <p className="campo-error" role="alert">
              {errorGeneral}
            </p>
          )}
          <div className="formulario-raza-acciones">
            <button
              type="button"
              ref={refBotonVolver}
              className="boton-secundario"
              onClick={volverAlFormulario}
              disabled={guardando}
            >
              Volver
            </button>
            <button type="button" className="boton-primario" onClick={confirmarImpacto} disabled={guardando}>
              {guardando ? 'Guardando...' : 'Confirmar'}
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}
