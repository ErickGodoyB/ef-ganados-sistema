/**
 * Valor a mostrar para una columna del listado de animales, dado un animal
 * y la clave de la columna (ver columnas.js). Compartido entre
 * TablaAnimales y TarjetaAnimal para no mantener la misma lógica de celda
 * en dos lugares distintos.
 */

import LoteInfo from '../../componentes/LoteInfo'
import ValorDiferenciaPeso from '../../componentes/ValorDiferenciaPeso'
import ValorGmd from '../../componentes/ValorGmd'
import { formatearFecha, formatearGmd, formatearPeso } from '../../utilidades/formato'
import EstadoBadge from './EstadoBadge'

export function valorCelda(animal, clave) {
  switch (clave) {
    case 'aniCaravana':
      return animal.aniCaravana
    case 'raza':
      return animal.razaDescripcion
    case 'lote':
      return <LoteInfo subGrupoDescripcion={animal.subGrupoDescripcion} grupoDescripcion={animal.grupoDescripcion} />
    case 'proveedor':
      return animal.proveedorNombre || 'Sin proveedor'
    case 'pesajes':
      // Con 0 se dice "Sin pesajes" en vez de un 0 pelado: es información, no un dato roto.
      return animal.cantidadPesajes === 0 ? 'Sin pesajes' : animal.cantidadPesajes
    case 'pesoIngreso':
      return formatearPeso(animal.aniPesoInicial)
    case 'gananciaTotal':
      return <ValorDiferenciaPeso diferencia={animal.gananciaTotal} sinDato="Todavía no tiene pesajes" />
    case 'gmdAcumulado':
      return (
        <span className={animal.gmdAcumulado != null && animal.gmdAcumulado < 0 ? 'valor-negativo' : undefined}>
          {formatearGmd(animal.gmdAcumulado)}
        </span>
      )
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
