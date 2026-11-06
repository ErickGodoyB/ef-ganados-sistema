/**
 * Código legible y estable para una sesión de pesaje (RF011): las sesiones
 * no son una entidad con id propio en el backend, son un agregado de
 * pesajes por fecha + lote (ver PesajesRepository.resumenDeSesiones), así
 * que este código se deriva siempre de esos mismos dos datos en vez de
 * depender de un id que no existe. Formato: "S-AAMMDD-N" (año de 2
 * cifras, para que el código quede corto y quepa como chip), donde N es
 * el id del lote (subGrupoId) o 0 para "Sin lote". Ej.: "S-261029-3" para
 * el 29/10/2026, lote 3.
 */
export function calcularCodigoSesion(fecha, subGrupoId) {
  const [anio, mes, dia] = fecha.split('-')
  return `S-${anio.slice(-2)}${mes}${dia}-${subGrupoId ?? 0}`
}
