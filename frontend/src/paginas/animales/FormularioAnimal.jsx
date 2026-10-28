/**
 * Formulario para crear o editar un animal: campos, validación en el
 * cliente, altas rápidas de Raza y Lote sin salir del formulario, y los
 * botones Guardar / Cancelar (más "Guardar y agregar otro", solo en modo
 * "crear"). Independiente del Modal que lo envuelve (ver
 * ModalNuevoAnimal.jsx y ModalDetalleAnimal.jsx), para poder reutilizarse
 * en el registro de pesajes (cuando el animal todavía no está cargado).
 * En modo "editar", valoresIniciales trae los datos actuales del animal
 * (se le puede pasar directamente el objeto del resumen: sus claves ya
 * coinciden con las que este formulario espera) y animalId identifica el
 * PUT a hacer.
 *
 * Expone, vía ref, solicitarCierre(): lo usa quien envuelve este
 * formulario (ej. un Modal) para que Escape o un clic afuera respeten la
 * misma confirmación que el botón "Cancelar" cuando hay datos sin guardar,
 * sin que este componente tenga que saber nada de cómo funciona esa otra
 * capa.
 */

import { RefreshCw } from 'lucide-react'
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { ErrorHttp, peticionProtegida } from '../../api/cliente'
import AltaRapidaLote from './AltaRapidaLote'
import AltaRapidaRaza from './AltaRapidaRaza'
import { useDatosFormularioAnimal } from './useDatosFormularioAnimal'
import './FormularioAnimal.css'

/** Fecha de hoy en formato aaaa-mm-dd, en hora local (evita que el huso corra la fecha un día). */
function obtenerFechaHoyIso() {
  const ahora = new Date()
  const anio = ahora.getFullYear()
  const mes = String(ahora.getMonth() + 1).padStart(2, '0')
  const dia = String(ahora.getDate()).padStart(2, '0')
  return `${anio}-${mes}-${dia}`
}

/** Convierte el texto de un campo de peso (acepta coma o punto) a número; NaN si no es válido. */
function parsearPeso(texto) {
  const normalizado = texto.trim().replace(',', '.')
  return normalizado === '' ? NaN : Number(normalizado)
}

