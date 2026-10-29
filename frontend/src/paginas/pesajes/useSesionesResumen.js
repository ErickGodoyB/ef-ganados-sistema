/**
 * Carga el resumen de sesiones de pesaje (GET /api/pesajes/sesiones, RF011)
 * para el listado. Expone el estado de carga/error y una función para
 * reintentar, igual que useAnimalesResumen.js.
 */

import { useCallback, useEffect, useState } from 'react'
import { peticionProtegida } from '../../api/cliente'

export function useSesionesResumen() {
  const [sesiones, setSesiones] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const ejecutarCarga = useCallback(async () => {
    try {
      const datos = await peticionProtegida('/api/pesajes/sesiones')
      setSesiones(datos ?? [])
    } catch {
      setError('No se pudo cargar el listado de pesajes.')
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    // Ver la justificación de este mismo patrón en useAnimalesResumen.js.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    ejecutarCarga()
  }, [ejecutarCarga])

  /** Reintenta la carga (botón "Reintentar"): vuelve a mostrar "cargando" y limpia el error anterior. */
  const recargar = useCallback(() => {
    setCargando(true)
    setError('')
    ejecutarCarga()
  }, [ejecutarCarga])

  return { sesiones, cargando, error, recargar }
}
