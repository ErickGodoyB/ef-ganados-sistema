/**
 * Filtrado del catálogo de grupos y lotes por texto de búsqueda: coincide
 * con la descripción del grupo o la de cualquiera de sus lotes, sin
 * distinguir mayúsculas. Un grupo que coincide por uno de sus lotes se
 * muestra igual (ver GruposYLotes.jsx, que además lo abre para que esa
 * coincidencia quede visible sin un clic más).
 */

/** Indica si el grupo coincide con el texto de búsqueda (ya en minúsculas), por su propio nombre o el de alguno de sus lotes. */
export function grupoTieneCoincidencia(grupo, textoEnMinusculas) {
  if (grupo.grpDescripcion.toLowerCase().includes(textoEnMinusculas)) {
    return true
  }
  return grupo.lotes.some((lote) => lote.sbDescripcion.toLowerCase().includes(textoEnMinusculas))
}

/** Filtra la lista de grupos por el texto de búsqueda tal como lo escribió la persona (sin recortar ni normalizar acá). */
export function filtrarGrupos(grupos, busqueda) {
  const texto = busqueda.trim().toLowerCase()
  if (!texto) {
    return grupos
  }
  return grupos.filter((grupo) => grupoTieneCoincidencia(grupo, texto))
}
