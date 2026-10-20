/**
 * Alta rápida de una raza nueva, sin salir del formulario de animal: un
 * botón "+" junto al select de Raza despliega un mini formulario (en el
 * mismo formulario, nunca en un modal aparte) con nombre y peso objetivo
 * de venta. Antes de guardar, verifica en el cliente que no exista ya una
 * raza con ese nombre (sin distinguir mayúsculas ni espacios extremos).
 * Escape cierra solo este mini formulario, no el formulario completo: el
 * stopPropagation evita que el Escape también le llegue al Modal que lo
 * envuelve (ver Modal.jsx, que escucha Escape en el document).
 */

import { Plus } from 'lucide-react'
import { useRef, useState } from 'react'
import { ErrorHttp, peticionProtegida } from '../../api/cliente'
import './AltaRapida.css'

/** Convierte el texto del peso (acepta coma o punto) a número; NaN si no es válido. */
function parsearPeso(texto) {
  const normalizado = texto.trim().replace(',', '.')
  return normalizado === '' ? NaN : Number(normalizado)
}

export default function AltaRapidaRaza({ razas, onCreada }) {
  const [abierto, setAbierto] = useState(false)
  const [nombre, setNombre] = useState('')
  const [pesoObjetivo, setPesoObjetivo] = useState('')
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)
  const refBotonMas = useRef(null)

  function abrir() {
    setAbierto(true)
    setNombre('')
    setPesoObjetivo('')
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
      setError('Ingresá el nombre de la raza')
      return
    }
    const existente = razas.find(
      (raza) => raza.rzDescripcion.trim().toLowerCase() === nombreNormalizado.toLowerCase(),
    )
    if (existente) {
      setError(`Ya existe la raza ${existente.rzDescripcion}`)
      return
    }

    const peso = parsearPeso(pesoObjetivo)
    if (!pesoObjetivo.trim() || Number.isNaN(peso) || peso <= 0 || peso > 2000) {
      setError('Ingresá un peso objetivo válido (mayor a 0 y hasta 2000 kg)')
      return
    }

    setGuardando(true)
    setError('')
    try {
      const razaCreada = await peticionProtegida('/api/razas', {
        method: 'POST',
        body: JSON.stringify({ rzDescripcion: nombreNormalizado, rzPesoObjetivoVenta: peso }),
      })
      onCreada(razaCreada)
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
        aria-label="Agregar raza nueva"
        onClick={abrir}
      >
        <Plus aria-hidden="true" size={20} />
      </button>
    )
  }

  return (
    <div className="alta-rapida-mini-formulario" onKeyDown={manejarTeclaEnContenedor}>
      <div className="campo">
        <label htmlFor="alta-rapida-raza-nombre">Nombre de la raza</label>
        <input
          id="alta-rapida-raza-nombre"
          type="text"
          value={nombre}
          onChange={(evento) => setNombre(evento.target.value)}
          disabled={guardando}
          autoFocus
        />
      </div>

      <div className="campo">
        <label htmlFor="alta-rapida-raza-peso">Peso objetivo de venta (kg)</label>
        <input
          id="alta-rapida-raza-peso"
          type="text"
          inputMode="decimal"
          value={pesoObjetivo}
          onChange={(evento) => setPesoObjetivo(evento.target.value)}
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
