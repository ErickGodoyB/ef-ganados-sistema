/**
 * Pestaña "Nueva transferencia": elegir qué animales activos pasan de lote,
 * a qué lote, y registrar el movimiento (POST /api/transferencias).
 *
 * Selección: la guarda este componente como un Set de ids, aparte de los
 * filtros, así que cambiar un filtro NO la pierde (se puede ir juntando
 * animales de varios lotes o razas). Todos los botones de selección solo
 * AGREGAN ("Seleccionar todos los filtrados", "Seleccionar los N de mayor
 * ganancia"); para empezar de cero está "Limpiar selección". Lo que se
 * transfiere (y lo que cuenta el contador) es la selección EFECTIVA: la
 * selección sin los animales que ya están en el lote de destino, que se
 * calcula en cada render. Así, si se cambia el destino a un lote donde ya
 * hay animales marcados, dejan de contar solos, sin mutar el estado ni
 * tener que "desmarcarlos" a mano.
 *
 * Los animales y los lotes se traen una sola vez al montar; al registrar
 * con éxito, Transferencias.jsx vuelve a montar esta pestaña (cambia su
 * "key") para empezar con datos frescos y la selección vacía.
 */

import { FilterX, Inbox, RefreshCw, SearchX, TriangleAlert } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { ErrorHttp, peticionProtegida } from '../../api/cliente'
import { useAuth } from '../../auth/useAuth'
import Paginacion from '../../componentes/Paginacion'
import { fechaHoyIso } from '../../utilidades/fechas'
import { obtenerRazasDisponibles } from '../../utilidades/filtrosAnimales'
import { formatearGmd } from '../../utilidades/formato'
import '../animales/FormularioAnimal.css'
import CampoResponsable from '../pesajes/CampoResponsable'
import { usePersonasResponsable } from '../pesajes/usePersonasResponsable'
import ListaAnimalesTransferencia from './ListaAnimalesTransferencia'
import {
  calcularGmdPromedio,
  descripcionesDeOrigen,
  esActivo,
  filtrarAnimales,
  idsDeMayorGmd,
  obtenerLotesDeOrigen,
  ordenarPorGmd,
} from './listadoTransferencia'
import ModalConfirmarTransferencia from './ModalConfirmarTransferencia'
import { LARGO_MAXIMO_NOTA, MOTIVOS_ELEGIBLES, textoCantidadAnimales } from './motivos'
import SelectorLoteDestino from './SelectorLoteDestino'
import { useDatosNuevaTransferencia } from './useDatosNuevaTransferencia'

const FILAS_POR_PAGINA = 25

const FILTROS_INICIALES = { origen: 'todos', raza: 'todas', gmdMin: '', gmdMax: '', direccion: 'desc' }

