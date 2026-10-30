/**
 * Pantalla "Mi cuenta" (/cuenta): muestra el usuario y la persona asociada
 * (de GET /api/auth/yo, vía useAuth) y un formulario para cambiar la clave
 * (PUT /api/auth/clave). La validación de "coinciden" y "mínimo 5
 * caracteres" es solo una ayuda en el cliente para no hacer un viaje al
 * servidor en vano: el servidor es la autoridad final sobre el mínimo real
 * (app.seguridad.clave-minima) y sobre si la clave actual es correcta.
 * Un error de validación del servidor (400: clave actual incorrecta, clave
 * nueva igual a la actual, clave nueva corta) se muestra tal cual bajo el
 * formulario, sin cerrar la sesión ni limpiar lo escrito (así la persona
 * puede corregir sin volver a tipear todo).
 */

import { Eye, EyeOff } from 'lucide-react'
import { useId, useState } from 'react'
import { ErrorHttp, peticionProtegida } from '../api/cliente'
import { useAuth } from '../auth/useAuth'
import EncabezadoPagina from '../componentes/EncabezadoPagina'
import './Cuenta.css'

const CLAVE_MINIMA_CLIENTE = 5

/** Campo de clave con su propio botón de mostrar/ocultar (ver Login.jsx para el mismo patrón). */
function CampoClave({ id, label, value, onChange, autoComplete, disabled, error }) {
  const [mostrar, setMostrar] = useState(false)
  return (
    <div className="campo">
      <label htmlFor={id}>{label}</label>
      <div className="campo-password">
        <input
          id={id}
          type={mostrar ? 'text' : 'password'}
          autoComplete={autoComplete}
          value={value}
          onChange={(evento) => onChange(evento.target.value)}
          aria-invalid={Boolean(error)}
          disabled={disabled}
        />
        <button
          type="button"
          className="boton-mostrar-password"
          onClick={() => setMostrar((actual) => !actual)}
          aria-label={mostrar ? `Ocultar ${label.toLowerCase()}` : `Mostrar ${label.toLowerCase()}`}
          disabled={disabled}
        >
          {mostrar ? <EyeOff aria-hidden="true" size={18} /> : <Eye aria-hidden="true" size={18} />}
        </button>
      </div>
      {error && (
        <p className="campo-error" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

export default function Cuenta() {
  const { usuario, personaNombre, cargandoYo, errorYo } = useAuth()

  const [claveActual, setClaveActual] = useState('')
  const [claveNueva, setClaveNueva] = useState('')
  const [confirmacion, setConfirmacion] = useState('')
  const [errores, setErrores] = useState({})
  const [errorGeneral, setErrorGeneral] = useState('')
  const [mensajeExito, setMensajeExito] = useState('')
  const [guardando, setGuardando] = useState(false)

  const idFormulario = useId()

  /** Validación local (solo ayuda visual): coinciden y llegan al mínimo. El servidor valida todo lo demás. */
  function validar() {
    const encontrados = {}
    if (!claveActual) {
      encontrados.claveActual = 'Ingresá tu clave actual'
    }
    if (!claveNueva) {
      encontrados.claveNueva = 'Ingresá la clave nueva'
    } else if (claveNueva.length < CLAVE_MINIMA_CLIENTE) {
      encontrados.claveNueva = `Debe tener al menos ${CLAVE_MINIMA_CLIENTE} caracteres`
    }
    if (!confirmacion) {
      encontrados.confirmacion = 'Repetí la clave nueva'
    } else if (claveNueva && confirmacion !== claveNueva) {
      encontrados.confirmacion = 'Las claves no coinciden'
    }
    return encontrados
  }

  async function manejarEnviar(evento) {
    evento.preventDefault()
    setMensajeExito('')
    setErrorGeneral('')

    const encontrados = validar()
    setErrores(encontrados)
    if (Object.keys(encontrados).length > 0) {
      return
    }

    setGuardando(true)
    try {
      await peticionProtegida('/api/auth/clave', {
        method: 'PUT',
        body: JSON.stringify({ claveActual, claveNueva }),
      })
      setClaveActual('')
      setClaveNueva('')
      setConfirmacion('')
      setErrores({})
      setMensajeExito('Clave actualizada')
    } catch (err) {
      setErrorGeneral(
        err instanceof ErrorHttp ? err.message || 'No se pudo cambiar la clave.' : 'No se pudo conectar con el servidor.',
      )
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="cuenta-pagina">
      <EncabezadoPagina titulo="Mi cuenta" />

      <section className="tarjeta cuenta-seccion">
        <h2>Datos de la cuenta</h2>
        {cargandoYo && <p role="status">Cargando datos de la cuenta…</p>}
        {!cargandoYo && errorYo && (
          <p className="campo-error" role="alert">
            {errorYo}
          </p>
        )}
        {!cargandoYo && !errorYo && (
          <dl className="cuenta-datos">
            <div className="cuenta-dato">
              <dt>Usuario</dt>
              <dd>{usuario?.usuNombre}</dd>
            </div>
            <div className="cuenta-dato">
              <dt>Persona</dt>
              <dd>{personaNombre || 'Sin datos'}</dd>
            </div>
          </dl>
        )}
      </section>

      <section className="tarjeta cuenta-seccion">
        <h2>Cambiar clave</h2>
        <form className="cuenta-formulario" onSubmit={manejarEnviar} noValidate>
          <CampoClave
            id={`${idFormulario}-actual`}
            label="Clave actual"
            value={claveActual}
            onChange={setClaveActual}
            autoComplete="current-password"
            disabled={guardando}
            error={errores.claveActual}
          />
          <CampoClave
            id={`${idFormulario}-nueva`}
            label="Clave nueva"
            value={claveNueva}
            onChange={setClaveNueva}
            autoComplete="new-password"
            disabled={guardando}
            error={errores.claveNueva}
          />
          <CampoClave
            id={`${idFormulario}-confirmacion`}
            label="Confirmar clave nueva"
            value={confirmacion}
            onChange={setConfirmacion}
            autoComplete="new-password"
            disabled={guardando}
            error={errores.confirmacion}
          />

          {mensajeExito && (
            <p className="cuenta-exito" role="status">
              {mensajeExito}
            </p>
          )}

          {errorGeneral && (
            <p className="campo-error" role="alert">
              {errorGeneral}
            </p>
          )}

          <button type="submit" className="boton-primario" disabled={guardando}>
            {guardando ? 'Guardando...' : 'Cambiar clave'}
          </button>
        </form>
      </section>
    </div>
  )
}
