/**
 * Proveedor de autenticación: guarda la sesión actual (usuario + token) en
 * memoria y en localStorage o sessionStorage (según "Recordarme", ver
 * sesionAlmacenada.js), y expone iniciarSesion/cerrarSesion a través del
 * contexto (ver useAuth.js para el hook de acceso).
 */

import { useCallback, useMemo, useState } from 'react'
import { login as iniciarSesionEnBackend } from '../api/cliente'
import { AuthContext } from './contextoAuth'
import { borrarSesionGuardada, guardarSesion, obtenerSesionGuardada } from './sesionAlmacenada'

/**
 * Envuelve la app y provee el contexto de autenticación. Al montarse, lee
 * la sesión guardada en localStorage (si hay una) para no obligar a
 * iniciar sesión de nuevo después de recargar la página.
 */
export function AuthProvider({ children }) {
  const [sesion, setSesion] = useState(() => obtenerSesionGuardada())

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
    borrarSesionGuardada()
  }, [])

  const valor = useMemo(
    () => ({
      usuario: sesion ? { usuNombre: sesion.usuNombre, tipo: sesion.tipo } : null,
      token: sesion?.token ?? null,
      iniciarSesion,
      cerrarSesion,
    }),
    [sesion, iniciarSesion, cerrarSesion],
  )

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>
}
