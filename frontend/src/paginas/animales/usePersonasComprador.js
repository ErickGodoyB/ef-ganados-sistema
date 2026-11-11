/**
 * Personas disponibles para elegir como comprador al registrar la salida
 * de un animal (GET /api/personas, sin filtrar por tipo): el comprador es
 * opcional, así que si esta lista falla igual se puede registrar la
 * salida sin comprador ("error" es solo para avisarlo). Mismo patrón que
 * paginas/pesajes/usePersonasResponsable.js, duplicado acá para no cruzar
 * un import entre las dos secciones (animales/pesajes) por un hook tan
 * chico.
 */

import { useEffect, useState } from 'react'
import { peticionProtegida } from '../../api/cliente'

export function usePersonasComprador() {
  const [personas, setPersonas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelado = false
    async function cargar() {
      setCargando(true)
      setError('')
      try {
        const datos = await peticionProtegida('/api/personas')
        if (!cancelado) {
          setPersonas(Array.isArray(datos) ? datos : [])
        }
      } catch {
        if (!cancelado) {
          setError('No se pudieron cargar las personas: se puede registrar la salida sin comprador.')
        }
      } finally {
        if (!cancelado) {
          setCargando(false)
        }
      }
    }
    cargar()
    return () => {
      cancelado = true
    }
  }, [])

  return { personas, cargandoPersonas: cargando, errorPersonas: error }
}
