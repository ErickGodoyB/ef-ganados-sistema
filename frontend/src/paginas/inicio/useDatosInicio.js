/**
 * Hooks de datos de la pantalla de Inicio. Cada bloque (resumen, calendario,
 * alertas) tiene el suyo, con su propia carga, su propio error y su propio
 * "recargar": así un bloque que falla no rompe a los demás.
 */

import { useCallback, useEffect, useState } from 'react'
import { peticionProtegida } from '../../api/cliente'

/** Resumen general (GET /api/inicio/resumen): conteos, lotes, grupos y parámetros de las alertas. */
export function useInicioResumen() {
  const [resumen, setResumen] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const cargar = useCallback(async () => {
    setCargando(true)
    setError('')
    try {
      setResumen(await peticionProtegida('/api/inicio/resumen'))
    } catch {
      setError('No se pudo cargar el resumen.')
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    // Ver la justificación de este mismo patrón en useAnimalesResumen.js.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargar()
  }, [cargar])

  return { resumen, cargando, error, recargar: cargar }
}

/** Días con pesajes de un mes (GET /api/inicio/calendario?anio=&mes=); se vuelve a pedir al cambiar de mes. */
export function useCalendarioInicio(anio, mes) {
  const [dias, setDias] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const cargar = useCallback(async () => {
    setCargando(true)
    setError('')
    try {
      const datos = await peticionProtegida(`/api/inicio/calendario?anio=${anio}&mes=${mes}`)
      setDias(Array.isArray(datos) ? datos : [])
    } catch {
      setError('No se pudo cargar el calendario.')
      setDias([])
    } finally {
      setCargando(false)
    }
  }, [anio, mes])

  useEffect(() => {
    // Ver la justificación de este mismo patrón en useAnimalesResumen.js.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargar()
  }, [cargar])

  return { dias, cargando, error, recargar: cargar }
}

/** Lista de una alerta (GET /api/inicio/alertas?tipo=&limite=); se pide al elegir el tipo. */
export function useAlertasInicio(tipo, limite = 10) {
  const [alerta, setAlerta] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const cargar = useCallback(async () => {
    setCargando(true)
    setError('')
    try {
      setAlerta(await peticionProtegida(`/api/inicio/alertas?tipo=${tipo}&limite=${limite}`))
    } catch {
      setError('No se pudo cargar la lista de esta alerta.')
      setAlerta(null)
    } finally {
      setCargando(false)
    }
  }, [tipo, limite])

  useEffect(() => {
    // Ver la justificación de este mismo patrón en useAnimalesResumen.js.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargar()
  }, [cargar])

  return { alerta, cargando, error, recargar: cargar }
}
