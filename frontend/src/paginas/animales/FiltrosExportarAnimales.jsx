/**
 * Controles de filtro del modal de exportación de Animales: búsqueda por
 * caravana, estado de salida, lote, raza, proveedor, aptitud para venta, GMD
 * mínima y máxima, y el orden (caravana, GMD o peso actual). Las opciones de
 * lote, raza y proveedor son las mismas que ofrece el listado (salen de los
 * animales cargados). Cada campo tiene su <label>; los ids llevan el prefijo
 * "exportar-animales-" para no chocar con los del listado, que sigue
 * montado detrás del modal.
 */

import { OPCIONES_ORDEN_EXPORTACION } from './exportacionAnimales'

export default function FiltrosExportarAnimales({ filtros, cambiarFiltro, opciones }) {
  return (
    <>
      <div className="campo">
        <label htmlFor="exportar-animales-busqueda">Buscar por caravana</label>
        <input
          id="exportar-animales-busqueda"
          type="search"
          value={filtros.busqueda}
          onChange={(evento) => cambiarFiltro('busqueda', evento.target.value)}
          placeholder="Ej. CAR-001"
        />
      </div>

      <div className="campo">
        <label htmlFor="exportar-animales-salida">Estado de salida</label>
        <select
          id="exportar-animales-salida"
          value={filtros.estadoSalida}
          onChange={(evento) => cambiarFiltro('estadoSalida', evento.target.value)}
        >
          <option value="activos">Activos</option>
          <option value="salidos">Salidos</option>
          <option value="todos">Todos</option>
        </select>
      </div>

      <div className="campo">
        <label htmlFor="exportar-animales-lote">Lote</label>
        <select id="exportar-animales-lote" value={filtros.lote} onChange={(evento) => cambiarFiltro('lote', evento.target.value)}>
          <option value="todos">Todos los lotes</option>
          <option value="sin-lote">Sin lote</option>
          {opciones.lotes.map((opcion) => (
            <option key={opcion.valor} value={opcion.valor}>
              {opcion.etiqueta}
            </option>
          ))}
        </select>
      </div>

      <div className="campo">
        <label htmlFor="exportar-animales-raza">Raza</label>
        <select id="exportar-animales-raza" value={filtros.raza} onChange={(evento) => cambiarFiltro('raza', evento.target.value)}>
          <option value="todas">Todas las razas</option>
          {opciones.razas.map((opcion) => (
            <option key={opcion.valor} value={opcion.valor}>
              {opcion.etiqueta}
            </option>
          ))}
        </select>
      </div>

      <div className="campo">
        <label htmlFor="exportar-animales-proveedor">Proveedor</label>
        <select
          id="exportar-animales-proveedor"
          value={filtros.proveedor}
          onChange={(evento) => cambiarFiltro('proveedor', evento.target.value)}
        >
          <option value="todos">Todos los proveedores</option>
          <option value="sin-proveedor">Sin proveedor</option>
          {opciones.proveedores.map((opcion) => (
            <option key={opcion.valor} value={opcion.valor}>
              {opcion.etiqueta}
            </option>
          ))}
        </select>
      </div>

      <div className="campo">
        <label htmlFor="exportar-animales-aptitud">Aptitud para venta</label>
        <select
          id="exportar-animales-aptitud"
          value={filtros.estado}
          onChange={(evento) => cambiarFiltro('estado', evento.target.value)}
        >
          <option value="todos">Todos</option>
          <option value="aptos">Aptos para venta</option>
          <option value="no-aptos">No aptos</option>
        </select>
      </div>

      <div className="campo">
        <label htmlFor="exportar-animales-gmd-min">GMD mínima (kg/día)</label>
        <input
          id="exportar-animales-gmd-min"
          type="text"
          inputMode="decimal"
          value={filtros.gmdMin}
          onChange={(evento) => cambiarFiltro('gmdMin', evento.target.value)}
          placeholder="Ej. 0,8"
        />
      </div>

      <div className="campo">
        <label htmlFor="exportar-animales-gmd-max">GMD máxima (kg/día)</label>
        <input
          id="exportar-animales-gmd-max"
          type="text"
          inputMode="decimal"
          value={filtros.gmdMax}
          onChange={(evento) => cambiarFiltro('gmdMax', evento.target.value)}
          placeholder="Ej. 1,5"
        />
      </div>

      <div className="campo">
        <label htmlFor="exportar-animales-orden">Ordenar por</label>
        <select id="exportar-animales-orden" value={filtros.orden} onChange={(evento) => cambiarFiltro('orden', evento.target.value)}>
          {OPCIONES_ORDEN_EXPORTACION.map((opcion) => (
            <option key={opcion.valor} value={opcion.valor}>
              {opcion.etiqueta}
            </option>
          ))}
        </select>
      </div>
    </>
  )
}
