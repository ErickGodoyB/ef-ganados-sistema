/**
 * Modal "Ver animales" del reporte de rendimiento por proveedor: los
 * animales de un proveedor (o los que no tienen proveedor) con su
 * rendimiento acumulado, ya ordenados por el servidor de mayor a menor GMD
 * acumulado (GET /api/reportes/proveedores/animales?proveedorId=&soloActivos=).
 * Sin proveedorId el servidor devuelve los animales sin proveedor, así que
 * para "Sin proveedor" simplemente no se manda ese parámetro. Tabla desde
 * 768px y tarjetas en celular (se ve una u otra por CSS).
 */

import { RefreshCw, TriangleAlert } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { peticionProtegida } from '../../api/cliente'
import BotonExportar from '../../componentes/BotonExportar'
import Modal from '../../componentes/Modal'
import ModalExportar from '../../componentes/ModalExportar'
import { useUsuarioExportacion } from '../../utilidades/exportacion/useUsuarioExportacion'
import { formatearFecha, formatearGmd, formatearPeso } from '../../utilidades/formato'
import { etiquetaMotivoSalida } from '../animales/tiposSalida'
import { COLUMNAS_ANIMALES_PROVEEDOR, contextoDeProveedor, filaDeAnimalProveedor } from './exportacionProveedores'
import './ModalAnimalesProveedor.css'

/** "Activo" tal cual, o el motivo de salida legible (VENTA → "Venta"). */
function textoEstado(estado) {
  return estado === 'Activo' ? estado : etiquetaMotivoSalida(estado)
}

/** GMD acumulada con el mismo formato en tabla y tarjeta; "—" si el animal no tiene dato. */
function Gmd({ valor }) {
  return <span className={valor != null && valor < 0 ? 'valor-negativo' : undefined}>{formatearGmd(valor)}</span>
}

