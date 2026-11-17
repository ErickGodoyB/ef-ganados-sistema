/**
 * Motivos de una transferencia entre lotes (ver MotivoTransferencia en el
 * backend). Los tres primeros se pueden elegir al registrarla; DEVOLUCION
 * solo la genera el sistema al devolver una transferencia, así que no está
 * en la lista de opciones del formulario pero sí tiene etiqueta para
 * mostrarse en el historial.
 */

export const MOTIVOS_ELEGIBLES = [
  { valor: 'SELECCION', etiqueta: 'Selección' },
  { valor: 'SANITARIO', etiqueta: 'Sanitario' },
  { valor: 'OTRO', etiqueta: 'Otro' },
]

const ETIQUETAS = {
  SELECCION: 'Selección',
  SANITARIO: 'Sanitario',
  OTRO: 'Otro',
  DEVOLUCION: 'Devolución',
}

/** Etiqueta legible de un motivo; si llega uno desconocido, se muestra tal cual en vez de romper. */
export function etiquetaMotivoTransferencia(motivo) {
  return ETIQUETAS[motivo] ?? motivo ?? ''
}

/** Largo máximo de la nota de una transferencia (el backend rechaza más de 255). */
export const LARGO_MAXIMO_NOTA = 255

/** "1 animal" / "N animales". */
export function textoCantidadAnimales(cantidad) {
  return cantidad === 1 ? '1 animal' : `${cantidad} animales`
}

/** Texto "origen → destino" de una transferencia: varios lotes se unen con coma ("Lote A, Lote C → Lote B"). */
export function textoOrigenDestino(origenes, destinos) {
  return `${(origenes ?? []).join(', ')} → ${(destinos ?? []).join(', ')}`
}
