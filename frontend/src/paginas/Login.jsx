/**
 * Pantalla de login. Valida los campos antes de llamar al backend, maneja
 * el foco por teclado (foco inicial en "Usuario", Enter en "Usuario" pasa
 * el foco a "Contraseña", Enter en "Contraseña" envía el formulario) y
 * traduce los errores del backend a mensajes en español.
 */

import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ErrorHttp } from '../api/cliente'
import { useAuth } from '../auth/useAuth'
import BotonTema from '../tema/BotonTema'
import './Login.css'

export default function Login() {
  const { iniciarSesion } = useAuth()
  const navigate = useNavigate()

  const [usuario, setUsuario] = useState('')
  const [password, setPassword] = useState('')
  const [mostrarPassword, setMostrarPassword] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')
  const [campoConError, setCampoConError] = useState(null) // 'usuario' | 'password' | null
  const [logoFallo, setLogoFallo] = useState(false)

  const refUsuario = useRef(null)
  const refPassword = useRef(null)

  // Foco inicial en "Usuario" al entrar a la pantalla.
  useEffect(() => {
    refUsuario.current?.focus()
  }, [])

  /** Enter en "Usuario" no envía el formulario: pasa el foco a "Contraseña". */
  function alPresionarTeclaEnUsuario(evento) {
    if (evento.key === 'Enter') {
      evento.preventDefault()
      refPassword.current?.focus()
    }
  }

  /** Valida los campos localmente, antes de llamar al backend. Devuelve true si están OK. */
  function validar() {
    if (!usuario.trim()) {
      setError('Ingresá tu usuario')
      setCampoConError('usuario')
      refUsuario.current?.focus()
      return false
    }
    if (!password) {
      setError('Ingresá tu contraseña')
      setCampoConError('password')
      refPassword.current?.focus()
      return false
    }
    return true
  }

  /** Envía el formulario: valida, llama al login y traduce cualquier error a un mensaje legible. */
  async function alEnviar(evento) {
    evento.preventDefault()
    setError('')
    setCampoConError(null)

    if (!validar()) {
      return
    }

    setEnviando(true)
    try {
      await iniciarSesion(usuario.trim(), password)
      navigate('/', { replace: true })
    } catch (err) {
      if (err instanceof ErrorHttp && err.estado === 401) {
        setError('Usuario o contraseña incorrectos')
      } else if (err instanceof ErrorHttp) {
        setError(err.message || 'No se pudo conectar con el servidor')
      } else {
        setError('No se pudo conectar con el servidor')
      }
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="login-pantalla">
      <div className="login-boton-tema">
        <BotonTema />
      </div>

      <div className="login-tarjeta">
        <div className="login-encabezado">
          {!logoFallo ? (
            <img src="/logo.png" alt="" className="login-logo" onError={() => setLogoFallo(true)} />
          ) : (
            <div className="login-logo login-logo--provisional" aria-hidden="true">
              EF
            </div>
          )}
          <h1 className="login-titulo">EF Ganados</h1>
          <p className="login-subtitulo">Sistema de gestión bovina</p>
        </div>

        <form className="login-formulario" onSubmit={alEnviar} noValidate>
          <div className="campo">
            <label htmlFor="usuario">Usuario</label>
            <input
              id="usuario"
              name="usuario"
              type="text"
              autoComplete="username"
              ref={refUsuario}
              value={usuario}
              onChange={(evento) => setUsuario(evento.target.value)}
              onKeyDown={alPresionarTeclaEnUsuario}
              aria-invalid={campoConError === 'usuario'}
              disabled={enviando}
            />
          </div>

          <div className="campo">
            <label htmlFor="password">Contraseña</label>
            <div className="campo-password">
              <input
                id="password"
                name="password"
                type={mostrarPassword ? 'text' : 'password'}
                autoComplete="current-password"
                ref={refPassword}
                value={password}
                onChange={(evento) => setPassword(evento.target.value)}
                aria-invalid={campoConError === 'password'}
                disabled={enviando}
              />
              <button
                type="button"
                className="boton-mostrar-password"
                onClick={() => setMostrarPassword((valor) => !valor)}
                aria-label={mostrarPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                disabled={enviando}
              >
                {mostrarPassword ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>
          </div>

          {error && (
            <p className="login-error" role="alert">
              {error}
            </p>
          )}

          <button type="submit" className="login-boton" disabled={enviando}>
            {enviando ? 'Ingresando...' : 'Iniciar sesión'}
          </button>
        </form>
      </div>
    </div>
  )
}
