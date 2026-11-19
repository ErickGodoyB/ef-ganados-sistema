/**
 * Controles de filtro del modal de exportación de Personas: búsqueda (por
 * nombre, apellido, CI o RUC) y tipo. Los ids llevan el prefijo
 * "exportar-personas-" para no chocar con los del listado, que sigue montado
 * detrás del modal.
 */

import { TIPOS_PERSONA } from './tiposPersona'

export default function FiltrosExportarPersonas({ filtros, cambiarFiltro }) {
  return (
    <>
      <div className="campo">
        <label htmlFor="exportar-personas-busqueda">Buscar por nombre, apellido, CI o RUC</label>
        <input
          id="exportar-personas-busqueda"
          type="search"
          value={filtros.busqueda}
          onChange={(evento) => cambiarFiltro('busqueda', evento.target.value)}
          placeholder="Ej. Juan Pérez"
        />
      </div>

      <div className="campo">
        <label htmlFor="exportar-personas-tipo">Tipo</label>
        <select id="exportar-personas-tipo" value={filtros.tipo} onChange={(evento) => cambiarFiltro('tipo', evento.target.value)}>
          <option value="todos">Todos</option>
          {TIPOS_PERSONA.map((tipo) => (
            <option key={tipo.valor} value={tipo.valor}>
              {tipo.plural}
            </option>
          ))}
        </select>
      </div>
    </>
  )
}
