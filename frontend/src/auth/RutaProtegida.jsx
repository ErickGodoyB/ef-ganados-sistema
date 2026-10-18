/**
 * Envoltorio de ruta: si no hay una sesión activa, redirige a /login en vez
 * de mostrar la pantalla protegida.
 */

import { Navigate } from 'react-router-dom'
import { useAuth } from './useAuth'

export default function RutaProtegida({ children }) {
  const { usuario } = useAuth()

  if (!usuario) {
    return <Navigate to="/login" replace />
  }

  return children
}