export default function ModalAnimalesProveedor({ proveedorId, proveedorNombre, soloActivos, onCerrar, refDisparador }) {
  const [animales, setAnimales] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const cargar = useCallback(async () => {
    setCargando(true)
    setError('')
    try {
      const parametros = new URLSearchParams()
      if (proveedorId != null) {
        parametros.set('proveedorId', String(proveedorId))
      }
      parametros.set('soloActivos', String(soloActivos))
      const datos = await peticionProtegida(`/api/reportes/proveedores/animales?${parametros.toString()}`)
      setAnimales(Array.isArray(datos) ? datos : [])
    } catch {
      setError('No se pudieron cargar los animales de este proveedor.')
    } finally {
      setCargando(false)
    }
  }, [proveedorId, soloActivos])

  useEffect(() => {
    // Ver la justificación de este mismo patrón en useAnimalesResumen.js.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargar()
  }, [cargar])

  // Exportación (PDF/Excel) de esta lista, sin filtros: el proveedor va como contexto.
  const [modalExportarAbierto, setModalExportarAbierto] = useState(false)
  const refBotonExportar = useRef(null)
  const usuarioExportacion = useUsuarioExportacion()
  const obtenerFilasExportacion = useCallback(
    () => animales.map((animal) => filaDeAnimalProveedor(animal, textoEstado)),
    [animales],
  )
  const describirContexto = useCallback(() => contextoDeProveedor(proveedorNombre, soloActivos), [proveedorNombre, soloActivos])

  return (
    <Modal titulo={`Animales de ${proveedorNombre}`} onCerrar={onCerrar} refDisparador={refDisparador} tamano="grande">
      {cargando && <p role="status">Cargando animales…</p>}

      {!cargando && error && (
        <div className="estado-mensaje tarjeta">
          <TriangleAlert aria-hidden="true" size={40} className="estado-mensaje-icono" />
          <p>{error}</p>
          <button type="button" className="boton boton-secundario" onClick={cargar}>
            <RefreshCw aria-hidden="true" size={16} />
            Reintentar
          </button>
        </div>
      )}

      {!cargando && !error && animales.length === 0 && (
        <p className="animales-proveedor-vacio">
          {soloActivos ? 'No hay animales activos para este proveedor.' : 'No hay animales para este proveedor.'}
        </p>
      )}

      {!cargando && !error && animales.length > 0 && (
        <>
          <div className="animales-proveedor-barra">
            <p className="animales-proveedor-orden">Ordenados por GMD acumulado, de mayor a menor.</p>
            <BotonExportar
              onClick={(evento) => {
                refBotonExportar.current = evento.currentTarget
                setModalExportarAbierto(true)
              }}
            />
          </div>

          <div className="animales-proveedor-tabla-solo-escritorio">
            <table className="animales-proveedor-tabla">
              <caption className="visualmente-oculto">Animales de {proveedorNombre}</caption>
              <thead>
                <tr>
                  <th scope="col">Caravana</th>
                  <th scope="col">Raza</th>
                  <th scope="col">Lote</th>
                  <th scope="col">Ingreso</th>
                  <th scope="col">Peso inicial</th>
                  <th scope="col">Peso actual</th>
                  <th scope="col">Ganancia</th>
                  <th scope="col">GMD acumulado</th>
                  <th scope="col">Estado</th>
                </tr>
              </thead>
              <tbody>
                {animales.map((animal) => (
                  <tr key={animal.animalId}>
                    <th scope="row" className="animales-proveedor-caravana">
                      {animal.caravana}
                    </th>
                    <td>{animal.razaDescripcion}</td>
                    <td>{animal.loteDescripcion || 'Sin lote'}</td>
                    <td>{formatearFecha(animal.aniFechaIngreso)}</td>
                    <td>{formatearPeso(animal.aniPesoInicial)}</td>
                    <td>{formatearPeso(animal.pesoActual)}</td>
                    <td>{formatearPeso(animal.gananciaKg)}</td>
                    <td>
                      <Gmd valor={animal.gmdAcumulado} />
                    </td>
                    <td>{textoEstado(animal.estado)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="animales-proveedor-tarjetas-solo-movil">
            {animales.map((animal) => (
              <article key={animal.animalId} className="animales-proveedor-tarjeta tarjeta">
                <div className="animales-proveedor-tarjeta-encabezado">
                  <span className="animales-proveedor-caravana">{animal.caravana}</span>
                  <span className="badge">{textoEstado(animal.estado)}</span>
                </div>
                <dl className="animales-proveedor-tarjeta-datos">
                  <div>
                    <dt>Raza</dt>
                    <dd>{animal.razaDescripcion}</dd>
                  </div>
                  <div>
                    <dt>Lote</dt>
                    <dd>{animal.loteDescripcion || 'Sin lote'}</dd>
                  </div>
                  <div>
                    <dt>Ingreso</dt>
                    <dd>{formatearFecha(animal.aniFechaIngreso)}</dd>
                  </div>
                  <div>
                    <dt>Peso inicial</dt>
                    <dd>{formatearPeso(animal.aniPesoInicial)}</dd>
                  </div>
                  <div>
                    <dt>Peso actual</dt>
                    <dd>{formatearPeso(animal.pesoActual)}</dd>
                  </div>
                  <div>
                    <dt>Ganancia</dt>
                    <dd>{formatearPeso(animal.gananciaKg)}</dd>
                  </div>
                  <div className="animales-proveedor-dato--ancho">
                    <dt>GMD acumulado</dt>
                    <dd>
                      <Gmd valor={animal.gmdAcumulado} />
                    </dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        </>
      )}

      {modalExportarAbierto && (
        <ModalExportar
          titulo={`Animales de ${proveedorNombre}`}
          tituloModal="Exportar animales del proveedor"
          listado={`animales-de-${proveedorNombre.toLowerCase().replace(/\s+/g, '-')}`}
          columnas={COLUMNAS_ANIMALES_PROVEEDOR}
          obtenerFilas={obtenerFilasExportacion}
          describirFiltros={describirContexto}
          usuario={usuarioExportacion}
          onCerrar={() => setModalExportarAbierto(false)}
          refDisparador={refBotonExportar}
        />
      )}
    </Modal>
  )
}
