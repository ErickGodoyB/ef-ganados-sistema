/**
 * Anillo chico "Aptos para venta" de Inicio: los animales aptos frente al
 * resto de los activos (animalesActivos − aptosVenta), con su leyenda y
 * porcentaje. Las porciones en 0 también aparecen en la leyenda ("Aptos
 * para venta 0 (0 %)"): saber que no hay ninguno también es información.
 */

import GraficoAnillo from '../../componentes/GraficoAnillo'
import TarjetaGrafico from './TarjetaGrafico'

export default function AnilloAptos({ resumen }) {
  const items = [
    { etiqueta: 'Aptos para venta', valor: resumen.aptosVenta },
    { etiqueta: 'No aptos', valor: Math.max(0, resumen.animalesActivos - resumen.aptosVenta) },
  ]
  return (
    <TarjetaGrafico titulo="Aptos para venta">
      <GraficoAnillo
        titulo="Animales activos aptos para venta"
        items={items}
        etiquetaTotal="activos"
        mostrarCeros
        mensajeVacio="No hay animales activos para mostrar."
      />
    </TarjetaGrafico>
  )
}
