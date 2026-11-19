/**
 * Carga las listas que necesita el formulario de "Nuevo animal" (RF001):
 * razas, lotes (subgrupos), dueños (personas con perTipo "PROPIETARIO") y
 * proveedores (perTipo "PROVEEDOR", para el campo opcional del animal).
 * Se pide una vez por apertura del modal; expone carga/error y
 * "reintentar", igual que useAnimalesResumen.
 */

import { useCallback, useEffect, useState } from 'react'
import { peticionProtegida } from '../../api/cliente'

export function useDatosFormularioAnimal() {
  const [razas, setRazas] = useState([])
  const [subGrupos, setSubGrupos] = useState([])
  const [duenios, setDuenios] = useState([])
  const [proveedores, setProveedores] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const ejecutarCarga = useCallback(async () => {
    try {
      const [razasRecibidas, subGruposRecibidos, personasRecibidas] = await Promise.all([
        peticionProtegida('/api/razas'),
        peticionProtegida('/api/subgrupos'),
        peticionProtegida('/api/personas'),
      ])
      setRazas(razasRecibidas ?? [])
      setSubGrupos(subGruposRecibidos ?? [])
      // El dueño de un animal tiene que ser una persona propietaria, no
      // cualquier persona: ni un empleado cargado como responsable de
      // pesaje, ni un cliente cargado como comprador de una salida, son
      // dueños de nada. Esta comparación exacta (no "distinto de EMPLEADO")
      // ya los excluye a los dos.
      setDuenios((personasRecibidas ?? []).filter((persona) => persona.perTipo === 'PROPIETARIO'))
      // Los proveedores salen de la misma consulta fresca de personas (se
      // pide al abrir el formulario), así que un proveedor creado o
      // cambiado de tipo desde Personas aparece sin recargar la página.
      setProveedores((personasRecibidas ?? []).filter((persona) => persona.perTipo === 'PROVEEDOR'))
    } catch {
      setError('No se pudieron cargar los datos del formulario.')
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    // Ver la justificación de este mismo patrón en useAnimalesResumen.js.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    ejecutarCarga()
  }, [ejecutarCarga])

  /** Reintenta la carga (botón "Reintentar"). */
  const recargar = useCallback(() => {
    setCargando(true)
    setError('')
    ejecutarCarga()
  }, [ejecutarCarga])

  return { razas, subGrupos, duenios, proveedores, cargando, error, recargar }
}
