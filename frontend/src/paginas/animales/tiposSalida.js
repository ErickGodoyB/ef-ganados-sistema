/**
 * Motivos de salida permitidos (mismos valores que el backend, ver
 * AnimalService en el backend): única fuente de las opciones del select
 * de "Registrar salida" y de la etiqueta "Salió" de la tabla/tarjeta/
 * detalle cuando el animal ya tiene salida registrada.
 */

export const MOTIVOS_SALIDA = [
  { valor: 'VENTA', etiqueta: 'Venta' },
  { valor: 'MUERTE', etiqueta: 'Muerte' },
  { valor: 'OTRO', etiqueta: 'Otro' },
]

/** Etiqueta legible de un motivo de salida; el valor crudo si no se reconoce. */
export function etiquetaMotivoSalida(valor) {
  return MOTIVOS_SALIDA.find((motivo) => motivo.valor === valor)?.etiqueta ?? valor
}
