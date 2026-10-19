/**
 * Lote de un animal: la descripción del subgrupo y, abajo, en texto
 * secundario, la del grupo. Muestra "Sin lote" si el animal no tiene
 * subgrupo asignado (así viene subGrupoDescripcion desde
 * /api/animales/resumen cuando el animal no tiene subgrupo).
 */

import './LoteInfo.css'

export default function LoteInfo({ subGrupoDescripcion, grupoDescripcion }) {
  if (!subGrupoDescripcion) {
    return <span className="lote-info-sin-lote">Sin lote</span>
  }

  return (
    <span className="lote-info">
      <span className="lote-info-subgrupo">{subGrupoDescripcion}</span>
      {grupoDescripcion && <span className="lote-info-grupo">{grupoDescripcion}</span>}
    </span>
  )
}
