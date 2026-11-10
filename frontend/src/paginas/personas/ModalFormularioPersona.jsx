/**
 * Modal de alta o edición de una persona: nombre, apellido, tipo, CI, RUC,
 * teléfono, correo y dirección. Si "persona" viene con datos, edita esa
 * persona (PUT /api/personas/{id}); si no, crea una nueva (POST
 * /api/personas). Los 409 de CI/RUC duplicados del servidor se detectan
 * por el texto del mensaje ("la CI"/"el RUC", ver PersonaService en el
 * backend) y se muestran bajo el campo correspondiente; cualquier otro
 * error se muestra como error general.
 */

import { useRef, useState } from 'react'
import { ErrorHttp, peticionProtegida } from '../../api/cliente'
import Modal from '../../componentes/Modal'
import { TIPOS_PERSONA } from './tiposPersona'
import '../Personas.css'

const FORMATO_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function ModalFormularioPersona({ persona, onCerrar, onGuardado, refDisparador }) {
  const esEdicion = Boolean(persona)
  const [nombre, setNombre] = useState(persona?.perNombre ?? '')
  const [apellido, setApellido] = useState(persona?.perApellido ?? '')
  const [tipo, setTipo] = useState(persona?.perTipo ?? '')
  const [ci, setCi] = useState(persona?.perCi ?? '')
  const [ruc, setRuc] = useState(persona?.perRuc ?? '')
  const [telefono, setTelefono] = useState(persona?.perTelefono ?? '')
  const [correo, setCorreo] = useState(persona?.perCorreo ?? '')
  const [direccion, setDireccion] = useState(persona?.perDireccion ?? '')
  const [errores, setErrores] = useState({})
  const [errorGeneral, setErrorGeneral] = useState('')
  const [guardando, setGuardando] = useState(false)

  const refNombre = useRef(null)
  const refTipo = useRef(null)
  const refCi = useRef(null)
  const refRuc = useRef(null)
  const refCorreo = useRef(null)

  const camposEnOrden = [
    ['nombre', refNombre],
    ['tipo', refTipo],
    ['correo', refCorreo],
  ]

  function validar() {
    const encontrados = {}
    if (!nombre.trim()) {
      encontrados.nombre = 'Ingresá el nombre'
    }
    if (!tipo) {
      encontrados.tipo = 'Elegí un tipo'
    }
    if (correo.trim() && !FORMATO_CORREO.test(correo.trim())) {
      encontrados.correo = 'El correo no tiene un formato válido'
    }
    return encontrados
  }

  function enfocarPrimerError(encontrados) {
    const primero = camposEnOrden.find(([clave]) => encontrados[clave])
    primero?.[1].current?.focus()
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
      perNombre: nombre.trim(),
      perApellido: apellido.trim(),
      perTipo: tipo,
      perCi: ci.trim(),
      perRuc: ruc.trim(),
      perTelefono: telefono.trim(),
      perCorreo: correo.trim(),
      perDireccion: direccion.trim(),
    }

    setErrores({})
    setGuardando(true)
    setErrorGeneral('')
    try {
      const guardada = esEdicion
        ? await peticionProtegida(`/api/personas/${persona.perId}`, { method: 'PUT', body: JSON.stringify(cuerpo) })
        : await peticionProtegida('/api/personas', { method: 'POST', body: JSON.stringify(cuerpo) })
      onGuardado(guardada, esEdicion)
    } catch (err) {
      // Sin foco automático acá a propósito: en este punto el campo todavía
      // está disabled (guardando sigue en true hasta el finally de abajo),
      // así que un enfoque síncrono no tendría efecto; alcanza con que el
      // mensaje quede asociado al campo correcto (role="alert" ya lo
      // anuncia solo).
      if (err instanceof ErrorHttp && err.estado === 409 && err.message.includes('la CI')) {
        setErrores((actual) => ({ ...actual, ci: err.message }))
      } else if (err instanceof ErrorHttp && err.estado === 409 && err.message.includes('el RUC')) {
        setErrores((actual) => ({ ...actual, ruc: err.message }))
      } else if (err instanceof ErrorHttp) {
        setErrorGeneral(err.message || 'No se pudo guardar la persona.')
      } else {
        setErrorGeneral('No se pudo conectar con el servidor.')
      }
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Modal titulo={esEdicion ? 'Editar persona' : 'Nueva persona'} onCerrar={onCerrar} refDisparador={refDisparador}>
      <form className="formulario-persona" onSubmit={manejarEnviar} noValidate>
        <div className="formulario-persona-fila">
          <div className="campo">
            <label htmlFor="persona-nombre">Nombre</label>
            <input
              id="persona-nombre"
              ref={refNombre}
              type="text"
              value={nombre}
              onChange={(evento) => setNombre(evento.target.value)}
              aria-invalid={Boolean(errores.nombre)}
              disabled={guardando}
              autoFocus
            />
            {errores.nombre && (
              <p className="campo-error" role="alert">
                {errores.nombre}
              </p>
            )}
          </div>

          <div className="campo">
            <label htmlFor="persona-apellido">Apellido</label>
            <input
              id="persona-apellido"
              type="text"
              value={apellido}
              onChange={(evento) => setApellido(evento.target.value)}
              disabled={guardando}
            />
          </div>
        </div>

        <div className="campo">
          <label htmlFor="persona-tipo">Tipo</label>
          <select
            id="persona-tipo"
            ref={refTipo}
            value={tipo}
            onChange={(evento) => setTipo(evento.target.value)}
            aria-invalid={Boolean(errores.tipo)}
            disabled={guardando}
          >
            <option value="">Elegí un tipo</option>
            {TIPOS_PERSONA.map((opcion) => (
              <option key={opcion.valor} value={opcion.valor}>
                {opcion.etiqueta}
              </option>
            ))}
          </select>
          {errores.tipo && (
            <p className="campo-error" role="alert">
              {errores.tipo}
            </p>
          )}
        </div>

        <div className="formulario-persona-fila">
          <div className="campo">
            <label htmlFor="persona-ci">CI</label>
            <input
              id="persona-ci"
              ref={refCi}
              type="text"
              value={ci}
              onChange={(evento) => setCi(evento.target.value)}
              aria-invalid={Boolean(errores.ci)}
              disabled={guardando}
            />
            {errores.ci && (
              <p className="campo-error" role="alert">
                {errores.ci}
              </p>
            )}
          </div>

          <div className="campo">
            <label htmlFor="persona-ruc">RUC</label>
            <input
              id="persona-ruc"
              ref={refRuc}
              type="text"
              value={ruc}
              onChange={(evento) => setRuc(evento.target.value)}
              aria-invalid={Boolean(errores.ruc)}
              disabled={guardando}
            />
            {errores.ruc && (
              <p className="campo-error" role="alert">
                {errores.ruc}
              </p>
            )}
          </div>
        </div>

        <div className="formulario-persona-fila">
          <div className="campo">
            <label htmlFor="persona-telefono">Teléfono</label>
            <input
              id="persona-telefono"
              type="text"
              value={telefono}
              onChange={(evento) => setTelefono(evento.target.value)}
              disabled={guardando}
            />
          </div>

          <div className="campo">
            <label htmlFor="persona-correo">Correo</label>
            <input
              id="persona-correo"
              ref={refCorreo}
              type="text"
              value={correo}
              onChange={(evento) => setCorreo(evento.target.value)}
              aria-invalid={Boolean(errores.correo)}
              disabled={guardando}
            />
            {errores.correo && (
              <p className="campo-error" role="alert">
                {errores.correo}
              </p>
            )}
          </div>
        </div>

        <div className="campo">
          <label htmlFor="persona-direccion">Dirección</label>
          <input
            id="persona-direccion"
            type="text"
            value={direccion}
            onChange={(evento) => setDireccion(evento.target.value)}
            disabled={guardando}
          />
        </div>

        {errorGeneral && (
          <p className="campo-error" role="alert">
            {errorGeneral}
          </p>
        )}

        <div className="formulario-persona-acciones">
          <button type="button" className="boton-secundario" onClick={onCerrar} disabled={guardando}>
            Cancelar
          </button>
          <button type="submit" className="boton-primario" disabled={guardando}>
            {guardando ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
