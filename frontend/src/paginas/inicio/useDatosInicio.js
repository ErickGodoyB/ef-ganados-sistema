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

/** Reporte de proveedores (GET /api/reportes/proveedores), para la tarjeta "Mejor proveedor". */
export function useProveedoresInicio() {
  const [filas, setFilas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const cargar = useCallback(async () => {
    setCargando(true)
    setError('')
    try {
      const datos = await peticionProtegida('/api/reportes/proveedores')
      setFilas(Array.isArray(datos) ? datos : [])
    } catch {
      setError('No se pudo cargar el mejor proveedor.')
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    // Ver la justificación de este mismo patrón en useAnimalesResumen.js.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargar()
  }, [cargar])

  return { filas, cargando, error, recargar: cargar }
}

/** Sesiones de pesaje (GET /api/pesajes/sesiones), para la línea de evolución del peso promedio. */
export function useSesionesInicio() {
  const [sesiones, setSesiones] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const cargar = useCallback(async () => {
    setCargando(true)
    setError('')
    try {
      const datos = await peticionProtegida('/api/pesajes/sesiones')
      setSesiones(Array.isArray(datos) ? datos : [])
    } catch {
      setError('No se pudo cargar la evolución del peso.')
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    // Ver la justificación de este mismo patrón en useAnimalesResumen.js.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargar()
  }, [cargar])

  return { sesiones, cargando, error, recargar: cargar }
}

/**
 * Resumen de animales (GET /api/animales/resumen) para agrupar por raza en el
 * cliente. Solo se pide cuando "habilitado" es true (al elegir "Razas"), así
 * que quien no mira ese gráfico no paga una consulta de todos los animales.
 */
export function useAnimalesParaRazas(habilitado) {
  const [animales, setAnimales] = useState([])
  const [cargando, setCargando] = useState(false)
  const [cargado, setCargado] = useState(false)
  const [error, setError] = useState('')

  const cargar = useCallback(async () => {
    setCargando(true)
    setError('')
    try {
      const datos = await peticionProtegida('/api/animales/resumen')
      setAnimales(Array.isArray(datos) ? datos : [])
    } catch {
      setError('No se pudo cargar la distribución por raza.')
    } finally {
      setCargando(false)
      setCargado(true)
    }
  }, [])

  useEffect(() => {
    if (habilitado) {
      // Ver la justificación de este mismo patrón en useAnimalesResumen.js.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      cargar()
    }
  }, [habilitado, cargar])

  // "cargado" evita un destello de "sin datos" entre elegir "Razas" y que
  // arranque la primera carga (el efecto corre después del primer render).
  return { animales, cargando: cargando || (habilitado && !cargado && !error), error, recargar: cargar }
}
