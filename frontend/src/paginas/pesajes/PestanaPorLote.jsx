/**
 * Pestaña "Por lote" del modal "Nuevo pesaje" (RF011): se elige un lote y
 * una fecha, se van cargando animales de ese lote a una lista local (nada
 * se guarda todavía) y recién al tocar "Guardar" se manda todo junto como
 * una sesión (POST /api/pesajes/sesion, todo o nada). Si ya existe una
 * sesión de ese lote en esa fecha, lo avisa (sin bloquear: los animales que
 * se carguen se suman a ella) y excluye del buscador a los que ya no son
 * elegibles para esa fecha/lote (ver utilidades/elegibilidadPesaje.js: ya
 * tienen un pesaje activo ese día, su ingreso es posterior, o tienen
 * salida registrada).
 *
 * Cambiar el LOTE vacía la lista acumulada (pide confirmación, porque esos
 * animales pertenecían al lote anterior); cambiar la FECHA no la vacía,
 * pero puede sacar de ella -avisando cuáles- a los animales que dejaron de
 * servir para la fecha nueva (ver el efecto que verifica la sesión), y
 * puede hacer que alguna fila ya cargada pase a ser retroactiva (ver
 * avisoPesajeRetroactivo en el render de la lista: se recalcula solo, en
 * cada render, contra la fecha vigente).
 *
 * Expone, vía ref, solicitarCierre(): mismo criterio que FormularioAnimal
 * (ver su JSDoc), para que el modal que la envuelve respete la misma
 * confirmación por datos sin guardar al cerrar con Escape o el fondo.
 *
 * El botón "+" junto a Lote reutiliza AltaRapidaLote (el mismo componente
 * del formulario de animales): al crear un lote, se recarga la lista de
 * lotes y se lo selecciona con cambiarLote, que ya sabe pedir la misma
 * confirmación que un cambio de lote manual si había animales cargados.
 *
 * El responsable (ver CampoResponsable/usePersonasResponsable) arranca
 * preseleccionado con la persona del usuario actual, pero es elegible:
 * "responsableId" (no "personaId" directo) es lo que se manda en el POST
 * de la sesión.
 */

