/**
 * Modal genérico de exportación de un listado a PDF o Excel. Cada listado lo
 * configura con lo suyo: el título, la definición de columnas (con cuáles
 * van marcadas de entrada), los controles de filtro (renderFiltros), cómo
 * obtener las filas a exportar con esos filtros (obtenerFilas) y cómo
 * describirlos en el archivo (describirFiltros). Lo común vive acá: la
 * elección de columnas, el formato (PDF o Excel), la orientación (solo PDF),
 * el conteo "Se exportarán N registros" y el botón "Generar".
 *
 * El modal trabaja con su PROPIA copia de los filtros, inicializada con los
 * de la pantalla: cambiarlos acá no cambia lo que se ve en el listado.
 * "Generar" queda deshabilitado (con un aviso) si no hay registros o si no
 * hay ninguna columna marcada, y en espera mientras se arma el archivo; si
 * falla, muestra un mensaje claro y deja el modal abierto para reintentar.
 * Los generadores (jsPDF, ExcelJS) se cargan con import() dinámico dentro de
 * ellos recién al generar, así que abrir el modal no agranda la carga.
 */

import { Download } from 'lucide-react'
import { useId, useMemo, useState } from 'react'
import { generarExcel } from '../utilidades/exportacion/generarExcel'
import { generarPdf } from '../utilidades/exportacion/generarPdf'
import Modal from './Modal'
import './ModalExportar.css'

/** "1 registro" / "N registros". */
function textoRegistros(cantidad) {
  return cantidad === 1 ? '1 registro' : `${cantidad} registros`
}

/**
 * @param {object} props
 * @param {string} props.titulo Título del listado (también el del archivo), ej. "Animales".
 * @param {string} props.listado Nombre base del archivo, ej. "animales" -> animales_aaaa-mm-dd.pdf.
 * @param {{clave: string, titulo: string, tipo?: string, alineacion?: string, decimales?: number, porDefecto?: boolean}[]} props.columnas
 *   Columnas disponibles (ver utilidades/exportacion/formatos.js); "porDefecto" marca las que arrancan incluidas.
 * @param {object} [props.filtrosIniciales] Filtros de la pantalla: se copian al abrir (vacío si no hay).
 * @param {(args: {filtros: object, cambiarFiltro: (nombre: string, valor: unknown) => void}) => import('react').ReactNode} [props.renderFiltros]
 *   Controles de filtro del listado. Si no se pasa (listados de solo lectura, o detalles que exportan
 *   todo lo que muestran), el modal no muestra la sección de filtros.
 * @param {(filtros: object) => object[]} props.obtenerFilas Filas a exportar con esos filtros (ya filtradas y ordenadas).
 * @param {(filtros: object) => {etiqueta: string, valor: string}[]} props.describirFiltros Filtros aplicados, para el encabezado del archivo
 *   (o, sin controles de filtro, el contexto de lo que se exporta: "Sesión: … · Lote: …").
 * @param {(filas: object[], filtros: object) => {etiqueta: string, valor: string}[]} [props.describirResumen]
 *   Datos de resumen de las filas a exportar, para la cabecera del archivo (opcional).
 * @param {string} [props.tituloModal] Título del diálogo; por defecto "Exportar <titulo>".
 * @param {string} props.usuario Quién genera el archivo.
 * @param {string} [props.aviso] Aviso fijo del modal (ej. que el archivo contiene datos personales).
 * @param {() => void} props.onCerrar
 * @param {(nombreArchivo: string) => void} [props.onGenerado] Se llama al terminar de descargar.
 * @param {{current: HTMLElement|null}} [props.refDisparador]
 */
