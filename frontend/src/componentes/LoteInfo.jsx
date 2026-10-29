/**
 * Lote (subgrupo): su descripción y, abajo, en texto secundario, la del
 * grupo contenedor. Muestra "Sin lote" si subGrupoDescripcion viene vacío
 * (así lo mandan tanto /api/animales/resumen como /api/pesajes/sesiones
 * cuando no hay subgrupo asignado). Usado por Animales (celdasAnimal.jsx)
 * y por Pesajes (celdasSesion.jsx).
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
