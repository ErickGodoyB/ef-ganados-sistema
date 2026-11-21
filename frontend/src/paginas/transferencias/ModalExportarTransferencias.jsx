/**
 * Modal de exportación del listado de Transferencias. La pantalla trae las
 * transferencias del intervalo que tiene aplicado (el filtro de fechas se
 * hace en el servidor), pero acá el intervalo se puede cambiar, también
 * hacia afuera de ese rango; por eso este modal pide por su cuenta la lista
 * COMPLETA (GET /api/transferencias, sin fechas) y aplica todos los filtros
 * (búsqueda, intervalo y motivo) sobre ella. Mientras carga, o si falla,
 * muestra su estado en un modal simple, con "Reintentar".
 */

import { RefreshCw, TriangleAlert } from 'lucide-react'
import { useCallback } from 'react'
import Modal from '../../componentes/Modal'
import ModalExportar from '../../componentes/ModalExportar'
import { useUsuarioExportacion } from '../../utilidades/exportacion/useUsuarioExportacion'
import {
  COLUMNAS_TRANSFERENCIAS,
  describirFiltrosTransferencias,
  filasDeTransferenciasParaExportar,
  totalesDeTransferencias,
} from './exportacionTransferencias'
import FiltrosExportarTransferencias from './FiltrosExportarTransferencias'
import { useTransferencias } from './useTransferencias'

/**
 * @param {object} props
 * @param {{busqueda: string, desde: string, hasta: string, motivo: string}} props.filtrosIniciales Filtros de la pantalla.
 * @param {() => void} props.onCerrar
 * @param {(nombreArchivo: string) => void} [props.onGenerado]
 * @param {{current: HTMLElement|null}} [props.refDisparador]
 */
export default function ModalExportarTransferencias({ filtrosIniciales, onCerrar, onGenerado, refDisparador }) {
  const { transferencias, cargando, error, recargar } = useTransferencias('', '')
  const usuario = useUsuarioExportacion()
  const obtenerFilas = useCallback((filtros) => filasDeTransferenciasParaExportar(transferencias, filtros), [transferencias])

  if (cargando || error) {
    return (
      <Modal titulo="Exportar transferencias" onCerrar={onCerrar} refDisparador={refDisparador}>
        {cargando && <p role="status">Cargando transferencias…</p>}
        {!cargando && error && (
          <div className="estado-mensaje">
            <TriangleAlert aria-hidden="true" size={32} className="estado-mensaje-icono" />
            <p>{error}</p>
            <button type="button" className="boton boton-secundario" onClick={recargar}>
              <RefreshCw aria-hidden="true" size={16} />
              Reintentar
            </button>
          </div>
        )}
      </Modal>
    )
  }

  return (
    <ModalExportar
      titulo="Transferencias"
      listado="transferencias"
      columnas={COLUMNAS_TRANSFERENCIAS}
      filtrosIniciales={filtrosIniciales}
      renderFiltros={({ filtros, cambiarFiltro }) => <FiltrosExportarTransferencias filtros={filtros} cambiarFiltro={cambiarFiltro} />}
      obtenerFilas={obtenerFilas}
      describirFiltros={describirFiltrosTransferencias}
      describirTotales={totalesDeTransferencias}
      usuario={usuario}
      onCerrar={onCerrar}
      onGenerado={onGenerado}
      refDisparador={refDisparador}
    />
  )
}