const FormularioAnimal = forwardRef(function FormularioAnimal(
  { valoresIniciales = {}, alGuardar, alCancelar, modo = 'crear', animalId },
  ref,
) {
  const {
    razas: razasDelServidor,
    subGrupos: subGruposDelServidor,
    duenios,
    cargando,
    error,
    recargar,
  } = useDatosFormularioAnimal()

  // Copias propias (no las del hook), porque la alta rápida de Raza/Lote
  // agrega opciones nuevas sin pedirle de nuevo todo al backend. Se
  // resincronizan durante el render (no en un useEffect) cada vez que el
  // hook trae una lista distinta (carga inicial o "Reintentar"), sin
  // pisar lo agregado por alta rápida entre esos momentos.
  const [razasPrevias, setRazasPrevias] = useState(razasDelServidor)
  const [razas, setRazas] = useState(razasDelServidor)
  if (razasPrevias !== razasDelServidor) {
    setRazasPrevias(razasDelServidor)
    setRazas(razasDelServidor)
  }

  const [subGruposPrevios, setSubGruposPrevios] = useState(subGruposDelServidor)
  const [subGrupos, setSubGrupos] = useState(subGruposDelServidor)
  if (subGruposPrevios !== subGruposDelServidor) {
    setSubGruposPrevios(subGruposDelServidor)
    setSubGrupos(subGruposDelServidor)
  }

  const [caravana, setCaravana] = useState(valoresIniciales.aniCaravana ?? '')
  const [razaId, setRazaId] = useState(valoresIniciales.razaId ? String(valoresIniciales.razaId) : '')
  const [subGrupoId, setSubGrupoId] = useState(valoresIniciales.subGrupoId ? String(valoresIniciales.subGrupoId) : '')
  const [duenioId, setDuenioId] = useState(valoresIniciales.duenioId ? String(valoresIniciales.duenioId) : '')
  const [fechaIngreso, setFechaIngreso] = useState(valoresIniciales.aniFechaIngreso ?? obtenerFechaHoyIso())
  const [pesoInicial, setPesoInicial] = useState(
    valoresIniciales.aniPesoInicial != null ? String(valoresIniciales.aniPesoInicial) : '',
  )
  const [observacion, setObservacion] = useState(valoresIniciales.aniObservacion ?? '')
  const [errores, setErrores] = useState({})
  const [errorGeneral, setErrorGeneral] = useState('')
  const [guardando, setGuardando] = useState(false)

  const refCaravana = useRef(null)
  const refRaza = useRef(null)
  const refSubGrupo = useRef(null)
  const refDuenio = useRef(null)
  const refFecha = useRef(null)
  const refPeso = useRef(null)
  const refObservacion = useRef(null)

  // El formulario puede montarse antes de que lleguen sus datos (todavía
  // no hay nada enfocable, solo el texto de "cargando"). En cuanto
  // aparece, el foco pasa a Caravana.
  useEffect(() => {
    if (!cargando && !error) {
      refCaravana.current?.focus()
    }
  }, [cargando, error])

  const camposEnOrden = [
    ['caravana', refCaravana],
    ['razaId', refRaza],
    ['subGrupoId', refSubGrupo],
    ['duenioId', refDuenio],
    ['fechaIngreso', refFecha],
    ['pesoInicial', refPeso],
  ]

  /** Enter en un campo no envía el formulario: pasa el foco al siguiente. */
  function alPresionarEnterIrA(refSiguiente) {
    return (evento) => {
      if (evento.key === 'Enter') {
        evento.preventDefault()
        refSiguiente.current?.focus()
      }
    }
  }

  /** Valida los campos localmente. Devuelve un objeto { clave: mensaje } con los que fallaron (vacío si todo OK). */
  function validar() {
    const encontrados = {}

    if (!caravana.trim()) {
      encontrados.caravana = 'Ingresá la caravana'
    }
    if (!razaId) {
      encontrados.razaId = 'Elegí una raza'
    }
    if (!subGrupoId) {
      encontrados.subGrupoId = 'Elegí un lote'
    }
    if (!duenioId) {
      encontrados.duenioId = 'Elegí un dueño'
    }
    if (!fechaIngreso) {
      encontrados.fechaIngreso = 'Ingresá la fecha de ingreso'
    } else if (fechaIngreso > obtenerFechaHoyIso()) {
      encontrados.fechaIngreso = 'La fecha de ingreso no puede ser futura'
    }
    if (!pesoInicial.trim()) {
      encontrados.pesoInicial = 'Ingresá el peso inicial'
    } else {
      const peso = parsearPeso(pesoInicial)
      if (Number.isNaN(peso)) {
        encontrados.pesoInicial = 'Ingresá un número válido'
      } else if (peso <= 0 || peso > 2000) {
        encontrados.pesoInicial = 'El peso debe ser mayor a 0 y hasta 2000 kg'
      }
    }

    return encontrados
  }

  function enfocarPrimerError(encontrados) {
    const primero = camposEnOrden.find(([clave]) => encontrados[clave])
    primero?.[1].current?.focus()
  }

  /** Valida y, si está todo bien, crea o actualiza el animal (según "modo"). Devuelve el animal guardado, o null si no se guardó. */
  async function guardar() {
    const encontrados = validar()
    if (Object.keys(encontrados).length > 0) {
      setErrores(encontrados)
      enfocarPrimerError(encontrados)
      return null
    }

    const cuerpo = {
      duenioId: Number(duenioId),
      razaId: Number(razaId),
      subGrupoId: Number(subGrupoId),
      aniCaravana: caravana.trim(),
      aniFechaIngreso: fechaIngreso,
      aniPesoInicial: parsearPeso(pesoInicial),
      aniObservacion: observacion.trim() || null,
    }

    setGuardando(true)
    setErrorGeneral('')
    try {
      if (modo === 'editar') {
        return await peticionProtegida(`/api/animales/${animalId}`, {
          method: 'PUT',
          // aniFechaEgreso no tiene campo en este formulario (está fuera de
          // alcance, ver CLAUDE.md): se reenvía tal cual vino en el
          // resumen, para no perderlo al guardar otros cambios.
          body: JSON.stringify({ ...cuerpo, aniFechaEgreso: valoresIniciales.aniFechaEgreso ?? null }),
        })
      }
      return await peticionProtegida('/api/animales', {
        method: 'POST',
        body: JSON.stringify(cuerpo),
      })
    } catch (err) {
      if (err instanceof ErrorHttp && err.estado === 409) {
        // "Ya existe un animal con la caravana: X": va bajo el campo
        // Caravana, no como error general, porque es justo lo que hay que
        // corregir ahí.
        setErrores((actual) => ({ ...actual, caravana: err.message }))
        refCaravana.current?.focus()
      } else if (err instanceof ErrorHttp) {
        setErrorGeneral(err.message || 'No se pudo guardar el animal.')
      } else {
        setErrorGeneral('No se pudo conectar con el servidor.')
      }
      return null
    } finally {
      setGuardando(false)
    }
  }

  /** "Guardar": si se guardó bien, avisa que ya se puede cerrar (continuar: false). */
  async function manejarEnviar(evento) {
    evento.preventDefault()
    const creado = await guardar()
    if (creado) {
      alGuardar(creado, { continuar: false })
    }
  }

  /**
   * "Guardar y agregar otro": mantiene raza, lote, dueño, fecha (y lo
   * creado por alta rápida); limpia caravana, peso y observación; foco en
   * Caravana. Avisa que se guardó pero que hay que seguir (continuar: true).
   */
  async function manejarGuardarYAgregarOtro() {
    const creado = await guardar()
    if (creado) {
      setCaravana('')
      setPesoInicial('')
      setObservacion('')
      setErrores({})
      refCaravana.current?.focus()
      alGuardar(creado, { continuar: true })
    }
  }

  /**
   * Hay algo que se perdería al cerrar sin guardar: caravana, peso u
   * observación distintos de su valor inicial (ver manejarSolicitudDeCierre).
   * En modo "crear" el valor inicial de los tres es "", así que esto se
   * reduce exactamente al chequeo de antes ("¿hay algo escrito?"); en modo
   * "editar" los campos ya vienen precargados, así que hace falta comparar
   * contra lo que trajo valoresIniciales en vez de contra "".
   */
  function hayDatosSinGuardar() {
    const caravanaInicial = (valoresIniciales.aniCaravana ?? '').trim()
    const pesoInicialDeOrigen = valoresIniciales.aniPesoInicial != null ? String(valoresIniciales.aniPesoInicial) : ''
    const observacionInicial = valoresIniciales.aniObservacion ?? ''
    return (
      caravana.trim() !== caravanaInicial ||
      pesoInicial.trim() !== pesoInicialDeOrigen ||
      observacion !== observacionInicial
    )
  }

  // "Cancelar" (y, vía solicitarCierre, Escape/clic en el fondo del Modal
  // que envuelva este formulario) pide confirmación solo si hay algo que
  // se perdería. Elegir raza/lote/dueño o dejar la fecha en su valor por
  // defecto no cuenta, porque esos tres se conservan a propósito entre
  // altas ("Guardar y agregar otro") y no tendría sentido advertir por
  // ellos.
  function manejarSolicitudDeCierre() {
    if (hayDatosSinGuardar() && !window.confirm('Vas a perder los datos que escribiste. ¿Cerrar igual?')) {
      return
    }
    alCancelar()
  }

  useImperativeHandle(ref, () => ({ solicitarCierre: manejarSolicitudDeCierre }))

  /** La raza recién creada por alta rápida se agrega a las opciones, queda seleccionada, y el foco vuelve al select. */
  function alCrearRaza(razaCreada) {
    setRazas((actual) => [...actual, razaCreada])
    setRazaId(String(razaCreada.rzId))
    refRaza.current?.focus()
  }

  /** El lote recién creado por alta rápida se agrega a las opciones, queda seleccionado, y el foco vuelve al select. */
  function alCrearLote(subGrupoCreado) {
    setSubGrupos((actual) => [...actual, subGrupoCreado])
    setSubGrupoId(String(subGrupoCreado.sbId))
    refSubGrupo.current?.focus()
  }

  if (cargando) {
    return <p role="status">Cargando datos del formulario…</p>
  }

  if (error) {
    return (
      <div className="estado-mensaje tarjeta">
        <p>{error}</p>
        <button type="button" className="boton-secundario" onClick={recargar}>
          <RefreshCw aria-hidden="true" size={16} />
          Reintentar
        </button>
      </div>
    )
  }

  return (
    <form className="formulario-animal" onSubmit={manejarEnviar} noValidate>
      <div className="campo">
        <label htmlFor="nuevo-animal-caravana">Caravana</label>
        <input
          id="nuevo-animal-caravana"
          ref={refCaravana}
          type="text"
          value={caravana}
          onChange={(evento) => setCaravana(evento.target.value)}
          onKeyDown={alPresionarEnterIrA(refRaza)}
          aria-invalid={Boolean(errores.caravana)}
          disabled={guardando}
        />
        {errores.caravana && (
          <p className="campo-error" role="alert">
            {errores.caravana}
          </p>
        )}
      </div>

      <div className="campo">
        <label htmlFor="nuevo-animal-raza">Raza</label>
        <div className="campo-con-alta-rapida">
          <select
            id="nuevo-animal-raza"
            ref={refRaza}
            value={razaId}
            onChange={(evento) => setRazaId(evento.target.value)}
            onKeyDown={alPresionarEnterIrA(refSubGrupo)}
            aria-invalid={Boolean(errores.razaId)}
            disabled={guardando}
          >
            <option value="">Elegí una raza</option>
            {razas.map((raza) => (
              <option key={raza.rzId} value={raza.rzId}>
                {raza.rzDescripcion}
              </option>
            ))}
          </select>
          <AltaRapidaRaza razas={razas} onCreada={alCrearRaza} />
        </div>
        {errores.razaId && (
          <p className="campo-error" role="alert">
            {errores.razaId}
          </p>
        )}
      </div>

      <div className="campo">
        <label htmlFor="nuevo-animal-lote">Lote</label>
        <div className="campo-con-alta-rapida">
          <select
            id="nuevo-animal-lote"
            ref={refSubGrupo}
            value={subGrupoId}
            onChange={(evento) => setSubGrupoId(evento.target.value)}
            onKeyDown={alPresionarEnterIrA(refDuenio)}
            aria-invalid={Boolean(errores.subGrupoId)}
            disabled={guardando}
          >
            <option value="">Elegí un lote</option>
            {subGrupos.map((subGrupo) => (
              <option key={subGrupo.sbId} value={subGrupo.sbId}>
                {subGrupo.sbDescripcion}
                {subGrupo.grupo ? ` (${subGrupo.grupo.grpDescripcion})` : ''}
              </option>
            ))}
          </select>
          <AltaRapidaLote subGrupos={subGrupos} onCreado={alCrearLote} />
        </div>
        {errores.subGrupoId && (
          <p className="campo-error" role="alert">
            {errores.subGrupoId}
          </p>
        )}
      </div>

      <div className="campo">
        <label htmlFor="nuevo-animal-duenio">Dueño</label>
        <select
          id="nuevo-animal-duenio"
          ref={refDuenio}
          value={duenioId}
          onChange={(evento) => setDuenioId(evento.target.value)}
          onKeyDown={alPresionarEnterIrA(refFecha)}
          aria-invalid={Boolean(errores.duenioId)}
          disabled={guardando}
        >
          <option value="">Elegí un dueño</option>
          {duenios.map((persona) => (
            <option key={persona.perId} value={persona.perId}>
              {persona.perNombre} {persona.perApellido}
            </option>
          ))}
        </select>
        {errores.duenioId && (
          <p className="campo-error" role="alert">
            {errores.duenioId}
          </p>
        )}
      </div>

      <div className="campo">
        <label htmlFor="nuevo-animal-fecha">Fecha de ingreso</label>
        <input
          id="nuevo-animal-fecha"
          ref={refFecha}
          type="date"
          value={fechaIngreso}
          max={obtenerFechaHoyIso()}
          onChange={(evento) => setFechaIngreso(evento.target.value)}
          onKeyDown={alPresionarEnterIrA(refPeso)}
          aria-invalid={Boolean(errores.fechaIngreso)}
          disabled={guardando}
        />
        {errores.fechaIngreso && (
          <p className="campo-error" role="alert">
            {errores.fechaIngreso}
          </p>
        )}
      </div>

      <div className="campo">
        <label htmlFor="nuevo-animal-peso">Peso inicial (kg)</label>
        <input
          id="nuevo-animal-peso"
          ref={refPeso}
          type="text"
          inputMode="decimal"
          value={pesoInicial}
          onChange={(evento) => setPesoInicial(evento.target.value)}
          onKeyDown={alPresionarEnterIrA(refObservacion)}
          aria-invalid={Boolean(errores.pesoInicial)}
          disabled={guardando}
        />
        {errores.pesoInicial && (
          <p className="campo-error" role="alert">
            {errores.pesoInicial}
          </p>
        )}
      </div>

      <div className="campo">
        <label htmlFor="nuevo-animal-observacion">Observación (opcional)</label>
        <textarea
          id="nuevo-animal-observacion"
          ref={refObservacion}
          rows={3}
          value={observacion}
          onChange={(evento) => setObservacion(evento.target.value)}
          disabled={guardando}
        />
      </div>

      {errorGeneral && (
        <p className="formulario-animal-error-general" role="alert">
          {errorGeneral}
        </p>
      )}

      <div className="formulario-animal-acciones">
        <button type="button" className="boton-secundario" onClick={manejarSolicitudDeCierre} disabled={guardando}>
          Cancelar
        </button>
        {modo === 'crear' && (
          <button type="button" className="boton-secundario" onClick={manejarGuardarYAgregarOtro} disabled={guardando}>
            {guardando ? 'Guardando...' : 'Guardar y agregar otro'}
          </button>
        )}
        <button type="submit" className="boton-primario" disabled={guardando}>
          {guardando ? 'Guardando...' : 'Guardar'}
        </button>
      </div>
    </form>
  )
})

export default FormularioAnimal
