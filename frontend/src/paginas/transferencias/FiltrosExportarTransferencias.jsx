/**
 * Controles de filtro del modal de exportación de Transferencias: búsqueda
 * (por lote, responsable o motivo), intervalo de fechas (dos campos "Desde" y
 * "Hasta") y motivo. Los ids llevan el prefijo "exportar-transferencias-"
 * para no chocar con los del listado, que sigue montado detrás del modal.
 */

import { MOTIVOS_FILTRO } from './exportacionTransferencias'

export default function FiltrosExportarTransferencias({ filtros, cambiarFiltro }) {
  return (
    <>
      <div className="campo">
        <label htmlFor="exportar-transferencias-busqueda">Buscar por lote, responsable o motivo</label>
        <input
          id="exportar-transferencias-busqueda"
          type="search"
          value={filtros.busqueda}
          onChange={(evento) => cambiarFiltro('busqueda', evento.target.value)}
          placeholder="Ej. Recría, Ana o sanitario"
        />
      </div>

      <div className="campo">
        <label htmlFor="exportar-transferencias-motivo">Motivo</label>
        <select
          id="exportar-transferencias-motivo"
          value={filtros.motivo}
          onChange={(evento) => cambiarFiltro('motivo', evento.target.value)}
        >
          <option value="todos">Todos los motivos</option>
          {MOTIVOS_FILTRO.map((motivo) => (
            <option key={motivo.valor} value={motivo.valor}>
              {motivo.etiqueta}
            </option>
          ))}
        </select>
      </div>

      <div className="campo">
        <label htmlFor="exportar-transferencias-desde">Desde</label>
        <input
          id="exportar-transferencias-desde"
          type="date"
          value={filtros.desde}
          max={filtros.hasta || undefined}
          onChange={(evento) => cambiarFiltro('desde', evento.target.value)}
        />
      </div>

      <div className="campo">
        <label htmlFor="exportar-transferencias-hasta">Hasta</label>
        <input
          id="exportar-transferencias-hasta"
          type="date"
          value={filtros.hasta}
          min={filtros.desde || undefined}
          onChange={(evento) => cambiarFiltro('hasta', evento.target.value)}
        />
      </div>
    </>
  )
}
