/**
 * Carga el resumen del catálogo de personas (GET /api/personas/resumen):
 * cada persona con cuántos animales tiene como dueña, en cuántos pesajes
 * figura y si tiene un usuario de acceso. Mismo patrón de carga/error/
 * reintentar que useRazasResumen.js/useGruposResumen.js.
 */

import { useCallback, useEffect, useState } from 'react'
import { peticionProtegida } from '../../api/cliente'

export function usePersonasResumen() {
  const [personas, setPersonas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const ejecutarCarga = useCallback(async () => {
    try {
      const datos = await peticionProtegida('/api/personas/resumen')
      setPersonas(Array.isArray(datos) ? datos : [])
    } catch {
      setError('No se pudo cargar el catálogo de personas.')
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

  return { personas, cargando, error, recargar }
}
