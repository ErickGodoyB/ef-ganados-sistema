/**
 * Carga el resumen de animales (GET /api/animales/resumen, RF010) para el
 * listado. Expone el estado de carga/error y una función para reintentar,
 * en vez de que Animales.jsx tenga que repetir ese manejo de fetch.
 */

import { useCallback, useEffect, useState } from 'react'
import { peticionProtegida } from '../../api/cliente'

export function useAnimalesResumen() {
  const [animales, setAnimales] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const ejecutarCarga = useCallback(async () => {
    try {
      const datos = await peticionProtegida('/api/animales/resumen')
      setAnimales(datos ?? [])
    } catch {
      setError('No se pudo cargar el listado de animales.')
    } finally {
      setCargando(false)
    }
  }, [])

  // Traer los datos al montar la pantalla es exactamente el caso de uso
  // que useEffect está pensado para resolver (sincronizar con un sistema
  // externo, el backend). La regla react-hooks/set-state-in-effect viene
  // del set de reglas del React Compiler (que este proyecto no usa: no hay
  // babel-plugin-react-compiler en vite.config.js) y marca cualquier
  // setState alcanzable desde un efecto, incluso este patrón estándar sin
  // una librería de fetching de por medio (la consigna pide no agregar
  // ninguna nueva).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    ejecutarCarga()
  }, [ejecutarCarga])

  /** Reintenta la carga (botón "Reintentar"): vuelve a mostrar "cargando" y limpia el error anterior. */
  const recargar = useCallback(() => {
    setCargando(true)
    setError('')
    ejecutarCarga()
  }, [ejecutarCarga])

  return { animales, cargando, error, recargar }
}
