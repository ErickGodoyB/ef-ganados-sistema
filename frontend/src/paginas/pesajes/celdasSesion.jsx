/**
 * Valor a mostrar para una columna del listado de sesiones de pesaje, dada
 * una sesión y la clave de la columna (ver columnas.js). Compartido entre
 * TablaSesiones y TarjetaSesion para no mantener la misma lógica de celda
 * en dos lugares distintos (mismo criterio que celdasAnimal.jsx).
 */

import LoteInfo from '../../componentes/LoteInfo'
import { formatearFecha, formatearPeso } from '../../utilidades/formato'

export function valorCelda(sesion, clave) {
  switch (clave) {
    case 'fecha':
      return formatearFecha(sesion.fecha)
    case 'lote':
      return <LoteInfo subGrupoDescripcion={sesion.subGrupoDescripcion} grupoDescripcion={sesion.grupoDescripcion} />
    case 'cantidad':
      return sesion.cantidad
    case 'promedio':
      return formatearPeso(sesion.promedio)
    case 'minimo':
      return formatearPeso(sesion.minimo)
    case 'maximo':
      return formatearPeso(sesion.maximo)
    case 'total':
      return formatearPeso(sesion.total)
    default:
      return null
  }
}
