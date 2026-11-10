/**
 * Carga el resumen del catálogo de grupos y lotes (GET /api/grupos/resumen):
 * cada grupo con sus lotes y el conteo de animales de cada uno. Mismo
 * patrón de carga/error/reintentar que useRazasResumen.js.
 */

import { useCallback, useEffect, useState } from 'react'
import { peticionProtegida } from '../../api/cliente'

export function useGruposResumen() {
  const [grupos, setGrupos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const ejecutarCarga = useCallback(async () => {
    try {
      const datos = await peticionProtegida('/api/grupos/resumen')
      setGrupos(Array.isArray(datos) ? datos : [])
    } catch {
      setError('No se pudo cargar el catálogo de grupos y lotes.')
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    // Ver la justificación de este patrón en useAnimalesResumen.js.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    ejecutarCarga()
  }, [ejecutarCarga])

  /** Reintenta la carga (botón "Reintentar"). */
  const recargar = useCallback(() => {
    setCargando(true)
    setError('')
    ejecutarCarga()
  }, [ejecutarCarga])

  return { grupos, cargando, error, recargar }
}
