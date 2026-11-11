/**
 * Modal de alta o edición de una persona: nombre, apellido, tipo, CI, RUC,
 * teléfono, correo y dirección. Si "persona" viene con datos, edita esa
 * persona (PUT /api/personas/{id}); si no, crea una nueva (POST
 * /api/personas). Las validaciones de formato de teléfono/CI/RUC/correo
 * reflejan exactamente las de PersonaService en el backend (ver ese
 * Javadoc), para que el error del cliente y el del servidor digan lo
 * mismo. Cualquier 400/409 del servidor se enruta al campo que
 * corresponde buscando "CI"/"RUC"/"teléfono"/"correo" en el propio texto
 * del mensaje (todos los mensajes de esos campos, sean 400 de formato o
 * 409 de duplicado, mencionan esa palabra); lo que no se reconoce se
 * muestra como error general.
 */

import { useRef, useState } from 'react'
import { ErrorHttp, peticionProtegida } from '../../api/cliente'
import Modal from '../../componentes/Modal'
import { TIPOS_PERSONA } from './tiposPersona'
import '../Personas.css'

const FORMATO_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Teléfono: solo dígitos, espacios y + - ( ) (admite "+595", guiones y
// paréntesis); hasta 20 caracteres; al menos 6 dígitos.
const FORMATO_TELEFONO = /^[0-9+\-() ]+$/
const LARGO_MAXIMO_TELEFONO = 20
const MINIMO_DIGITOS_TELEFONO = 6

// CI/RUC: letras (de cualquier idioma), números, puntos, guiones y
// espacios (ej. "80.123.456-7"); hasta 20 caracteres.
const FORMATO_DOCUMENTO = /^[\p{L}\p{N}.\- ]+$/u
const LARGO_MAXIMO_DOCUMENTO = 20

/** Quita del texto cualquier carácter que un teléfono no pueda tener, para filtrar lo que se escribe o se pega. */
function filtrarTelefono(texto) {
  return texto.replace(/[^0-9+\-() ]/g, '')
}

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
  const refTelefono = useRef(null)
  const refCorreo = useRef(null)

  const camposEnOrden = [
    ['nombre', refNombre],
    ['tipo', refTipo],
    ['ci', refCi],
    ['ruc', refRuc],
    ['telefono', refTelefono],
    ['correo', refCorreo],
  ]

  /** Valida el formato de un documento (CI o RUC); null si no hay error. */
  function errorDeDocumento(valor, etiqueta) {
    if (!valor.trim()) {
      return null
    }
    const valorRecortado = valor.trim()
    if (!FORMATO_DOCUMENTO.test(valorRecortado)) {
      return `${etiqueta} solo puede tener letras, números, puntos, guiones y espacios`
    }
    if (valorRecortado.length > LARGO_MAXIMO_DOCUMENTO) {
      return `${etiqueta} no puede tener más de ${LARGO_MAXIMO_DOCUMENTO} caracteres`
    }
    return null
  }

  function validar() {
    const encontrados = {}
    if (!nombre.trim()) {
      encontrados.nombre = 'Ingresá el nombre'
    }
    if (!tipo) {
      encontrados.tipo = 'Elegí un tipo'
    }

    const errorCi = errorDeDocumento(ci, 'La CI')
    if (errorCi) {
      encontrados.ci = errorCi
    }
    const errorRuc = errorDeDocumento(ruc, 'El RUC')
    if (errorRuc) {
      encontrados.ruc = errorRuc
    }

    const telefonoRecortado = telefono.trim()
    if (telefonoRecortado) {
      // El formato ya queda garantizado por el filtro de onChange (ver
      // filtrarTelefono), salvo que "persona" trajera un valor inválido de
      // antes (datos cargados sin pasar por este formulario); por eso se
      // revalida igual, no solo el largo/cantidad de dígitos.
      if (!FORMATO_TELEFONO.test(telefonoRecortado)) {
        encontrados.telefono = 'El teléfono solo puede tener números, espacios y los símbolos + - ( )'
      } else if (telefonoRecortado.length > LARGO_MAXIMO_TELEFONO) {
        encontrados.telefono = `El teléfono no puede tener más de ${LARGO_MAXIMO_TELEFONO} caracteres`
      } else if (telefonoRecortado.replace(/[^0-9]/g, '').length < MINIMO_DIGITOS_TELEFONO) {
        encontrados.telefono = `El teléfono debe tener al menos ${MINIMO_DIGITOS_TELEFONO} números`
      }
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
      // anuncia solo). "CI"/"RUC"/"teléfono"/"correo" alcanza para
      // reconocer el campo: tanto el 400 de formato como el 409 de
      // duplicado (para CI/RUC) mencionan esa palabra, y ningún mensaje de
      // otro campo la contiene.
      if (!(err instanceof ErrorHttp)) {
        setErrorGeneral('No se pudo conectar con el servidor.')
      } else if (err.message.includes('CI')) {
        setErrores((actual) => ({ ...actual, ci: err.message }))
      } else if (err.message.includes('RUC')) {
        setErrores((actual) => ({ ...actual, ruc: err.message }))
      } else if (err.message.includes('teléfono')) {
        setErrores((actual) => ({ ...actual, telefono: err.message }))
      } else if (err.message.includes('correo')) {
        setErrores((actual) => ({ ...actual, correo: err.message }))
      } else {
        setErrorGeneral(err.message || 'No se pudo guardar la persona.')
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
              ref={refTelefono}
              type="text"
              inputMode="tel"
              value={telefono}
              onChange={(evento) => setTelefono(filtrarTelefono(evento.target.value))}
              aria-invalid={Boolean(errores.telefono)}
              disabled={guardando}
            />
            {errores.telefono && (
              <p className="campo-error" role="alert">
                {errores.telefono}
              </p>
            )}
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
