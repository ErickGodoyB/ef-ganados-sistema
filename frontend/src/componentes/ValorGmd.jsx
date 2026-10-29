/**
 * Valor de GMD formateado (ver utilidades/formato.js). Si es null (el
 * animal, o el pesaje, todavía no tiene los dos pesajes necesarios para
 * calcularla), se muestra "—" con un title y un aria-label que explican
 * por qué, para que no parezca un dato roto sino uno que todavía no
 * existe. Si es negativa (el animal perdió peso), se destaca con color de
 * alerta, un ícono y texto accesible "Pérdida de peso": nunca solo con
 * color, para quien no distingue el rojo. Usado por Animales
 * (celdasAnimal.jsx, ModalDetalleAnimal.jsx) y por Pesajes (el detalle de
 * una sesión y su resumen).
 */

import { TrendingDown } from 'lucide-react'
import { formatearGmd } from '../utilidades/formato'

export default function ValorGmd({ gmd }) {
  const esDesconocido = gmd == null
  const esNegativo = !esDesconocido && gmd < 0

  return (
    <span
      className={esNegativo ? 'valor-negativo' : undefined}
      title={esDesconocido ? 'Se necesitan al menos 2 pesajes' : undefined}
      aria-label={esDesconocido ? 'Se necesitan al menos 2 pesajes' : undefined}
    >
      {esNegativo && <TrendingDown aria-hidden="true" size={14} />}
      {esNegativo && <span className="visualmente-oculto">Pérdida de peso: </span>}
      {formatearGmd(gmd)}
    </span>
  )
}
