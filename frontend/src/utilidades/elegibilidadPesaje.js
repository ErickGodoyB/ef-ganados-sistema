/**
 * Elegibilidad de un animal para recibir un pesaje en una fecha (y,
 * opcionalmente, un lote) dados -- usado por las dos pestañas del modal
 * "Nuevo pesaje" (ver ModalNuevoPesaje.jsx) para decidir qué animales
 * ofrecer en el buscador y, si se escribe la caravana de uno que existe
 * pero no es elegible, qué motivo mostrar en vez de "Registrar animal
 * nuevo". Las reglas (salida registrada, ingreso posterior a la fecha, ya
 * pesado ese día) son las mismas que valida el backend al guardar (ver
 * AnimalService.validarPesaje): esto solo las anticipa en el cliente para
 * no dejar elegir algo que el servidor va a rechazar.
 *
 * "idsYaPesados" es el conjunto de animalId con un pesaje ACTIVO en esa
 * fecha (en el lote que corresponda según quien llame). "loteId" es
 * opcional: se pasa solo desde la pestaña "Por lote", donde además hay que
 * pertenecer al lote elegido; "sin-lote" es su valor especial para "sin
 * lote asignado" (mismo criterio que PestanaPorLote.jsx).
 */

import { formatearFecha } from './formato'

/**
 * Motivo (string, listo para mostrar) por el que el animal NO puede recibir
 * un pesaje con estos datos, o null si es elegible. Orden de las reglas:
 * salida (permanente) > lote (estructural) > ingreso posterior > ya pesado
 * ese día (la más "arreglable": basta con editar o anular el existente).
 */
export function motivoNoElegible(animal, fecha, idsYaPesados, loteId) {
  if (animal.aniFechaEgreso) {
    return `${animal.aniCaravana} tiene salida registrada`
  }

  if (loteId !== undefined) {
    const perteneceAlLote = loteId === 'sin-lote' ? animal.subGrupoId == null : String(animal.subGrupoId) === String(loteId)
    if (!perteneceAlLote) {
      return `${animal.aniCaravana} pertenece al lote ${animal.subGrupoDescripcion ?? 'Sin lote'}`
    }
  }

  if (fecha && animal.aniFechaIngreso > fecha) {
    return `${animal.aniCaravana} ingresó el ${formatearFecha(animal.aniFechaIngreso)}, posterior a la fecha elegida`
  }

  if (fecha && idsYaPesados?.has(animal.aniId)) {
    return `${animal.aniCaravana} ya tiene un pesaje el ${formatearFecha(fecha)}`
  }

  return null
}

/** true si el animal es elegible (motivoNoElegible devuelve null). */
export function animalEsElegibleParaPesaje(animal, fecha, idsYaPesados, loteId) {
  return motivoNoElegible(animal, fecha, idsYaPesados, loteId) == null
}
