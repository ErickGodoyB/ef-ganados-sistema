/**
 * Funciones puras de peso compartidas por los formularios de pesaje
 * (PestanaPorLote, PestanaIndividual, AgregarAnimalSesion, TablaItemsSesion,
 * TarjetaItemSesion) y de animal (FormularioAnimal): parseo de texto a
 * número (acepta coma o punto decimal) y la regla de negocio de rango
 * (mayor a 0 y hasta 2000 kg, ver CLAUDE.md).
 */

/** Convierte el texto de un campo de peso (acepta coma o punto) a número; NaN si no es un número válido. */
export function parsearPeso(texto) {
  const normalizado = texto.trim().replace(',', '.')
  return normalizado === '' ? NaN : Number(normalizado)
}

/** Regla de rango del peso: mayor a 0 y hasta 2000 kg. */
export function pesoEsValido(numero) {
  return !Number.isNaN(numero) && numero > 0 && numero <= 2000
}

/** Valida directamente el texto de un campo de peso: no vacío, parseable y en rango. */
export function pesoTextoEsValido(texto) {
  return texto.trim() !== '' && pesoEsValido(parsearPeso(texto))
}

/**
 * Diferencia entre el peso nuevo y el anterior (para ValorDiferenciaPeso):
 * null si falta cualquiera de los dos o no son números, para distinguir "no
 * hay con qué comparar" de una diferencia de 0.
 */
export function calcularDiferenciaPeso(pesoNuevo, pesoAnterior) {
  if (pesoNuevo == null || pesoAnterior == null || Number.isNaN(pesoNuevo) || Number.isNaN(pesoAnterior)) {
    return null
  }
  return pesoNuevo - pesoAnterior
}