import { Plus, TriangleAlert, X } from 'lucide-react'
import { Fragment, forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { ErrorHttp, peticionProtegida } from '../../api/cliente'
import { useAuth } from '../../auth/useAuth'
import BuscadorAnimal from '../../componentes/BuscadorAnimal'
import ValorDiferenciaPeso from '../../componentes/ValorDiferenciaPeso'
import AltaRapidaLote from '../animales/AltaRapidaLote'
import { motivoNoElegible } from '../../utilidades/elegibilidadPesaje'
import { formatearPeso } from '../../utilidades/formato'
import { avisoPesajeRetroactivo } from '../../utilidades/pesajeRetroactivo'
import { calcularDiferenciaPeso, parsearPeso, pesoTextoEsValido } from '../../utilidades/peso'
import { calcularResumenPesos } from '../../utilidades/resumenSesion'
import CampoResponsable from './CampoResponsable'
// Reutiliza ".resumen-sesion" (el resumen en vivo) y ".tabla-items-sesion"
// (la tabla de animales) de ModalDetalleSesion.jsx/TablaItemsSesion.jsx:
// mismo lenguaje visual, acá con una lista local en vez de una ya guardada.
// El import es explícito (aunque ambos archivos ya estén en el bundle de
// todos modos) para que la dependencia quede a la vista.
import './ModalDetalleSesion.css'
import './PestanaPorLote.css'
import './TablaItemsSesion.css'
import { usePersonasResponsable } from './usePersonasResponsable'

/** Fecha de hoy en formato aaaa-mm-dd, en hora local. */
function obtenerFechaHoyIso() {
  const ahora = new Date()
  const anio = ahora.getFullYear()
  const mes = String(ahora.getMonth() + 1).padStart(2, '0')
  const dia = String(ahora.getDate()).padStart(2, '0')
  return `${anio}-${mes}-${dia}`
}

function pesoFilaValido(fila) {
  return pesoTextoEsValido(fila.pesoTexto)
}

const PestanaPorLote = forwardRef(function PestanaPorLote(
  { animales, cargandoAnimales, errorAnimales, animalParaPreseleccionar, onConsumidaPreseleccion, onRegistrarNuevo, onCerrar, onGuardado },
  ref,
) {
  const { personaId, personaNombre, cargandoYo, errorYo } = useAuth()
  const { personas, cargandoPersonas, errorPersonas } = usePersonasResponsable()

  const [subGrupos, setSubGrupos] = useState([])
  const [cargandoSubGrupos, setCargandoSubGrupos] = useState(true)
  const [errorSubGrupos, setErrorSubGrupos] = useState('')

  const [loteId, setLoteId] = useState('')
  const [fecha, setFecha] = useState(obtenerFechaHoyIso())
  const [responsableId, setResponsableId] = useState(null)

  const [sesionExistente, setSesionExistente] = useState(false)
  const [idsYaPesadosHoy, setIdsYaPesadosHoy] = useState(new Set())
  const [avisoCambioFecha, setAvisoCambioFecha] = useState('')

  const [listaAcumulada, setListaAcumulada] = useState([])

  const [textoCarga, setTextoCarga] = useState('')
  const [animalCarga, setAnimalCarga] = useState(null)
  const [pesoCarga, setPesoCarga] = useState('')
  const [errorCarga, setErrorCarga] = useState('')

  const [guardando, setGuardando] = useState(false)
  const [errorGuardar, setErrorGuardar] = useState('')

  const refBuscadorCarga = useRef(null)
  const refPesoCarga = useRef(null)
  const refBotonAgregar = useRef(null)
  // Pedido de foco para "+ Agregar" tras la preselección de alta rápida: no
  // se puede enfocar en el mismo momento en que se llama setAnimalCarga más
  // abajo, porque ese botón sigue disabled (depende de animalCarga) hasta
  // que el estado nuevo se renderice; se consume en el efecto de abajo, una
  // vez que animalCarga/pesoCargaValido ya habilitaron el botón. Es un ref
  // (no un estado) para no disparar un re-render extra solo por apagar el
  // pedido ya atendido.
  const refPedidoFocoBoton = useRef(false)

  /** Trae los lotes (subgrupos); se reutiliza al abrir la pestaña y tras crear uno por alta rápida (ver alCrearLote). */
  const cargarLotes = useCallback(async () => {
    setCargandoSubGrupos(true)
    setErrorSubGrupos('')
    try {
      const datos = await peticionProtegida('/api/subgrupos')
      setSubGrupos(datos ?? [])
      return datos ?? []
    } catch {
      setErrorSubGrupos('No se pudieron cargar los lotes.')
      return null
    } finally {
      setCargandoSubGrupos(false)
    }
  }, [])

  useEffect(() => {
    cargarLotes()
  }, [cargarLotes])

  // Al tener lote y fecha, se fija si ya hay una sesión de ese lote ese día
  // (para avisar, sin bloquear) y qué animales ya se pesaron (para no
  // ofrecerlos de nuevo). Un error acá no es grave: se trata como "no hay
  // sesión previa" en vez de bloquear toda la pestaña por una consulta
  // que ni siquiera hace falta para poder cargar pesajes nuevos.
  //
  // Además, con los ids recién traídos, se reconcilia la lista acumulada:
  // cambiar la fecha no la vacía (eso solo pasa al cambiar de lote, ver
  // cambiarLote), pero un animal ya cargado puede dejar de servir para la
  // fecha nueva (ya tiene un pesaje activo ese día, o su ingreso quedó
  // después) y hay que sacarlo, avisando cuál.
  useEffect(() => {
    if (!loteId || !fecha) {
      setSesionExistente(false)
      setIdsYaPesadosHoy(new Set())
      return undefined
    }
    let cancelado = false
    async function verificar() {
      try {
        const parametros = new URLSearchParams({ fecha })
        if (loteId !== 'sin-lote') {
          parametros.set('subGrupoId', loteId)
        }
        const detalle = await peticionProtegida(`/api/pesajes/sesiones/detalle?${parametros.toString()}`)
        if (cancelado) {
          return
        }
        const lista = detalle ?? []
        const nuevosIds = new Set(lista.map((item) => item.animalId))
        setSesionExistente(lista.length > 0)
        setIdsYaPesadosHoy(nuevosIds)
        setAvisoCambioFecha('')
        setListaAcumulada((actual) => {
          const invalidas = actual.filter((fila) => motivoNoElegible(fila.animal, fecha, nuevosIds) != null)
          if (invalidas.length === 0) {
            return actual
          }
          const caravanas = invalidas.map((fila) => fila.animal.aniCaravana).join(', ')
          setAvisoCambioFecha(`Se quitaron de la lista (ya no sirven para esta fecha): ${caravanas}`)
          return actual.filter((fila) => motivoNoElegible(fila.animal, fecha, nuevosIds) == null)
        })
      } catch {
        if (!cancelado) {
          setSesionExistente(false)
          setIdsYaPesadosHoy(new Set())
        }
      }
    }
    verificar()
    return () => {
      cancelado = true
    }
  }, [loteId, fecha])

  // El animal recién creado por alta rápida (ver ModalNuevoPesaje.jsx) se
  // preselecciona acá apenas vuelve a mostrarse esta pestaña;
  // "onConsumidaPreseleccion" evita volver a aplicarlo en cada re-render.
  // Si no había un peso ya escrito, se precarga con el peso inicial recién
  // puesto en el alta rápida (editable); si ya había uno, se respeta. El
  // foco va al botón "+ Agregar" cuando el peso (precargado o el que ya
  // había) es válido -ya se puede confirmar la fila tal cual-, o al campo
  // de peso si por algún motivo no lo es.
  useEffect(() => {
    function aplicarPreseleccion() {
      if (animalParaPreseleccionar?.pestana !== 'lote') {
        return
      }
      const animal = animalParaPreseleccionar.animal
      setAnimalCarga({ id: animal.aniId, caravana: animal.aniCaravana, pesoActual: animal.pesoActual })
      setTextoCarga(animal.aniCaravana)
      // Se calcula el valor final del peso de una (en vez de leerlo del
      // estado después de setPesoCarga) porque la validez de ESE valor es
      // justo lo que decide a dónde va el foco, más abajo: leer "pesoCarga"
      // acá daría el valor viejo, de antes de este mismo render.
      const pesoFinal = pesoCarga.trim() ? pesoCarga : String(animal.aniPesoInicial).replace('.', ',')
      setPesoCarga(pesoFinal)
      if (pesoTextoEsValido(pesoFinal)) {
        // No se puede enfocar el botón acá todavía: su disabled depende de
        // animalCarga, que recién se acaba de pedir más arriba y todavía no
        // se renderizó (ver el efecto de abajo, que lo consume una vez que
        // sí está habilitado).
        refPedidoFocoBoton.current = true
      } else {
        refPesoCarga.current?.focus()
      }
      onConsumidaPreseleccion()
    }
    aplicarPreseleccion()
    // "pesoCarga" se lee adentro (para no pisarlo si ya había algo escrito)
    // pero a propósito no es una dependencia: el efecto solo tiene que
    // correr cuando llega un animalParaPreseleccionar nuevo, nunca por el
    // propio setPesoCarga de acá arriba (eso lo reiniciaría en bucle).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animalParaPreseleccionar, onConsumidaPreseleccion])

  const animalesDelLote = useMemo(() => {
    if (!loteId) {
      return []
    }
    return animales.filter((animal) => {
      if (motivoNoElegible(animal, fecha, idsYaPesadosHoy, loteId) != null) {
        return false
      }
      return !listaAcumulada.some((fila) => fila.animal.aniId === animal.aniId)
    })
  }, [animales, loteId, fecha, idsYaPesadosHoy, listaAcumulada])

  const opcionesCarga = animalesDelLote.map((animal) => ({
    id: animal.aniId,
    caravana: animal.aniCaravana,
    pesoActual: animal.pesoActual,
  }))

  // Si lo escrito coincide EXACTO con la caravana de un animal que ya
  // existe (sea o no elegible para este lote/fecha), nunca se ofrece
  // "Registrar animal nuevo": si no es elegible, en vez de esa opción se
  // explica el motivo.
  const textoCargaBuscado = textoCarga.trim()
  const animalCargaExistente = textoCargaBuscado
    ? animales.find((animal) => animal.aniCaravana.toLowerCase() === textoCargaBuscado.toLowerCase())
    : null
  const motivoCargaExistente = animalCargaExistente
    ? motivoNoElegible(animalCargaExistente, fecha, idsYaPesadosHoy, loteId)
    : null

  function cambiarLote(valor) {
    if (listaAcumulada.length > 0) {
      if (!window.confirm('Los animales cargados pertenecen al lote anterior. ¿Cambiar igual?')) {
        return
      }
      setListaAcumulada([])
    }
    setLoteId(valor)
    setTextoCarga('')
    setAnimalCarga(null)
    setPesoCarga('')
    setErrorCarga('')
  }

  /** El lote recién creado por alta rápida: se recarga la lista de lotes y se lo selecciona, con la misma confirmación que cambiarLote si ya había animales cargados. */
  async function alCrearLote(subGrupoCreado) {
    await cargarLotes()
    cambiarLote(String(subGrupoCreado.sbId))
  }

  /**
   * Cambiar la fecha NO vacía la lista acumulada (a diferencia de cambiar
   * de lote): el efecto que vuelve a consultar la sesión de la fecha nueva
   * (ver más arriba) es quien saca de la lista, si corresponde, los
   * animales que dejaron de servir para ella, avisando cuáles.
   */
  function cambiarFecha(valor) {
    setFecha(valor)
    setTextoCarga('')
    setAnimalCarga(null)
    setPesoCarga('')
    setErrorCarga('')
  }

  function elegirAnimalCarga(opcion) {
    setAnimalCarga(opcion)
    setTextoCarga(opcion.caravana)
  }

  function cambiarTextoCarga(valor) {
    setTextoCarga(valor)
    setAnimalCarga(null)
  }

  const pesoCargaNumero = parsearPeso(pesoCarga)
  const pesoCargaValido = pesoTextoEsValido(pesoCarga)
  const avisoPesoCargaMenor =
    animalCarga && pesoCargaValido && pesoCargaNumero < animalCarga.pesoActual
      ? `Es menor al último peso registrado (${formatearPeso(animalCarga.pesoActual)})`
      : ''

  useEffect(() => {
    if (refPedidoFocoBoton.current && animalCarga && pesoCargaValido && !guardando) {
      refBotonAgregar.current?.focus()
      refPedidoFocoBoton.current = false
    }
  }, [animalCarga, pesoCargaValido, guardando])

  // Preselecciona el responsable con la persona actual apenas se conoce
  // (useAuth es async); no lo pisa si el usuario ya había elegido otro.
  useEffect(() => {
    if (personaId != null) {
      setResponsableId((actual) => actual ?? personaId)
    }
  }, [personaId])

  /** Agrega el animal elegido con el peso escrito a la lista local (nada se guarda todavía) y devuelve el foco al buscador. */
  function agregarALaLista() {
    if (!animalCarga) {
      return
    }
    if (!pesoCargaValido) {
      setErrorCarga('Ingresá un peso válido (mayor a 0 y hasta 2000 kg)')
      return
    }
    const animalCompleto = animales.find((animal) => animal.aniId === animalCarga.id)
    setListaAcumulada((actual) => [...actual, { animal: animalCompleto, pesoTexto: pesoCarga }])
    setTextoCarga('')
    setAnimalCarga(null)
    setPesoCarga('')
    setErrorCarga('')
    refBuscadorCarga.current?.enfocar()
  }

  function manejarEnterEnPeso(evento) {
    if (evento.key === 'Enter') {
      evento.preventDefault()
      agregarALaLista()
    }
  }

  function actualizarPesoFila(aniId, texto) {
    setListaAcumulada((actual) => actual.map((fila) => (fila.animal.aniId === aniId ? { ...fila, pesoTexto: texto } : fila)))
  }

  function quitarFila(aniId) {
    setListaAcumulada((actual) => actual.filter((fila) => fila.animal.aniId !== aniId))
  }

  const resumen = useMemo(() => {
    const pesos = listaAcumulada.filter(pesoFilaValido).map((fila) => parsearPeso(fila.pesoTexto))
    return calcularResumenPesos(pesos)
  }, [listaAcumulada])

  const todosLosPesosValidos = listaAcumulada.length > 0 && listaAcumulada.every(pesoFilaValido)
  const responsableIdEfectivo = responsableId ?? personaId

  async function guardar() {
    if (!todosLosPesosValidos || responsableIdEfectivo == null) {
      return
    }
    setGuardando(true)
    setErrorGuardar('')
    try {
      await peticionProtegida('/api/pesajes/sesion', {
        method: 'POST',
        body: JSON.stringify({
          fecha,
          responsableId: responsableIdEfectivo,
          items: listaAcumulada.map((fila) => ({ animalId: fila.animal.aniId, peso: parsearPeso(fila.pesoTexto) })),
        }),
      })
      onGuardado(`Sesión guardada: ${listaAcumulada.length} animales`)
    } catch (err) {
      setErrorGuardar(
        err instanceof ErrorHttp ? err.message || 'No se pudo guardar la sesión.' : 'No se pudo conectar con el servidor.',
      )
    } finally {
      setGuardando(false)
    }
  }

  function solicitarCierre() {
    if (listaAcumulada.length > 0 && !window.confirm('Vas a perder los animales cargados. ¿Cerrar igual?')) {
      return
    }
    onCerrar()
  }

  useImperativeHandle(ref, () => ({ solicitarCierre }))

  const loteElegido = Boolean(loteId)
  const puedeAgregar = loteElegido && !cargandoAnimales && !errorAnimales

  return (
    <div className="pestana-por-lote">
      <div className="pestana-por-lote-campos">
        <div className="campo">
          <label htmlFor="nuevo-pesaje-lote">Lote</label>
          {cargandoSubGrupos ? (
            <p role="status">Cargando lotes…</p>
          ) : errorSubGrupos ? (
            <p className="campo-error" role="alert">
              {errorSubGrupos}
            </p>
          ) : (
            <div className="campo-con-alta-rapida">
              <select id="nuevo-pesaje-lote" value={loteId} onChange={(evento) => cambiarLote(evento.target.value)} disabled={guardando}>
                <option value="">Elegí un lote</option>
                <option value="sin-lote">Sin lote</option>
                {subGrupos.map((subGrupo) => (
                  <option key={subGrupo.sbId} value={subGrupo.sbId}>
                    {subGrupo.sbDescripcion}
                    {subGrupo.grupo ? ` — ${subGrupo.grupo.grpDescripcion}` : ''}
                  </option>
                ))}
              </select>
              <AltaRapidaLote subGrupos={subGrupos} onCreado={alCrearLote} />
            </div>
          )}
        </div>

        <div className="campo">
          <label htmlFor="nuevo-pesaje-fecha">Fecha</label>
          <input
            id="nuevo-pesaje-fecha"
            type="date"
            value={fecha}
            max={obtenerFechaHoyIso()}
            onChange={(evento) => cambiarFecha(evento.target.value)}
            disabled={guardando}
          />
        </div>

        <CampoResponsable
          id="nuevo-pesaje-lote-responsable"
          personas={personas}
          cargando={cargandoPersonas}
          error={errorPersonas}
          personaActualId={personaId}
          personaActualNombre={personaNombre}
          valor={responsableId}
          onCambiar={setResponsableId}
          disabled={guardando}
        />
      </div>

      {sesionExistente && (
        <p className="pestana-por-lote-aviso-sesion" aria-live="polite">
          <TriangleAlert aria-hidden="true" size={16} />
          Ya existe una sesión de este lote en esta fecha: los animales se sumarán a ella.
        </p>
      )}

      {avisoCambioFecha && (
        <p className="pestana-por-lote-aviso-sesion" aria-live="polite">
          <TriangleAlert aria-hidden="true" size={16} />
          {avisoCambioFecha}
        </p>
      )}

      <dl className="resumen-sesion pestana-por-lote-resumen">
        <div className="resumen-sesion-dato">
          <dt>Cantidad</dt>
          <dd>{resumen.cantidad}</dd>
        </div>
        <div className="resumen-sesion-dato">
          <dt>Total</dt>
          <dd>{formatearPeso(resumen.total)}</dd>
        </div>
        <div className="resumen-sesion-dato">
          <dt>Promedio</dt>
          <dd>{formatearPeso(resumen.promedio)}</dd>
        </div>
        <div className="resumen-sesion-dato">
          <dt>Mínimo</dt>
          <dd>{formatearPeso(resumen.minimo)}</dd>
        </div>
        <div className="resumen-sesion-dato">
          <dt>Máximo</dt>
          <dd>{formatearPeso(resumen.maximo)}</dd>
        </div>
      </dl>

      {!loteElegido && <p className="pestana-por-lote-ayuda">Elegí un lote para empezar a cargar animales.</p>}

      {loteElegido && cargandoAnimales && <p role="status">Cargando animales…</p>}

      {loteElegido && !cargandoAnimales && errorAnimales && (
        <p className="campo-error" role="alert">
          {errorAnimales}
        </p>
      )}

      {puedeAgregar && (
        <div className="pestana-por-lote-carga">
          <BuscadorAnimal
            ref={refBuscadorCarga}
            id="nuevo-pesaje-buscador-lote"
            label="Agregar animal del lote"
            opciones={opcionesCarga}
            valor={textoCarga}
            alCambiarValor={cambiarTextoCarga}
            alElegir={elegirAnimalCarga}
            textoSinResultados={motivoCargaExistente || 'No hay animales elegibles con ese texto'}
            alNoEncontrado={
              animalCargaExistente
                ? undefined
                : (texto) =>
                    onRegistrarNuevo({
                      caravana: texto,
                      subGrupoId: loteId === 'sin-lote' ? undefined : Number(loteId),
                      fecha,
                      pesoInicial: pesoCargaValido ? pesoCargaNumero : undefined,
                    })
            }
            disabled={guardando}
          />

          <div className="campo pestana-por-lote-campo-peso">
            <label htmlFor="nuevo-pesaje-peso-carga">Peso (kg)</label>
            <input
              id="nuevo-pesaje-peso-carga"
              ref={refPesoCarga}
              type="text"
              inputMode="decimal"
              value={pesoCarga}
              onChange={(evento) => setPesoCarga(evento.target.value)}
              onKeyDown={manejarEnterEnPeso}
              disabled={guardando}
              aria-invalid={Boolean(errorCarga)}
            />
          </div>

          <button
            type="button"
            ref={refBotonAgregar}
            className="boton-secundario"
            onClick={agregarALaLista}
            disabled={guardando || !animalCarga || !pesoCargaValido}
          >
            <Plus aria-hidden="true" size={16} />
            Agregar
          </button>
        </div>
      )}

      {errorCarga && (
        <p className="campo-error" role="alert">
          {errorCarga}
        </p>
      )}

      {avisoPesoCargaMenor && (
        <p className="pestana-por-lote-aviso-peso" aria-live="polite">
          {avisoPesoCargaMenor}
        </p>
      )}

      {listaAcumulada.length > 0 && (
        <>
          <div className="pestana-por-lote-tabla-solo-escritorio">
            <table className="tabla-items-sesion">
              <caption className="visualmente-oculto">Animales cargados en esta sesión</caption>
              <thead>
                <tr>
                  <th scope="col">Caravana</th>
                  <th scope="col">Raza</th>
                  <th scope="col">Último peso</th>
                  <th scope="col">Peso</th>
                  <th scope="col">Diferencia</th>
                  <th scope="col">
                    <span className="visualmente-oculto">Quitar</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {listaAcumulada.map((fila) => {
                  const avisoRetroactivo = avisoPesajeRetroactivo(
                    fila.animal.aniCaravana,
                    fecha,
                    fila.animal.fechaUltimoPesaje,
                    fila.animal.subGrupoId,
                  )
                  return (
                    <Fragment key={fila.animal.aniId}>
                      <tr>
                        <td className="tabla-items-sesion-caravana">{fila.animal.aniCaravana}</td>
                        <td>{fila.animal.razaDescripcion}</td>
                        <td>{formatearPeso(fila.animal.pesoActual)}</td>
                        <td>
                          <label className="visualmente-oculto" htmlFor={`fila-peso-${fila.animal.aniId}`}>
                            Peso de {fila.animal.aniCaravana}
                          </label>
                          <input
                            id={`fila-peso-${fila.animal.aniId}`}
                            className="entrada"
                            type="text"
                            inputMode="decimal"
                            value={fila.pesoTexto}
                            onChange={(evento) => actualizarPesoFila(fila.animal.aniId, evento.target.value)}
                            disabled={guardando}
                            aria-invalid={!pesoFilaValido(fila)}
                          />
                        </td>
                        <td>
                          <ValorDiferenciaPeso
                            diferencia={pesoFilaValido(fila) ? calcularDiferenciaPeso(parsearPeso(fila.pesoTexto), fila.animal.pesoActual) : null}
                          />
                        </td>
                        <td>
                          <button
                            type="button"
                            className="boton-fantasma pestana-por-lote-boton-quitar"
                            onClick={() => quitarFila(fila.animal.aniId)}
                            disabled={guardando}
                            aria-label={`Quitar a ${fila.animal.aniCaravana} de la lista`}
                          >
                            <X aria-hidden="true" size={16} />
                          </button>
                        </td>
                      </tr>
                      {avisoRetroactivo && (
                        <tr className="pestana-por-lote-fila-aviso">
                          <td colSpan={6}>
                            <p className="pestana-por-lote-aviso-retroactivo" role="status">
                              <TriangleAlert aria-hidden="true" size={16} />
                              {avisoRetroactivo}
                            </p>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="pestana-por-lote-tarjetas-solo-movil">
            {listaAcumulada.map((fila) => {
              const avisoRetroactivo = avisoPesajeRetroactivo(
                fila.animal.aniCaravana,
                fecha,
                fila.animal.fechaUltimoPesaje,
                fila.animal.subGrupoId,
              )
              return (
              <article key={fila.animal.aniId} className="pestana-por-lote-tarjeta tarjeta">
                <div className="pestana-por-lote-tarjeta-encabezado">
                  <span className="pestana-por-lote-tarjeta-caravana">{fila.animal.aniCaravana}</span>
                  <button
                    type="button"
                    className="boton-fantasma pestana-por-lote-boton-quitar"
                    onClick={() => quitarFila(fila.animal.aniId)}
                    disabled={guardando}
                    aria-label={`Quitar a ${fila.animal.aniCaravana} de la lista`}
                  >
                    <X aria-hidden="true" size={16} />
                  </button>
                </div>
                <p className="pestana-por-lote-tarjeta-raza">{fila.animal.razaDescripcion}</p>
                {avisoRetroactivo && (
                  <p className="pestana-por-lote-aviso-retroactivo" role="status">
                    <TriangleAlert aria-hidden="true" size={16} />
                    {avisoRetroactivo}
                  </p>
                )}
                <div className="campo">
                  <label htmlFor={`tarjeta-peso-${fila.animal.aniId}`}>Peso (kg)</label>
                  <input
                    id={`tarjeta-peso-${fila.animal.aniId}`}
                    type="text"
                    inputMode="decimal"
                    value={fila.pesoTexto}
                    onChange={(evento) => actualizarPesoFila(fila.animal.aniId, evento.target.value)}
                    disabled={guardando}
                    aria-invalid={!pesoFilaValido(fila)}
                  />
                </div>
                <dl className="pestana-por-lote-tarjeta-datos">
                  <div>
                    <dt>Último peso</dt>
                    <dd>{formatearPeso(fila.animal.pesoActual)}</dd>
                  </div>
                  <div>
                    <dt>Diferencia</dt>
                    <dd>
                      <ValorDiferenciaPeso
                        diferencia={pesoFilaValido(fila) ? calcularDiferenciaPeso(parsearPeso(fila.pesoTexto), fila.animal.pesoActual) : null}
                      />
                    </dd>
                  </div>
                </dl>
              </article>
              )
            })}
          </div>
        </>
      )}

      {cargandoYo && <p role="status">Identificando al usuario actual…</p>}

      {!cargandoYo && (errorYo || personaId == null) && (
        <p className="campo-error" role="alert">
          {errorYo || 'No se encontró una persona asociada a tu usuario.'} No se puede guardar la sesión sin saber a
          nombre de quién registrarla.
        </p>
      )}

      {errorGuardar && (
        <p className="campo-error" role="alert">
          {errorGuardar}
        </p>
      )}

      <div className="pestana-por-lote-acciones">
        <button type="button" className="boton-secundario" onClick={solicitarCierre} disabled={guardando}>
          Cancelar
        </button>
        <button
          type="button"
          className="boton-primario"
          onClick={guardar}
          disabled={guardando || !todosLosPesosValidos || responsableIdEfectivo == null}
        >
          {guardando ? 'Guardando...' : 'Guardar'}
        </button>
      </div>
    </div>
  )
})

export default PestanaPorLote
