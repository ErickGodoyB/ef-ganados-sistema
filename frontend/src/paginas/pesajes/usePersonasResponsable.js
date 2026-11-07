/**
 * Personas disponibles para elegir como responsable de un pesaje (GET
 * /api/personas, sin filtrar por tipo): la pestaña "Individual" y "Por
 * lote" del modal "Nuevo pesaje" comparten este hook porque las dos
 * necesitan exactamente lo mismo. Si la lista falla, igual se puede
 * seguir guardando: el responsable queda fijo en la persona actual (ver
 * CampoResponsable), y "error" es solo para avisarlo.
 */

import { useEffect, useState } from 'react'
import { peticionProtegida } from '../../api/cliente'

export function usePersonasResponsable() {
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
          setError('No se pudieron cargar las personas: se va a usar la persona actual como responsable.')
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
