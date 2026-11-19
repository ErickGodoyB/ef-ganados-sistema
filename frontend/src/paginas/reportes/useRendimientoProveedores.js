/**
 * Datos del reporte "Rendimiento por proveedor" (GET
 * /api/reportes/proveedores?soloActivos=). Se vuelve a pedir cada vez que
 * cambia "soloActivos" (el cálculo lo hace el servidor). Expone carga/
 * error y "recargar", igual que useTransferencias.
 */

import { useCallback, useEffect, useState } from 'react'
import { peticionProtegida } from '../../api/cliente'

export function useRendimientoProveedores(soloActivos) {
  const [filas, setFilas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const cargar = useCallback(async () => {
    setCargando(true)
    setError('')
    try {
      const datos = await peticionProtegida(`/api/reportes/proveedores?soloActivos=${soloActivos}`)
      setFilas(Array.isArray(datos) ? datos : [])
    } catch {
      setError('No se pudo cargar el reporte de rendimiento por proveedor.')
    } finally {
      setCargando(false)
    }
  }, [soloActivos])

  useEffect(() => {
    // Ver la justificación de este mismo patrón en useAnimalesResumen.js.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargar()
  }, [cargar])

  return { filas, cargando, error, recargar: cargar }
}
