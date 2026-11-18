/**
 * Modal "Nueva transferencia" (tamaño grande): registra el movimiento de
 * uno o más animales activos a otro lote (POST /api/transferencias). De
 * arriba hacia abajo: los datos de la transferencia (lote de destino,
 * fecha, motivo, nota, responsable); el lote de origen, que decide qué
 * animales se listan; los filtros y el orden de esa lista; la lista con
 * sus casillas y los botones de selección; y, en un pie siempre visible,
 * el contador de la selección con "Cancelar" y "Transferir".
 *
 * Mientras no se elige un lote de origen no se lista nada y se avisa. Al
 * elegirlo se muestran los animales ACTIVOS de ese lote ("Sin lote" incluido).
 *
 * Selección: la guarda este componente como un Set de ids, aparte del lote
 * de origen y de los filtros, así que cambiar de lote o filtrar NO la
 * pierde (se pueden combinar animales de varios lotes). Todos los botones
 * de selección solo AGREGAN ("Seleccionar todos los filtrados",
 * "Seleccionar los N de mayor ganancia"; los dos actúan sobre lo que se ve
 * en ese momento: el lote de origen elegido y los filtros); para empezar
 * de cero está "Limpiar selección". Lo que se transfiere (y lo que cuenta
 * el contador) es la selección EFECTIVA: la selección sin los animales
 * que ya están en el lote de destino, que se calcula en cada render. Así,
 * si se cambia el destino a un lote donde ya hay animales marcados, dejan
 * de contar solos, sin mutar el estado ni tener que "desmarcarlos" a mano.
 *
 * La confirmación ("Vas a mover N animales de [lotes] a [destino]") es otra
 * vista del mismo modal, no un segundo modal encima: el formulario queda
 * montado pero oculto, así que "Volver" lo encuentra tal como estaba. Con
 * Escape en la confirmación también se vuelve al formulario, no se cierra
 * todo.
 *
 * Los animales y los lotes se traen una sola vez al abrir el modal.
 */

import { FilterX, Info, Inbox, RefreshCw, SearchX, TriangleAlert } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { ErrorHttp, peticionProtegida } from '../../api/cliente'
import { useAuth } from '../../auth/useAuth'
import Modal from '../../componentes/Modal'
import Paginacion from '../../componentes/Paginacion'
import { fechaHoyIso } from '../../utilidades/fechas'
import { obtenerRazasDisponibles } from '../../utilidades/filtrosAnimales'
import { formatearGmd } from '../../utilidades/formato'
import '../animales/FormularioAnimal.css'
import CampoResponsable from '../pesajes/CampoResponsable'
import { usePersonasResponsable } from '../pesajes/usePersonasResponsable'
import {
  calcularGmdPromedio,
  descripcionesDeOrigen,
  esActivo,
  filtrarAnimales,
  idsDeMayorGmd,
  obtenerLotesDeOrigen,
  OPCIONES_ORDEN,
  ordenarAnimales,
  ordenDesdeValor,
} from './animalesCandidatos'
import ConfirmacionTransferencia from './ConfirmacionTransferencia'
import ListaAnimalesTransferencia from './ListaAnimalesTransferencia'
import { LARGO_MAXIMO_NOTA, MOTIVOS_ELEGIBLES, textoCantidadAnimales } from './motivos'
import SelectorLoteDestino from './SelectorLoteDestino'
import { useDatosNuevaTransferencia } from './useDatosNuevaTransferencia'
import './ModalNuevaTransferencia.css'

const FILAS_POR_PAGINA = 25

const FILTROS_INICIALES = { raza: 'todas', gmdMin: '', gmdMax: '', orden: 'gmd:desc' }

