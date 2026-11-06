/**
 * Aviso (no bloqueante) para cuando se va a registrar un pesaje con una
 * fecha anterior a la del último pesaje ACTIVO que el animal ya tiene
 * ("fechaUltimoPesaje", que trae el resumen -ver AnimalResumen en el
 * backend-): ese pesaje nuevo se intercala antes en el tiempo, así que
 * recalcula la GMD de los pesajes posteriores (ver
 * AnimalService.calcularGmdEntre en el backend). El código de la sesión
 * donde está ese pesaje posterior se arma con esa misma fecha y el lote
 * ACTUAL del animal (no hay forma de saber qué lote tenía en ese momento).
 *
 * Devuelve null si no aplica: sin fechaUltimoPesaje (el animal no tiene
 * pesajes, o el campo todavía no llegó del backend -una API vieja, o un
 * mock de prueba sin ese campo- en cuyo caso no hay que romper, solo no
 * avisar nada) o si la fecha nueva no es anterior a ella.
 */
import { calcularCodigoSesion } from './codigoSesion'
import { formatearFecha } from './formato'

export function avisoPesajeRetroactivo(caravana, fecha, fechaUltimoPesaje, subGrupoId) {
  if (!fechaUltimoPesaje || !fecha || fecha >= fechaUltimoPesaje) {
    return null
  }
  const codigo = calcularCodigoSesion(fechaUltimoPesaje, subGrupoId)
  return `${caravana} ya tiene un pesaje posterior (${formatearFecha(fechaUltimoPesaje)}, sesión ${codigo}). Este pesaje se guardará antes y recalculará la ganancia diaria de los posteriores.`
}
