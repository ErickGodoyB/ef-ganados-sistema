/**
 * Objeto de contexto de tema en sí. Vive en su propio archivo (y no en
 * TemaContext.jsx) porque ese archivo solo puede exportar el componente
 * TemaProvider: así React Fast Refresh funciona correctamente (ver
 * react-refresh/only-export-components). El hook useTema, en useTema.js,
 * también importa este mismo objeto.
 */

import { createContext } from 'react'

export const TemaContext = createContext(null)
