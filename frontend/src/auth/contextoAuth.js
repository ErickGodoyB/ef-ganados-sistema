/**
 * Objeto de contexto de autenticación en sí. Vive en su propio archivo
 * (y no en AuthContext.jsx) porque ese archivo solo puede exportar el
 * componente AuthProvider: así React Fast Refresh funciona correctamente
 * (ver react-refresh/only-export-components). El hook useAuth, en
 * useAuth.js, también importa este mismo objeto.
 */

import { createContext } from 'react'

export const AuthContext = createContext(null)
