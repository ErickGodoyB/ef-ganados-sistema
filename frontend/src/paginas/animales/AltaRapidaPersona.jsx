/**
 * Alta rápida de una persona nueva de un tipo dado (hoy CLIENTE, para el
 * comprador de una salida, y PROVEEDOR, para el proveedor de un animal),
 * sin salir del formulario en el que se está: un botón "+" junto al select
 * correspondiente despliega un mini formulario (en el mismo formulario, nunca
 * en un modal aparte) con nombre, apellido, teléfono y CI (todos salvo
 * nombre, opcionales). Mismo criterio que AltaRapidaRaza/AltaRapidaLote;
 * el teléfono filtra lo que se escribe o se pega igual que en
 * ModalFormularioPersona, para no poder escribir algo que el servidor
 * vaya a rechazar por formato.
 */

import { Plus } from 'lucide-react'
import { useRef, useState } from 'react'
import { ErrorHttp, peticionProtegida } from '../../api/cliente'
import './AltaRapida.css'

/** Quita del texto cualquier carácter que un teléfono no pueda tener (ver PersonaService en el backend). */
function filtrarTelefono(texto) {
  return texto.replace(/[^0-9+\-() ]/g, '')
}

/**
 * @param {object} props
 * @param {string} props.tipo Valor de perTipo con el que se crea la persona ('CLIENTE', 'PROVEEDOR').
 * @param {string} props.etiqueta Cómo se nombra a ese tipo en los textos, en minúscula y singular ('cliente', 'proveedor');
 *   también arma los ids de los campos, para que dos altas rápidas en la misma pantalla no choquen.
 * @param {(persona: object) => void} props.onCreado Recibe la persona creada, tal como la devuelve el servidor.
 */
export default function AltaRapidaPersona({ tipo, etiqueta, onCreado }) {
  const [abierto, setAbierto] = useState(false)
  const [nombre, setNombre] = useState('')
  const [apellido, setApellido] = useState('')
  const [telefono, setTelefono] = useState('')
  const [ci, setCi] = useState('')
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)
  const refBotonMas = useRef(null)

  function abrir() {
    setAbierto(true)
    setNombre('')
    setApellido('')
    setTelefono('')
    setCi('')
    setError('')
  }

  function cerrar() {
    setAbierto(false)
    refBotonMas.current?.focus()
  }

  function manejarTeclaEnContenedor(evento) {
    if (evento.key === 'Escape') {
      evento.stopPropagation()
      cerrar()
    }
  }

  async function manejarGuardar(evento) {
    evento.preventDefault()

    const nombreNormalizado = nombre.trim()
    if (!nombreNormalizado) {
      setError(`Ingresá el nombre del ${etiqueta}`)
      return
    }

    setGuardando(true)
    setError('')
    try {
      const personaCreada = await peticionProtegida('/api/personas', {
        method: 'POST',
        body: JSON.stringify({
          perNombre: nombreNormalizado,
          perApellido: apellido.trim() || null,
          perTelefono: telefono.trim() || null,
          perCi: ci.trim() || null,
          perTipo: tipo,
        }),
      })
      onCreado(personaCreada)
      setAbierto(false)
    } catch (err) {
      setError(err instanceof ErrorHttp ? err.message : 'No se pudo conectar con el servidor.')
    } finally {
      setGuardando(false)
    }
  }

  if (!abierto) {
    return (
      <button
        type="button"
        ref={refBotonMas}
        className="alta-rapida-boton"
        aria-label={`Agregar ${etiqueta} nuevo`}
        onClick={abrir}
      >
        <Plus aria-hidden="true" size={20} />
      </button>
    )
  }

  return (
    <div className="alta-rapida-mini-formulario" onKeyDown={manejarTeclaEnContenedor}>
      <div className="campo">
        <label htmlFor={`alta-rapida-${etiqueta}-nombre`}>Nombre</label>
        <input
          id={`alta-rapida-${etiqueta}-nombre`}
          type="text"
          value={nombre}
          onChange={(evento) => setNombre(evento.target.value)}
          disabled={guardando}
          autoFocus
        />
      </div>

      <div className="campo">
        <label htmlFor={`alta-rapida-${etiqueta}-apellido`}>Apellido (opcional)</label>
        <input
          id={`alta-rapida-${etiqueta}-apellido`}
          type="text"
          value={apellido}
          onChange={(evento) => setApellido(evento.target.value)}
          disabled={guardando}
        />
      </div>

      <div className="campo">
        <label htmlFor={`alta-rapida-${etiqueta}-telefono`}>Teléfono (opcional)</label>
        <input
          id={`alta-rapida-${etiqueta}-telefono`}
          type="text"
          inputMode="tel"
          value={telefono}
          onChange={(evento) => setTelefono(filtrarTelefono(evento.target.value))}
          disabled={guardando}
        />
      </div>

      <div className="campo">
        <label htmlFor={`alta-rapida-${etiqueta}-ci`}>CI (opcional)</label>
        <input
          id={`alta-rapida-${etiqueta}-ci`}
          type="text"
          value={ci}
          onChange={(evento) => setCi(evento.target.value)}
          disabled={guardando}
        />
      </div>

      {error && (
        <p className="campo-error" role="alert">
          {error}
        </p>
      )}

      <div className="alta-rapida-acciones">
        <button type="button" className="boton-secundario" onClick={cerrar} disabled={guardando}>
          Cancelar
        </button>
        <button type="button" className="boton-primario" onClick={manejarGuardar} disabled={guardando}>
          {guardando ? 'Guardando...' : 'Guardar'}
        </button>
      </div>
    </div>
  )
}
