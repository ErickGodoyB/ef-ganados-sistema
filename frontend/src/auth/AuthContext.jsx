/**
 * Proveedor de autenticación: guarda la sesión actual (usuario + token) en
 * memoria y en localStorage o sessionStorage (según "Recordarme", ver
 * sesionAlmacenada.js), y expone iniciarSesion/cerrarSesion a través del
 * contexto (ver useAuth.js para el hook de acceso). También pide los datos
 * de la persona asociada al usuario (GET /api/auth/yo: personaId y
 * personaNombre), que hacen falta para registrar pesajes "a nombre de" la
 * persona actual (ver RF011).
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { login as iniciarSesionEnBackend, peticionProtegida } from '../api/cliente'
import { AuthContext } from './contextoAuth'
import { borrarSesionGuardada, guardarSesion, obtenerSesionGuardada } from './sesionAlmacenada'

/**
 * Envuelve la app y provee el contexto de autenticación. Al montarse, lee
 * la sesión guardada en localStorage (si hay una) para no obligar a
 * iniciar sesión de nuevo después de recargar la página.
 */
export function AuthProvider({ children }) {
  const [sesion, setSesion] = useState(() => obtenerSesionGuardada())
  const [yo, setYo] = useState(null)
  const [cargandoYo, setCargandoYo] = useState(false)
  const [errorYo, setErrorYo] = useState('')

  /**
   * Inicia sesión contra el backend (POST /api/auth/login). Si las
   * credenciales son correctas, guarda la sesión (token, usuNombre, tipo)
   * en memoria y, según "recordarme", en localStorage (persiste entre
   * reinicios del navegador) o en sessionStorage (se pierde al cerrar la
   * pestaña). Si falla, propaga el error para que la pantalla de login
   * decida qué mensaje mostrar.
   */
  const iniciarSesion = useCallback(async (usuNombre, usuPassword, recordarme) => {
    const datos = await iniciarSesionEnBackend(usuNombre, usuPassword)
    setSesion(datos)
    guardarSesion(datos, recordarme)
    return datos
  }, [])

  /** Cierra la sesión actual: la borra de memoria y de localStorage. */
  const cerrarSesion = useCallback(() => {
    setSesion(null)
    setYo(null)
    setErrorYo('')
    borrarSesionGuardada()
  }, [])

  // Pide GET /api/auth/yo cada vez que aparece una sesión distinta (recién
  // iniciada, o restaurada al abrir la app con una sesión guardada): no
  // hace falta un botón "reintentar" propio acá, porque las pantallas que
  // necesiten personaId pueden mostrar su propio error (ver errorYo) sin
  // bloquear el resto de la app.
  useEffect(() => {
    if (!sesion) {
      return undefined
    }
    let cancelado = false

    async function cargarYo() {
      setCargandoYo(true)
      setErrorYo('')
      try {
        const datos = await peticionProtegida('/api/auth/yo')
        if (!cancelado) {
          setYo(datos)
        }
      } catch {
        if (!cancelado) {
          setErrorYo('No se pudo identificar al usuario actual.')
        }
      } finally {
        if (!cancelado) {
          setCargandoYo(false)
        }
      }
    }

    cargarYo()

    return () => {
      cancelado = true
    }
  }, [sesion])

  const valor = useMemo(
    () => ({
      usuario: sesion ? { usuNombre: sesion.usuNombre, tipo: sesion.tipo } : null,
      token: sesion?.token ?? null,
      personaId: yo?.personaId ?? null,
      personaNombre: yo?.personaNombre ?? null,
      cargandoYo,
      errorYo,
      iniciarSesion,
      cerrarSesion,
    }),
    [sesion, yo, cargandoYo, errorYo, iniciarSesion, cerrarSesion],
  )

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>
}
