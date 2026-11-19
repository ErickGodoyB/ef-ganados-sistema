/**
 * Controles de filtro del modal de exportación de sesiones de pesaje:
 * búsqueda (por lote, grupo o código), lote y el intervalo de fechas (dos
 * campos de fecha, "Desde" y "Hasta", como los de cualquier formulario: más
 * simples y accesibles dentro de un modal que el panel emergente de
 * Intervalo). Los ids llevan el prefijo "exportar-sesiones-" para no chocar
 * con los del listado, que sigue montado detrás del modal.
 */

export default function FiltrosExportarSesiones({ filtros, cambiarFiltro, lotes }) {
  return (
    <>
      <div className="campo">
        <label htmlFor="exportar-sesiones-busqueda">Buscar por lote, grupo o código de sesión</label>
        <input
          id="exportar-sesiones-busqueda"
          type="search"
          value={filtros.busqueda}
          onChange={(evento) => cambiarFiltro('busqueda', evento.target.value)}
          placeholder="Ej. Recría o S-261029-3"
        />
      </div>

      <div className="campo">
        <label htmlFor="exportar-sesiones-lote">Lote</label>
        <select id="exportar-sesiones-lote" value={filtros.lote} onChange={(evento) => cambiarFiltro('lote', evento.target.value)}>
          <option value="todos">Todos los lotes</option>
          <option value="sin-lote">Sin lote</option>
          {lotes.map((opcion) => (
            <option key={opcion.valor} value={opcion.valor}>
              {opcion.etiqueta}
            </option>
          ))}
        </select>
      </div>

      <div className="campo">
        <label htmlFor="exportar-sesiones-desde">Desde</label>
        <input
          id="exportar-sesiones-desde"
          type="date"
          value={filtros.desde}
          max={filtros.hasta || undefined}
          onChange={(evento) => cambiarFiltro('desde', evento.target.value)}
        />
      </div>

      <div className="campo">
        <label htmlFor="exportar-sesiones-hasta">Hasta</label>
        <input
          id="exportar-sesiones-hasta"
          type="date"
          value={filtros.hasta}
          min={filtros.desde || undefined}
          onChange={(evento) => cambiarFiltro('hasta', evento.target.value)}
        />
      </div>
    </>
  )
}
