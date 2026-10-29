/**
 * Valor de GMD formateado (ver utilidades/formato.js). Si es null (el
 * animal, o el pesaje, todavía no tiene los dos pesajes necesarios para
 * calcularla), se muestra "—" con un title y un aria-label que explican
 * por qué, para que no parezca un dato roto sino uno que todavía no
 * existe. Usado por Animales (celdasAnimal.jsx, ModalDetalleAnimal.jsx) y
 * por Pesajes (el detalle de una sesión).
 */

import { formatearGmd } from '../utilidades/formato'

export default function ValorGmd({ gmd }) {
  const esDesconocido = gmd == null

  return (
    <span
      title={esDesconocido ? 'Se necesitan al menos 2 pesajes' : undefined}
      aria-label={esDesconocido ? 'Se necesitan al menos 2 pesajes' : undefined}
    >
      {formatearGmd(gmd)}
    </span>
  )
}
