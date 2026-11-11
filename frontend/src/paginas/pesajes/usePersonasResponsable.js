/**
 * Personas disponibles para elegir como responsable de un pesaje (GET
 * /api/personas, sin incluir a las de tipo CLIENTE: un cliente no es
 * quien registra un pesaje). "personaActualId" siempre queda incluida en
 * la lista aunque su tipo sea CLIENTE, porque el usuario autenticado
 * tiene que poder elegirse a sí mismo como responsable sin importar su
 * tipo de persona. Las pestañas "Individual" y "Por lote" del modal
 * "Nuevo pesaje" comparten este hook porque las dos necesitan
 * exactamente lo mismo. Si la lista falla, igual se puede seguir
 * guardando: el responsable queda fijo en la persona actual (ver
 * CampoResponsable), y "error" es solo para avisarlo.
 */

import { useEffect, useState } from 'react'
import { peticionProtegida } from '../../api/cliente'

export function usePersonasResponsable(personaActualId) {
  // Se guarda la respuesta del servidor sin filtrar: el filtro por
  // "personaActualId" se aplica abajo, en cada render, en vez de volver a
  // pedir /api/personas cada vez que useAuth termine de resolverlo (pasa
  // de null a un número, y no sería necesario pedir la lista de nuevo
  // solo por eso).
  const [personasSinFiltrar, setPersonasSinFiltrar] = useState([])
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
          setPersonasSinFiltrar(Array.isArray(datos) ? datos : [])
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

  const personas = personasSinFiltrar.filter(
    (persona) => persona.perTipo !== 'CLIENTE' || persona.perId === personaActualId,
  )

  return { personas, cargandoPersonas: cargando, errorPersonas: error }
}