export default function ModalExportar({
  titulo,
  listado,
  columnas,
  filtrosIniciales = {},
  renderFiltros,
  obtenerFilas,
  describirFiltros,
  describirResumen,
  tituloModal,
  usuario,
  aviso,
  onCerrar,
  onGenerado,
  refDisparador,
}) {
  const idBase = useId()
  const [filtros, setFiltros] = useState(filtrosIniciales)
  const [elegidas, setElegidas] = useState(() => new Set(columnas.filter((columna) => columna.porDefecto).map((columna) => columna.clave)))
  const [formato, setFormato] = useState('pdf')
  const [orientacion, setOrientacion] = useState('automatica')
  const [generando, setGenerando] = useState(false)
  const [error, setError] = useState('')

  const filas = useMemo(() => obtenerFilas(filtros), [obtenerFilas, filtros])
  const columnasElegidas = columnas.filter((columna) => elegidas.has(columna.clave))
  const sinRegistros = filas.length === 0
  const sinColumnas = columnasElegidas.length === 0

  function cambiarFiltro(nombre, valor) {
    setFiltros((actuales) => ({ ...actuales, [nombre]: valor }))
  }

  function alternarColumna(clave) {
    setElegidas((actuales) => {
      const siguientes = new Set(actuales)
      if (siguientes.has(clave)) {
        siguientes.delete(clave)
      } else {
        siguientes.add(clave)
      }
      return siguientes
    })
  }

  async function generar() {
    setGenerando(true)
    setError('')
    try {
      const resumen = describirResumen?.(filas, filtros)
      const datos = {
        listado,
        titulo,
        filtros: describirFiltros(filtros),
        columnas: columnasElegidas,
        filas,
        usuario,
        // Sin resumen el archivo queda exactamente igual que antes.
        ...(resumen && resumen.length > 0 ? { resumen } : {}),
      }
      const nombre =
        formato === 'pdf' ? await generarPdf({ ...datos, orientacion }) : await generarExcel(datos)
      onGenerado?.(nombre)
      onCerrar()
    } catch {
      setError('No se pudo generar el archivo. Probá de nuevo; si sigue fallando, avisá al administrador.')
      setGenerando(false)
    }
  }

  return (
    <Modal titulo={tituloModal ?? `Exportar ${titulo.toLowerCase()}`} onCerrar={generando ? () => {} : onCerrar} refDisparador={refDisparador} tamano="grande">
      <div className="exportar">
        {aviso && (
          <p className="exportar-aviso" role="note">
            {aviso}
          </p>
        )}

        {renderFiltros && (
          <fieldset className="exportar-grupo" disabled={generando}>
            <legend>Filtros</legend>
            <div className="exportar-filtros">{renderFiltros({ filtros, cambiarFiltro })}</div>
          </fieldset>
        )}

        <fieldset className="exportar-grupo" disabled={generando}>
          <legend>Columnas</legend>
          <div className="exportar-columnas">
            {columnas.map((columna) => (
              <label key={columna.clave} className="exportar-opcion" htmlFor={`${idBase}-col-${columna.clave}`}>
                <input
                  id={`${idBase}-col-${columna.clave}`}
                  type="checkbox"
                  checked={elegidas.has(columna.clave)}
                  onChange={() => alternarColumna(columna.clave)}
                />
                {columna.titulo}
              </label>
            ))}
          </div>
          {sinColumnas && (
            <p className="exportar-advertencia" role="alert">
              Elegí al menos una columna.
            </p>
          )}
        </fieldset>

        <fieldset className="exportar-grupo" disabled={generando}>
          <legend>Formato</legend>
          <div className="exportar-opciones">
            <label className="exportar-opcion" htmlFor={`${idBase}-formato-pdf`}>
              <input
                id={`${idBase}-formato-pdf`}
                type="radio"
                name={`${idBase}-formato`}
                checked={formato === 'pdf'}
                onChange={() => setFormato('pdf')}
              />
              PDF
            </label>
            <label className="exportar-opcion" htmlFor={`${idBase}-formato-excel`}>
              <input
                id={`${idBase}-formato-excel`}
                type="radio"
                name={`${idBase}-formato`}
                checked={formato === 'excel'}
                onChange={() => setFormato('excel')}
              />
              Excel
            </label>
          </div>
        </fieldset>

        {formato === 'pdf' && (
          <fieldset className="exportar-grupo" disabled={generando}>
            <legend>Orientación del PDF</legend>
            <div className="exportar-opciones">
              {[
                { valor: 'automatica', etiqueta: 'Automática' },
                { valor: 'vertical', etiqueta: 'Vertical' },
                { valor: 'horizontal', etiqueta: 'Horizontal' },
              ].map((opcion) => (
                <label key={opcion.valor} className="exportar-opcion" htmlFor={`${idBase}-orientacion-${opcion.valor}`}>
                  <input
                    id={`${idBase}-orientacion-${opcion.valor}`}
                    type="radio"
                    name={`${idBase}-orientacion`}
                    checked={orientacion === opcion.valor}
                    onChange={() => setOrientacion(opcion.valor)}
                  />
                  {opcion.etiqueta}
                </label>
              ))}
            </div>
            <p className="exportar-ayuda">Automática: horizontal si elegís más de 6 columnas.</p>
          </fieldset>
        )}

        <p className="exportar-conteo" role="status">
          Se exportarán {textoRegistros(filas.length)}
        </p>
        {sinRegistros && (
          <p className="exportar-advertencia" role="alert">
            No hay registros con estos filtros: cambialos para poder generar el archivo.
          </p>
        )}

        {error && (
          <p className="exportar-error" role="alert">
            {error}
          </p>
        )}

        <div className="exportar-acciones">
          <button type="button" className="boton-secundario" onClick={onCerrar} disabled={generando}>
            Cancelar
          </button>
          <button
            type="button"
            className="boton-primario exportar-generar"
            onClick={generar}
            disabled={generando || sinRegistros || sinColumnas}
            aria-busy={generando}
          >
            <Download aria-hidden="true" size={16} />
            {generando ? 'Generando…' : 'Generar'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