export default function PestanaNuevaTransferencia({ onTransferida }) {
  const { animales, lotes, cargando, error, recargar, agregarLote } = useDatosNuevaTransferencia()
  const { personaId, personaNombre, errorYo } = useAuth()
  const { personas, cargandoPersonas, errorPersonas } = usePersonasResponsable(personaId)

  const [filtros, setFiltros] = useState(FILTROS_INICIALES)
  const [pagina, setPagina] = useState(1)
  const [seleccion, setSeleccion] = useState(() => new Set())
  const [cantidadMayores, setCantidadMayores] = useState('')
  const [mensajeSeleccion, setMensajeSeleccion] = useState('')

  const [destinoId, setDestinoId] = useState('')
  const [fecha, setFecha] = useState(() => fechaHoyIso())
  const [motivo, setMotivo] = useState('SELECCION')
  const [nota, setNota] = useState('')
  const [responsableElegido, setResponsableElegido] = useState(null)
  const [errores, setErrores] = useState({})

  const [confirmando, setConfirmando] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [errorEnvio, setErrorEnvio] = useState('')

  const refDestino = useRef(null)
  const refFecha = useRef(null)
  const refNota = useRef(null)
  const refBotonTransferir = useRef(null)

  // Mientras no se elija otro, el responsable es la persona del usuario actual (llega de forma asíncrona).
  const responsableId = responsableElegido ?? personaId

  // Volver a la página 1 cuando cambian los filtros (mismo patrón que Animales.jsx: se ajusta durante el render).
  const [filtrosPrevios, setFiltrosPrevios] = useState(filtros)
  if (filtrosPrevios !== filtros) {
    setFiltrosPrevios(filtros)
    setPagina(1)
  }

  const lotesDeOrigen = useMemo(() => obtenerLotesDeOrigen(animales.filter(esActivo)), [animales])
  const razas = useMemo(() => obtenerRazasDisponibles(animales.filter(esActivo)), [animales])

  const filtrados = useMemo(
    () => ordenarPorGmd(filtrarAnimales(animales, filtros), filtros.direccion),
    [animales, filtros],
  )

  const totalActivos = useMemo(() => animales.filter(esActivo).length, [animales])
  const enDestino = (animal) => destinoId !== '' && String(animal.subGrupoId) === destinoId

  // Selección efectiva: lo marcado, menos lo que ya está en el destino (ver el comentario de arriba).
  const seleccionados = animales.filter(
    (animal) => esActivo(animal) && seleccion.has(animal.aniId) && !enDestino(animal),
  )
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
    setConfirmando(true)
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
      setConfirmando(false)
      onTransferida(
        `${cantidad === 1 ? '1 animal transferido' : `${cantidad} animales transferidos`} a ${destino.sbDescripcion}`,
      )
    } catch (err) {
      setErrorEnvio(err instanceof ErrorHttp ? err.message : 'No se pudo conectar con el servidor.')
      setEnviando(false)
    }
  }

  if (cargando) {
    return <p role="status">Cargando animales y lotes…</p>
  }

  if (error) {
    return (
      <div className="estado-mensaje tarjeta">
        <TriangleAlert aria-hidden="true" size={40} className="estado-mensaje-icono" />
        <p>{error}</p>
        <button type="button" className="boton boton-secundario" onClick={recargar}>
          <RefreshCw aria-hidden="true" size={16} />
          Reintentar
        </button>
      </div>
    )
  }

  const sinAnimales = totalActivos === 0
  const sinCoincidencias = !sinAnimales && filtrados.length === 0

  return (
    <div className="nueva-transferencia">
      <div className="transferencia-contador" role="status" aria-live="polite">
        <strong>{seleccionados.length === 1 ? '1 seleccionado' : `${seleccionados.length} seleccionados`}</strong>
        <span>
          GMD promedio: {gmdPromedio == null ? '—' : formatearGmd(gmdPromedio)}
        </span>
      </div>

      <section aria-labelledby="transferencia-titulo-animales" className="transferencia-seccion">
        <h2 id="transferencia-titulo-animales">Animales</h2>

        <div className="transferencia-filtros">
          <div className="campo">
            <label htmlFor="transferencia-filtro-origen">Lote de origen</label>
            <select
              id="transferencia-filtro-origen"
              value={filtros.origen}
              onChange={(evento) => cambiarFiltro('origen', evento.target.value)}
            >
              <option value="todos">Todos los lotes</option>
              <option value="sin-lote">Sin lote</option>
              {lotesDeOrigen.map((opcion) => (
                <option key={opcion.valor} value={opcion.valor}>
                  {opcion.etiqueta}
                </option>
              ))}
            </select>
          </div>

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
            <label htmlFor="transferencia-filtro-orden">Ordenar por ganancia</label>
            <select
              id="transferencia-filtro-orden"
              value={filtros.direccion}
              onChange={(evento) => cambiarFiltro('direccion', evento.target.value)}
            >
              <option value="desc">Mayor a menor</option>
              <option value="asc">Menor a mayor</option>
            </select>
          </div>
        </div>

        <div className="transferencia-acciones-seleccion">
          <button
            type="button"
            className="boton boton-secundario"
            onClick={seleccionarTodosLosFiltrados}
            disabled={filtrados.length === 0}
          >
            Seleccionar todos los filtrados
          </button>

          <div className="transferencia-mayores">
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

        <p className="transferencia-mensaje-seleccion" aria-live="polite">
          {mensajeSeleccion}
        </p>

        {!sinAnimales && (
          <p className="visualmente-oculto" aria-live="polite">
            {filtrados.length === 1 ? '1 animal encontrado' : `${filtrados.length} animales encontrados`}
          </p>
        )}

        {sinAnimales && (
          <div className="estado-mensaje tarjeta">
            <Inbox aria-hidden="true" size={40} className="estado-mensaje-icono" />
            <p>No hay animales activos para transferir</p>
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
      </section>

      <section aria-labelledby="transferencia-titulo-datos" className="transferencia-seccion">
        <h2 id="transferencia-titulo-datos">Destino y datos</h2>

        <div className="transferencia-formulario">
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

          <div className="campo transferencia-campo-ancho">
            <label htmlFor="transferencia-nota">
              Nota{motivo === 'OTRO' ? ' (obligatoria con el motivo Otro)' : ' (opcional)'}
            </label>
            <textarea
              id="transferencia-nota"
              ref={refNota}
              rows={3}
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

          <div className="transferencia-campo-ancho">
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
        </div>

        {errores.seleccion && (
          <p className="campo-error" role="alert">
            {errores.seleccion}
          </p>
        )}

        <div className="transferencia-pie">
          <button
            type="button"
            ref={refBotonTransferir}
            className="boton-primario"
            onClick={manejarTransferir}
            disabled={enviando}
          >
            Transferir
          </button>
        </div>
      </section>

      {confirmando && (
        <ModalConfirmarTransferencia
          cantidad={seleccionados.length}
          origenes={descripcionesDeOrigen(seleccionados)}
          destino={destino?.sbDescripcion ?? ''}
          enviando={enviando}
          error={errorEnvio}
          onConfirmar={confirmar}
          onCancelar={() => {
            setConfirmando(false)
            setErrorEnvio('')
          }}
          refDisparador={refBotonTransferir}
        />
      )}
    </div>
  )
}
