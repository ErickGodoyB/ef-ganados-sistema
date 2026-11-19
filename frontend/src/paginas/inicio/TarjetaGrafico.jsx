/**
 * Marco común de los bloques de gráficos de Inicio (mejor proveedor, anillos,
 * línea): una tarjeta con título (h3, bajo el h2 de la sección) y, si hace
 * falta, controles a la derecha del título (ej. el selector Lotes/Grupos/
 * Razas). Así los cuatro bloques comparten espaciado y jerarquía de títulos.
 */

import './TarjetaGrafico.css'

export default function TarjetaGrafico({ titulo, controles, children }) {
  return (
    <div className="tarjeta-grafico tarjeta">
      <div className="tarjeta-grafico-encabezado">
        <h3 className="tarjeta-grafico-titulo">{titulo}</h3>
        {controles}
      </div>
      {children}
    </div>
  )
}
