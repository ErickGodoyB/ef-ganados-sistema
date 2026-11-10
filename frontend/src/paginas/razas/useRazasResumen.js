/**
 * Carga el resumen del catálogo de razas (GET /api/razas/resumen): cada
 * raza con cuántos animales tiene. Mismo patrón de carga/error/reintentar
 * que useAnimalesResumen.js.
 */

import { useCallback, useEffect, useState } from 'react'
import { peticionProtegida } from '../../api/cliente'

export function useRazasResumen() {
  const [razas, setRazas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const ejecutarCarga = useCallback(async () => {
    try {
      const datos = await peticionProtegida('/api/razas/resumen')
      setRazas(Array.isArray(datos) ? datos : [])
    } catch {
      setError('No se pudo cargar el catálogo de razas.')
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

  return { razas, cargando, error, recargar }
}
