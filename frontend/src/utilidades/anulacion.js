/**
 * Validación del motivo de una anulación (pesaje puntual o sesión
 * completa), usada por SelectorMotivoAnulacion.jsx antes de llamar al
 * backend. Misma regla que el servidor (ver PesajeService.validarMotivo):
 * entre 3 y 255 caracteres.
 */
export function motivoEsValido(motivo) {
  const largo = motivo.trim().length
  return largo >= 3 && largo <= 255
}
