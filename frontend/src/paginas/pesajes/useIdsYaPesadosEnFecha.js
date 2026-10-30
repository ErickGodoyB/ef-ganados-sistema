/**
 * IDs de animal con un pesaje ACTIVO en una fecha dada, sin importar su
 * lote (para la pestaña "Individual" del modal "Nuevo pesaje", que no está
 * acotada a un lote como "Por lote" -- ver PestanaPorLote.jsx, que ya tiene
 * esto mismo pero scoped a un solo lote con una sola consulta).
 *
 * No existe un endpoint que traiga esto directo (ver CLAUDE.md, "no tocar
 * el backend" de este pedido): se compone con GET /api/pesajes/sesiones
 * (para saber qué lotes tuvieron una sesión esa fecha) y, para cada uno,
 * GET /api/pesajes/sesiones/detalle (para los animalId concretos).
 */

import { useEffect, useState } from 'react'
import { peticionProtegida } from '../../api/cliente'

export function useIdsYaPesadosEnFecha(fecha) {
  const [ids, setIds] = useState(new Set())

  useEffect(() => {
    if (!fecha) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIds(new Set())
      return undefined
    }
    let cancelado = false

    async function cargar() {
      try {
        const resumen = await peticionProtegida('/api/pesajes/sesiones')
        const sesionesDeLaFecha = (resumen ?? []).filter((sesion) => sesion.fecha === fecha)
        const detalles = await Promise.all(
          sesionesDeLaFecha.map((sesion) => {
            const parametros = new URLSearchParams({ fecha })
            if (sesion.subGrupoId != null) {
              parametros.set('subGrupoId', sesion.subGrupoId)
            }
            return peticionProtegida(`/api/pesajes/sesiones/detalle?${parametros.toString()}`)
          }),
        )
        if (!cancelado) {
          setIds(new Set(detalles.flat().map((item) => item.animalId)))
        }
      } catch {
        if (!cancelado) {
          setIds(new Set())
        }
      }
    }

    cargar()
    return () => {
      cancelado = true
    }
  }, [fecha])

  return ids
}
