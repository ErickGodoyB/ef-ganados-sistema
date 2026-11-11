/**
 * Alta rápida de un cliente nuevo (persona tipo CLIENTE), sin salir de la
 * vista "Registrar salida" del animal: un botón "+" junto al select de
 * Comprador despliega un mini formulario (en el mismo formulario, nunca
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

export default function AltaRapidaCliente({ onCreado }) {
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
      setError('Ingresá el nombre del cliente')
      return
    }

    setGuardando(true)
    setError('')
    try {
      const clienteCreado = await peticionProtegida('/api/personas', {
        method: 'POST',
        body: JSON.stringify({
          perNombre: nombreNormalizado,
          perApellido: apellido.trim() || null,
          perTelefono: telefono.trim() || null,
          perCi: ci.trim() || null,
          perTipo: 'CLIENTE',
        }),
      })
      onCreado(clienteCreado)
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
        aria-label="Agregar cliente nuevo"
        onClick={abrir}
      >
        <Plus aria-hidden="true" size={20} />
      </button>
    )
  }

  return (
    <div className="alta-rapida-mini-formulario" onKeyDown={manejarTeclaEnContenedor}>
      <div className="campo">
        <label htmlFor="alta-rapida-cliente-nombre">Nombre</label>
        <input
          id="alta-rapida-cliente-nombre"
          type="text"
          value={nombre}
          onChange={(evento) => setNombre(evento.target.value)}
          disabled={guardando}
          autoFocus
        />
      </div>

      <div className="campo">
        <label htmlFor="alta-rapida-cliente-apellido">Apellido (opcional)</label>
        <input
          id="alta-rapida-cliente-apellido"
          type="text"
          value={apellido}
          onChange={(evento) => setApellido(evento.target.value)}
          disabled={guardando}
        />
      </div>

      <div className="campo">
        <label htmlFor="alta-rapida-cliente-telefono">Teléfono (opcional)</label>
        <input
          id="alta-rapida-cliente-telefono"
          type="text"
          inputMode="tel"
          value={telefono}
          onChange={(evento) => setTelefono(filtrarTelefono(evento.target.value))}
          disabled={guardando}
        />
      </div>

      <div className="campo">
        <label htmlFor="alta-rapida-cliente-ci">CI (opcional)</label>
        <input
          id="alta-rapida-cliente-ci"
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
