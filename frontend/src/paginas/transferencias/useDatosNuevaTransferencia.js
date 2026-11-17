/**
 * Datos de la pestaña "Nueva transferencia": el resumen de animales (GET
 * /api/animales/resumen, de donde salen peso actual y GMD) y los lotes (GET
 * /api/subgrupos, para elegir el destino). Se piden juntos, una vez al
 * montar la pestaña, y expone carga/error y "recargar", igual que
 * useDatosFormularioAnimal.
 *
 * "agregarLote" suma al toque un lote recién creado con el alta rápida
 * (para que el selector ya lo tenga) y después vuelve a pedir la lista en
 * silencio: la respuesta del alta no trae la descripción del grupo, y sin
 * ella el lote no se podría ubicar en su grupo dentro del selector.
 */

import { useCallback, useEffect, useState } from 'react'
import { peticionProtegida } from '../../api/cliente'

export function useDatosNuevaTransferencia() {
  const [animales, setAnimales] = useState([])
  const [lotes, setLotes] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const ejecutarCarga = useCallback(async () => {
    try {
      const [animalesRecibidos, lotesRecibidos] = await Promise.all([
        peticionProtegida('/api/animales/resumen'),
        peticionProtegida('/api/subgrupos'),
      ])
      setAnimales(Array.isArray(animalesRecibidos) ? animalesRecibidos : [])
      setLotes(Array.isArray(lotesRecibidos) ? lotesRecibidos : [])
    } catch {
      setError('No se pudieron cargar los animales y los lotes.')
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

  /** Suma un lote recién creado y refresca la lista de lotes sin mostrar "cargando". */
  const agregarLote = useCallback(async (lote) => {
    setLotes((actuales) => [...actuales, lote])
    try {
      const lotesRecibidos = await peticionProtegida('/api/subgrupos')
      if (Array.isArray(lotesRecibidos)) {
        setLotes(lotesRecibidos)
      }
    } catch {
      // Si falla el refresco queda el lote agregado a mano: alcanza para elegirlo.
    }
  }, [])

  return { animales, lotes, cargando, error, recargar, agregarLote }
}
