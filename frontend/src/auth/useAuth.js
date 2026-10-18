/**
 * Hook de acceso al contexto de autenticación (usuario, token,
 * iniciarSesion, cerrarSesion). Separado de AuthContext.jsx para que ese
 * archivo solo exporte el componente AuthProvider (ver contextoAuth.js).
 */

import { useContext } from 'react'
import { AuthContext } from './contextoAuth'

export function useAuth() {
  const contexto = useContext(AuthContext)
  if (!contexto) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider')
  }
  return contexto
}
