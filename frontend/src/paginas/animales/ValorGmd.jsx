/**
 * Valor de GMD formateado (ver formato.js). Si es null (el animal todavía
 * no tiene los dos pesajes necesarios), se muestra "—" con un title y un
 * aria-label que explican por qué, para que no parezca un dato roto sino
 * uno que todavía no existe.
 */

import { formatearGmd } from './formato'

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
