/**
 * Valor a mostrar para una columna del listado de animales, dado un animal
 * y la clave de la columna (ver columnas.js). Compartido entre
 * TablaAnimales y TarjetaAnimal para no mantener la misma lógica de celda
 * en dos lugares distintos.
 */

import LoteInfo from '../../componentes/LoteInfo'
import ValorGmd from '../../componentes/ValorGmd'
import { formatearFecha, formatearPeso } from '../../utilidades/formato'
import EstadoBadge from './EstadoBadge'

export function valorCelda(animal, clave) {
  switch (clave) {
    case 'aniCaravana':
      return animal.aniCaravana
    case 'raza':
      return animal.razaDescripcion
    case 'lote':
      return <LoteInfo subGrupoDescripcion={animal.subGrupoDescripcion} grupoDescripcion={animal.grupoDescripcion} />
    case 'pesoActual':
      return formatearPeso(animal.pesoActual)
    case 'gmd':
      return <ValorGmd gmd={animal.gmd} />
    case 'estado':
      return <EstadoBadge animal={animal} />
    case 'fechaIngreso':
      return formatearFecha(animal.aniFechaIngreso)
    default:
      return null
  }
}
