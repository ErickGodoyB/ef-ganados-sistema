/**
 * Hook de acceso al contexto de tema (tema actual y alternarTema). Separado
 * de TemaContext.jsx para que ese archivo solo exporte el componente
 * TemaProvider (ver contextoTema.js).
 */

import { useContext } from 'react'
import { TemaContext } from './contextoTema'

export function useTema() {
  const contexto = useContext(TemaContext)
  if (!contexto) {
    throw new Error('useTema debe usarse dentro de un TemaProvider')
  }
  return contexto
}