export default function ModalNuevaTransferencia({ onCerrar, onTransferida, refDisparador }) {
  const { animales, lotes, cargando, error, recargar, agregarLote } = useDatosNuevaTransferencia()
  const { personaId, personaNombre, errorYo } = useAuth()
  const { personas, cargandoPersonas, errorPersonas } = usePersonasResponsable(personaId)

  const [vista, setVista] = useState('formulario')

  const [destinoId, setDestinoId] = useState('')
  const [fecha, setFecha] = useState(() => fechaHoyIso())
  const [motivo, setMotivo] = useState('SELECCION')
  const [nota, setNota] = useState('')
  const [responsableElegido, setResponsableElegido] = useState(null)
  const [errores, setErrores] = useState({})

  const [origen, setOrigen] = useState('')
  const [filtros, setFiltros] = useState(FILTROS_INICIALES)
  const [pagina, setPagina] = useState(1)
  const [seleccion, setSeleccion] = useState(() => new Set())
  const [cantidadMayores, setCantidadMayores] = useState('')
  const [mensajeSeleccion, setMensajeSeleccion] = useState('')

  const [enviando, setEnviando] = useState(false)
  const [errorEnvio, setErrorEnvio] = useState('')

  const refDestino = useRef(null)
  const refFecha = useRef(null)
  const refNota = useRef(null)

  // Mientras no se elija otro, el responsable es la persona del usuario actual (llega de forma asíncrona).
  const responsableId = responsableElegido ?? personaId

  // Volver a la página 1 cuando cambia el lote de origen o los filtros (mismo patrón que Animales.jsx: se ajusta durante el render).
  const [vistoPrevio, setVistoPrevio] = useState({ origen, filtros })
  if (vistoPrevio.origen !== origen || vistoPrevio.filtros !== filtros) {
    setVistoPrevio({ origen, filtros })
    setPagina(1)
  }

  const activos = useMemo(() => animales.filter(esActivo), [animales])
  const lotesDeOrigen = useMemo(() => obtenerLotesDeOrigen(activos), [activos])
  const razas = useMemo(() => obtenerRazasDisponibles(activos), [activos])

  const hayOrigen = origen !== ''
  const filtrados = useMemo(
    () =>
      hayOrigen
        ? ordenarAnimales(
            filtrarAnimales(animales, {
              origen,
              raza: filtros.raza,
              gmdMin: filtros.gmdMin,
              gmdMax: filtros.gmdMax,
            }),
            ordenDesdeValor(filtros.orden),
          )
        : [],
    [animales, hayOrigen, origen, filtros],
  )
  const totalEnOrigen = hayOrigen ? filtrarAnimales(animales, { origen }).length : 0

  const enDestino = (animal) => destinoId !== '' && String(animal.subGrupoId) === destinoId

  // Selección efectiva: lo marcado, menos lo que ya está en el destino (ver el comentario de arriba).
  const seleccionados = activos.filter((animal) => seleccion.has(animal.aniId) && !enDestino(animal))
  const gmdPromedio = calcularGmdPromedio(seleccionados)

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / FILAS_POR_PAGINA))
  const paginaActual = Math.min(pagina, totalPaginas)
  const inicio = (paginaActual - 1) * FILAS_POR_PAGINA
  const animalesDeLaPagina = filtrados.slice(inicio, inicio + FILAS_POR_PAGINA)

  function cambiarFiltro(campo, valor) {
    setFiltros((actuales) => ({ ...actuales, [campo]: valor }))
  }

  function limpiarFiltros() {
    setFiltros(FILTROS_INICIALES)
  }

  function alternarAnimal(animal) {
    setSeleccion((actual) => {
      const nueva = new Set(actual)
      if (nueva.has(animal.aniId)) {
        nueva.delete(animal.aniId)
      } else {
        nueva.add(animal.aniId)
      }
      return nueva
    })
    setErrores((actuales) => ({ ...actuales, seleccion: undefined }))
  }

  /** Agrega ids a la selección y avisa cuántos eran realmente nuevos (para lectores de pantalla y para quien no ve la lista entera). */
  function agregarASeleccion(ids) {
    const nuevos = ids.filter((id) => !seleccion.has(id))
    setSeleccion((actual) => new Set([...actual, ...ids]))
    setMensajeSeleccion(
      nuevos.length === 0
        ? 'No hay animales nuevos para agregar a la selección'
        : `Se agregaron ${textoCantidadAnimales(nuevos.length)} a la selección`,
    )
    setErrores((actuales) => ({ ...actuales, seleccion: undefined }))
  }

  function seleccionarTodosLosFiltrados() {
    agregarASeleccion(filtrados.filter((animal) => !enDestino(animal)).map((animal) => animal.aniId))
  }

  function seleccionarMayores() {
    const n = Number(cantidadMayores)
    if (!Number.isInteger(n) || n <= 0) {
      setMensajeSeleccion('Ingresá un número entero mayor a 0 en "Cantidad de mayor ganancia"')
      return
    }
    agregarASeleccion(idsDeMayorGmd(filtrados, n, (animal) => !enDestino(animal)))
  }

  function limpiarSeleccion() {
    setSeleccion(new Set())
    setMensajeSeleccion('Se limpió la selección')
  }

  /** Reglas del formulario en el cliente (el backend las vuelve a validar): devuelve { campo: mensaje } con lo que falta o está mal. */
  function validar() {
    const encontrados = {}
    if (seleccionados.length === 0) {
      encontrados.seleccion = 'Seleccioná al menos un animal'
    }
    if (!destinoId) {
      encontrados.destino = 'Elegí el lote de destino'
    }
    if (!fecha) {
      encontrados.fecha = 'Ingresá la fecha'
    } else if (fecha > fechaHoyIso()) {
      encontrados.fecha = 'La fecha no puede ser futura'
    }
    if (motivo === 'OTRO' && !nota.trim()) {
      encontrados.nota = 'Ingresá la nota: es obligatoria con el motivo Otro'
    } else if (nota.length > LARGO_MAXIMO_NOTA) {
      encontrados.nota = `La nota no puede superar los ${LARGO_MAXIMO_NOTA} caracteres`
    }
    if (responsableId == null) {
      encontrados.responsable = errorYo || 'No se encontró una persona asociada a tu usuario'
    }
    return encontrados
  }

  function manejarTransferir() {
    const encontrados = validar()
    setErrores(encontrados)
    if (Object.keys(encontrados).length > 0) {
      const orden = [
        ['destino', refDestino],
        ['fecha', refFecha],
        ['nota', refNota],
      ]
      orden.find(([clave]) => encontrados[clave])?.[1].current?.focus()
      return
    }
    setErrorEnvio('')
    setVista('confirmar')
  }

  const destino = lotes.find((lote) => String(lote.sbId) === destinoId)

  async function confirmar() {
    setEnviando(true)
    setErrorEnvio('')
    try {
      await peticionProtegida('/api/transferencias', {
        method: 'POST',
        body: JSON.stringify({
          fecha,
          motivo,
          nota: nota.trim() || null,
          destinoId: Number(destinoId),
          responsableId,
          animalIds: seleccionados.map((animal) => animal.aniId),
        }),
      })
      const cantidad = seleccionados.length
      setEnviando(false)
      onTransferida(
        `${cantidad === 1 ? '1 animal transferido' : `${cantidad} animales transferidos`} a ${destino.sbDescripcion}`,
      )
    } catch (err) {
      setErrorEnvio(err instanceof ErrorHttp ? err.message : 'No se pudo conectar con el servidor.')
      setEnviando(false)
    }
  }

  /** Escape / clic afuera / la X: en la confirmación vuelve al formulario; en el formulario cierra el modal. No hace nada mientras se envía. */
  function alCerrar() {
    if (enviando) {
      return
    }
    if (vista === 'confirmar') {
      setVista('formulario')
      setErrorEnvio('')
      return
    }
    onCerrar()
  }

  const sinAnimales = hayOrigen && totalEnOrigen === 0
  const sinCoincidencias = hayOrigen && totalEnOrigen > 0 && filtrados.length === 0

  return (
    <Modal
      titulo={vista === 'confirmar' ? 'Confirmar transferencia' : 'Nueva transferencia'}
      onCerrar={alCerrar}
      refDisparador={refDisparador}
      tamano="grande"
    >
      {cargando && <p role="status">Cargando animales y lotes…</p>}

      {!cargando && error && (
        <div className="estado-mensaje tarjeta">
          <TriangleAlert aria-hidden="true" size={40} className="estado-mensaje-icono" />
          <p>{error}</p>
          <button type="button" className="boton boton-secundario" onClick={recargar}>
            <RefreshCw aria-hidden="true" size={16} />
            Reintentar
          </button>
        </div>
      )}

      {!cargando && !error && (
        <>
          {vista === 'confirmar' && (
            <ConfirmacionTransferencia
              cantidad={seleccionados.length}
              origenes={descripcionesDeOrigen(seleccionados)}
              destino={destino?.sbDescripcion ?? ''}
              enviando={enviando}
              error={errorEnvio}
              onConfirmar={confirmar}
              onVolver={alCerrar}
            />
          )}

          <div className="nueva-transferencia" hidden={vista === 'confirmar'}>
            <section aria-labelledby="nt-titulo-datos" className="nt-seccion">
              <h3 id="nt-titulo-datos">Datos de la transferencia</h3>

              <div className="nt-formulario">
                <SelectorLoteDestino
                  id="transferencia-destino"
                  refSelect={refDestino}
                  lotes={lotes}
                  valor={destinoId}
                  onCambiar={(valor) => {
                    setDestinoId(valor)
                    setErrores((actuales) => ({ ...actuales, destino: undefined }))
                  }}
                  onLoteCreado={(lote) => {
                    agregarLote(lote)
                    setDestinoId(String(lote.sbId))
                    setErrores((actuales) => ({ ...actuales, destino: undefined }))
                  }}
                  error={errores.destino}
                  disabled={enviando}
                />

                <div className="campo">
                  <label htmlFor="transferencia-fecha">Fecha</label>
                  <input
                    id="transferencia-fecha"
                    ref={refFecha}
                    type="date"
                    value={fecha}
                    max={fechaHoyIso()}
                    onChange={(evento) => setFecha(evento.target.value)}
                    aria-invalid={Boolean(errores.fecha)}
                    aria-describedby={errores.fecha ? 'transferencia-fecha-error' : undefined}
                    disabled={enviando}
                  />
                  {errores.fecha && (
                    <p id="transferencia-fecha-error" className="campo-error" role="alert">
                      {errores.fecha}
                    </p>
                  )}
                </div>

                <div className="campo">
                  <label htmlFor="transferencia-motivo">Motivo</label>
                  <select
                    id="transferencia-motivo"
                    value={motivo}
                    onChange={(evento) => setMotivo(evento.target.value)}
                    disabled={enviando}
                  >
                    {MOTIVOS_ELEGIBLES.map((opcion) => (
                      <option key={opcion.valor} value={opcion.valor}>
                        {opcion.etiqueta}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <CampoResponsable
                    id="transferencia-responsable"
                    personas={personas}
                    cargando={cargandoPersonas}
                    error={errorPersonas}
                    personaActualId={personaId}
                    personaActualNombre={personaNombre}
                    valor={responsableId}
                    onCambiar={setResponsableElegido}
                    disabled={enviando}
                  />
                  {errores.responsable && (
                    <p className="campo-error" role="alert">
                      {errores.responsable}
                    </p>
                  )}
                </div>

                <div className="campo nt-campo-ancho">
                  <label htmlFor="transferencia-nota">
                    Nota{motivo === 'OTRO' ? ' (obligatoria con el motivo Otro)' : ' (opcional)'}
                  </label>
                  <textarea
                    id="transferencia-nota"
                    ref={refNota}
                    rows={2}
                    maxLength={LARGO_MAXIMO_NOTA}
                    value={nota}
                    onChange={(evento) => setNota(evento.target.value)}
                    aria-invalid={Boolean(errores.nota)}
                    aria-describedby={errores.nota ? 'transferencia-nota-error' : undefined}
                    disabled={enviando}
                  />
                  {errores.nota && (
                    <p id="transferencia-nota-error" className="campo-error" role="alert">
                      {errores.nota}
                    </p>
                  )}
                </div>
              </div>
            </section>

            <section aria-labelledby="nt-titulo-animales" className="nt-seccion">
              <h3 id="nt-titulo-animales">Animales</h3>

              <div className="campo">
                <label htmlFor="transferencia-origen">Lote de origen</label>
                <select
                  id="transferencia-origen"
                  value={origen}
                  onChange={(evento) => setOrigen(evento.target.value)}
                  disabled={enviando}
                >
                  <option value="">Elegí un lote de origen</option>
                  <option value="sin-lote">Sin lote</option>
                  {lotesDeOrigen.map((opcion) => (
                    <option key={opcion.valor} value={opcion.valor}>
                      {opcion.etiqueta}
                    </option>
                  ))}
                </select>
              </div>

              {!hayOrigen && (
                <p className="nt-aviso-origen" role="status">
                  <Info aria-hidden="true" size={18} />
                  Elegí un lote de origen para ver los animales disponibles
                </p>
              )}

              {hayOrigen && (
                <>
                  <div className="nt-filtros">
                    <div className="campo">
                      <label htmlFor="transferencia-filtro-raza">Raza</label>
                      <select
                        id="transferencia-filtro-raza"
                        value={filtros.raza}
                        onChange={(evento) => cambiarFiltro('raza', evento.target.value)}
                      >
                        <option value="todas">Todas las razas</option>
                        {razas.map((opcion) => (
                          <option key={opcion.valor} value={opcion.valor}>
                            {opcion.etiqueta}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="campo">
                      <label htmlFor="transferencia-filtro-gmd-min">GMD mínima (kg/día)</label>
                      <input
                        id="transferencia-filtro-gmd-min"
                        type="text"
                        inputMode="decimal"
                        value={filtros.gmdMin}
                        onChange={(evento) => cambiarFiltro('gmdMin', evento.target.value)}
                        placeholder="Ej. 0,8"
                      />
                    </div>

                    <div className="campo">
                      <label htmlFor="transferencia-filtro-gmd-max">GMD máxima (kg/día)</label>
                      <input
                        id="transferencia-filtro-gmd-max"
                        type="text"
                        inputMode="decimal"
                        value={filtros.gmdMax}
                        onChange={(evento) => cambiarFiltro('gmdMax', evento.target.value)}
                        placeholder="Ej. 1,5"
                      />
                    </div>

                    <div className="campo">
                      <label htmlFor="transferencia-filtro-orden">Ordenar por</label>
                      <select
                        id="transferencia-filtro-orden"
                        value={filtros.orden}
                        onChange={(evento) => cambiarFiltro('orden', evento.target.value)}
                      >
                        {OPCIONES_ORDEN.map((opcion) => (
                          <option key={opcion.valor} value={opcion.valor}>
                            {opcion.etiqueta}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="nt-acciones-seleccion">
                    <button
                      type="button"
                      className="boton boton-secundario"
                      onClick={seleccionarTodosLosFiltrados}
                      disabled={filtrados.length === 0}
                    >
                      Seleccionar todos los filtrados
                    </button>

                    <div className="nt-mayores">
                      <div className="campo">
                        <label htmlFor="transferencia-cantidad-mayores">Cantidad de mayor ganancia</label>
                        <input
                          id="transferencia-cantidad-mayores"
                          type="number"
                          inputMode="numeric"
                          min="1"
                          step="1"
                          value={cantidadMayores}
                          onChange={(evento) => setCantidadMayores(evento.target.value)}
                          placeholder="N"
                        />
                      </div>
                      <button
                        type="button"
                        className="boton boton-secundario"
                        onClick={seleccionarMayores}
                        disabled={filtrados.length === 0}
                      >
                        Seleccionar los N de mayor ganancia
                      </button>
                    </div>

                    <button
                      type="button"
                      className="boton boton-secundario"
                      onClick={limpiarSeleccion}
                      disabled={seleccion.size === 0}
                    >
                      Limpiar selección
                    </button>
                  </div>

                  <p className="nt-mensaje-seleccion" aria-live="polite">
                    {mensajeSeleccion}
                  </p>

                  <p className="visualmente-oculto" aria-live="polite">
                    {filtrados.length === 1 ? '1 animal encontrado' : `${filtrados.length} animales encontrados`}
                  </p>

                  {sinAnimales && (
                    <div className="estado-mensaje tarjeta">
                      <Inbox aria-hidden="true" size={40} className="estado-mensaje-icono" />
                      <p>No hay animales activos en este lote</p>
                    </div>
                  )}

                  {sinCoincidencias && (
                    <div className="estado-mensaje tarjeta">
                      <SearchX aria-hidden="true" size={40} className="estado-mensaje-icono" />
                      <p>No hay animales que coincidan con los filtros</p>
                      <button type="button" className="boton boton-secundario" onClick={limpiarFiltros}>
                        <FilterX aria-hidden="true" size={16} />
                        Limpiar filtros
                      </button>
                    </div>
                  )}

                  {filtrados.length > 0 && (
                    <>
                      <ListaAnimalesTransferencia
                        animales={animalesDeLaPagina}
                        seleccionados={seleccion}
                        destinoId={destinoId}
                        onAlternar={alternarAnimal}
                      />
                      <Paginacion
                        paginaActual={paginaActual}
                        totalPaginas={totalPaginas}
                        totalResultados={filtrados.length}
                        filasPorPagina={FILAS_POR_PAGINA}
                        onCambiarPagina={setPagina}
                      />
                    </>
                  )}
                </>
              )}
            </section>

            <div className="nt-pie">
              <div className="nt-contador" role="status" aria-live="polite">
                <strong>
                  {seleccionados.length === 1 ? '1 seleccionado' : `${seleccionados.length} seleccionados`}
                </strong>
                <span>GMD promedio: {gmdPromedio == null ? '—' : formatearGmd(gmdPromedio)}</span>
              </div>

              {errores.seleccion && (
                <p className="campo-error nt-error-seleccion" role="alert">
                  {errores.seleccion}
                </p>
              )}

              <div className="nt-pie-botones">
                <button type="button" className="boton-secundario" onClick={onCerrar} disabled={enviando}>
                  Cancelar
                </button>
                <button type="button" className="boton-primario" onClick={manejarTransferir} disabled={enviando}>
                  Transferir
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </Modal>
  )
}
