/**
 * Función pura para buscar en el listado de pesajes anulados (RF011) por
 * caravana. El filtro por fecha (desde/hasta) ya lo hace el backend (ver
 * GET /api/pesajes/anulados) y el orden (más recientes primero) también
 * viene dado; acá solo queda filtrar por lo que se escribe en el buscador,
 * igual que listadoSesiones.js/listadoAnimales.js.
 */

/** Filtra los anulados por caravana (sin distinguir mayúsculas). Devuelve un array nuevo; no modifica "anulados". */
export function filtrarAnulados(anulados, busqueda) {
  const termino = busqueda.trim().toLowerCase()
  if (!termino) {
    return anulados
  }
  return anulados.filter((item) => item.caravana?.toLowerCase().includes(termino))
}
