/**
 * Controles de paginación del listado: texto "Mostrando X–Y de Z · Página
 * N de M" y los botones Anterior/Siguiente (deshabilitados en los
 * extremos). Este componente solo muestra y cambia la página dentro del
 * total ya calculado; quien vuelve a la página 1 al cambiar la búsqueda,
 * los filtros o el orden es Animales.jsx.
 */

import { ChevronLeft, ChevronRight } from 'lucide-react'

export default function Paginacion({ paginaActual, totalPaginas, totalResultados, filasPorPagina, onCambiarPagina }) {
  const primeraFilaMostrada = totalResultados === 0 ? 0 : (paginaActual - 1) * filasPorPagina + 1
  const ultimaFilaMostrada = Math.min(paginaActual * filasPorPagina, totalResultados)

  return (
    <div className="paginacion">
      <p className="paginacion-texto">
        Mostrando {primeraFilaMostrada}–{ultimaFilaMostrada} de {totalResultados} · Página {paginaActual} de{' '}
        {totalPaginas}
      </p>
      <div className="paginacion-botones">
        <button
          type="button"
          className="boton boton-secundario"
          onClick={() => onCambiarPagina(paginaActual - 1)}
          disabled={paginaActual <= 1}
        >
          <ChevronLeft aria-hidden="true" size={16} />
          Anterior
        </button>
        <button
          type="button"
          className="boton boton-secundario"
          onClick={() => onCambiarPagina(paginaActual + 1)}
          disabled={paginaActual >= totalPaginas}
        >
          Siguiente
          <ChevronRight aria-hidden="true" size={16} />
        </button>
      </div>
    </div>
  )
}
