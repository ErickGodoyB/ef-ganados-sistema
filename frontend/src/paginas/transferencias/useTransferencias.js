/**
 * Lista de transferencias (GET /api/transferencias?desde=&hasta=, la más
 * reciente primero). El rango de fechas se filtra en el servidor y se
 * vuelve a pedir cada vez que cambia (igual que VistaAnulados en Pesajes);
 * la búsqueda por texto, en cambio, se hace en el cliente sobre lo ya
 * cargado (ver listadoTransferencias.js). Expone carga/error y "recargar",
 * que vuelve a pedir la lista sin perder el rango (se usa tras registrar o
 * devolver una transferencia).
 */

import { useCallback, useEffect, useState } from 'react'
import { peticionProtegida } from '../../api/cliente'

export function useTransferencias(desde, hasta) {
  const [transferencias, setTransferencias] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const cargar = useCallback(async () => {
    setCargando(true)
    setError('')
    try {
      const parametros = new URLSearchParams()
      if (desde) {
        parametros.set('desde', desde)
      }
      if (hasta) {
        parametros.set('hasta', hasta)
      }
      const cadena = parametros.toString()
      const datos = await peticionProtegida(`/api/transferencias${cadena ? `?${cadena}` : ''}`)
      setTransferencias(Array.isArray(datos) ? datos : [])
    } catch {
      setError('No se pudo cargar el listado de transferencias.')
    } finally {
      setCargando(false)
    }
  }, [desde, hasta])

  useEffect(() => {
    // Ver la justificación de este mismo patrón en useAnimalesResumen.js.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargar()
  }, [cargar])

  return { transferencias, cargando, error, recargar: cargar }
}
