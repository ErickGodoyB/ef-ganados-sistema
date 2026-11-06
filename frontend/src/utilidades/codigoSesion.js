/**
 * Código legible y estable para una sesión de pesaje (RF011): las sesiones
 * no son una entidad con id propio en el backend, son un agregado de
 * pesajes por fecha + lote (ver PesajesRepository.resumenDeSesiones), así
 * que este código se deriva siempre de esos mismos dos datos en vez de
 * depender de un id que no existe. Formato: "S-AAAAMMDD-N", donde N es el
 * id del lote (subGrupoId) o 0 para "Sin lote". Ej.: "S-20261029-3".
 */
export function calcularCodigoSesion(fecha, subGrupoId) {
  const fechaCompacta = fecha.replaceAll('-', '')
  return `S-${fechaCompacta}-${subGrupoId ?? 0}`
}
