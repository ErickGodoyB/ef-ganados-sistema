/**
 * Formulario de "Nuevo animal" (RF001), dentro del Modal genérico. Carga
 * razas, lotes y dueños al abrirse (useDatosFormularioAnimal); valida en
 * el cliente antes de mandar el POST a /api/animales; ofrece "Guardar"
 * (cierra el modal) y "Guardar y agregar otro" (mantiene raza, lote, dueño
 * y fecha, limpia caravana y peso, y vuelve el foco a Caravana). Enter en
 * cualquier campo salvo el último pasa al siguiente; Enter en el último
 * (Peso inicial) envía con "Guardar", igual que en Login.jsx.
 */

import { useEffect, useRef, useState } from 'react'
import { ErrorHttp, peticionProtegida } from '../../api/cliente'
import Modal from '../../componentes/Modal'
import { useDatosFormularioAnimal } from './useDatosFormularioAnimal'
import './ModalNuevoAnimal.css'

/** Fecha de hoy en formato aaaa-mm-dd, en hora local (no UTC: evita que el huso corra la fecha un día). */
function obtenerFechaHoyIso() {
  const ahora = new Date()
  const anio = ahora.getFullYear()
  const mes = String(ahora.getMonth() + 1).padStart(2, '0')
  const dia = String(ahora.getDate()).padStart(2, '0')
  return `${anio}-${mes}-${dia}`
}

/** Convierte el texto del campo de peso (acepta coma o punto) a número; NaN si no es válido. */
function parsearPeso(texto) {
  const normalizado = texto.trim().replace(',', '.')
  return normalizado === '' ? NaN : Number(normalizado)
}

export default function ModalNuevoAnimal({ onCerrar, onGuardado, refDisparador }) {
  const { razas, subGrupos, duenios, cargando, error, recargar } = useDatosFormularioAnimal()

  const [caravana, setCaravana] = useState('')
  const [razaId, setRazaId] = useState('')
  const [subGrupoId, setSubGrupoId] = useState('')
  const [duenioId, setDuenioId] = useState('')
  const [fechaIngreso, setFechaIngreso] = useState(() => obtenerFechaHoyIso())
  const [pesoInicial, setPesoInicial] = useState('')
  const [errores, setErrores] = useState({})
  const [errorGeneral, setErrorGeneral] = useState('')
  const [guardando, setGuardando] = useState(false)

  const refCaravana = useRef(null)
  const refRaza = useRef(null)
  const refSubGrupo = useRef(null)
  const refDuenio = useRef(null)
  const refFecha = useRef(null)
  const refPeso = useRef(null)

  // El modal se monta antes de que lleguen los datos del formulario (Modal
  // intenta enfocar algo enfocable al abrirse, pero todavía no hay nada:
  // solo el texto de "cargando"). En cuanto el formulario aparece, el foco
  // pasa a Caravana.
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

  /** Valida y, si está todo bien, manda el POST. Devuelve el animal creado, o null si no se guardó. */
  async function guardar() {
    const encontrados = validar()
    if (Object.keys(encontrados).length > 0) {
      setErrores(encontrados)
      enfocarPrimerError(encontrados)
      return null
    }

    setGuardando(true)
    setErrorGeneral('')
    try {
      return await peticionProtegida('/api/animales', {
        method: 'POST',
        body: JSON.stringify({
          duenioId: Number(duenioId),
          razaId: Number(razaId),
          subGrupoId: Number(subGrupoId),
          aniCaravana: caravana.trim(),
          aniFechaIngreso: fechaIngreso,
          aniPesoInicial: parsearPeso(pesoInicial),
        }),
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

  /** "Guardar": si se guardó bien, avisa al listado y cierra el modal. */
  async function manejarEnviar(evento) {
    evento.preventDefault()
    const creado = await guardar()
    if (creado) {
      onGuardado(creado)
      onCerrar()
    }
  }

  /** "Guardar y agregar otro": mantiene raza, lote, dueño y fecha; limpia caravana y peso; foco en Caravana. */
  async function manejarGuardarYAgregarOtro() {
    const creado = await guardar()
    if (creado) {
      onGuardado(creado)
      setCaravana('')
      setPesoInicial('')
      setErrores({})
      refCaravana.current?.focus()
    }
  }

  // "Cancelar" (y Escape/clic en el fondo, vía Modal) piden confirmación
  // solo si hay algo que se perdería: caravana o peso ya escritos. Elegir
  // raza/lote/dueño o dejar la fecha en su valor por defecto no cuenta,
  // porque esos tres se conservan a propósito entre altas ("Guardar y
  // agregar otro") y no tendría sentido advertir por ellos.
  function manejarSolicitudDeCierre() {
    const hayDatosSinGuardar = caravana.trim() !== '' || pesoInicial.trim() !== ''
    if (hayDatosSinGuardar && !window.confirm('Vas a perder los datos que escribiste. ¿Cerrar igual?')) {
      return
    }
    onCerrar()
  }

  return (
    <Modal titulo="Nuevo animal" onCerrar={manejarSolicitudDeCierre} refDisparador={refDisparador}>
      {cargando && <p role="status">Cargando datos del formulario…</p>}

      {!cargando && error && (
        <div className="modal-nuevo-animal-estado">
          <p>{error}</p>
          <button type="button" onClick={recargar}>
            Reintentar
          </button>
        </div>
      )}

      {!cargando && !error && (
        <form className="modal-nuevo-animal-formulario" onSubmit={manejarEnviar} noValidate>
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
            {errores.razaId && (
              <p className="campo-error" role="alert">
                {errores.razaId}
              </p>
            )}
          </div>

          <div className="campo">
            <label htmlFor="nuevo-animal-lote">Lote</label>
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
              aria-invalid={Boolean(errores.pesoInicial)}
              disabled={guardando}
            />
            {errores.pesoInicial && (
              <p className="campo-error" role="alert">
                {errores.pesoInicial}
              </p>
            )}
          </div>

          {errorGeneral && (
            <p className="modal-nuevo-animal-error-general" role="alert">
              {errorGeneral}
            </p>
          )}

          <div className="modal-nuevo-animal-acciones">
            <button
              type="button"
              className="boton-secundario"
              onClick={manejarSolicitudDeCierre}
              disabled={guardando}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="boton-secundario"
              onClick={manejarGuardarYAgregarOtro}
              disabled={guardando}
            >
              {guardando ? 'Guardando...' : 'Guardar y agregar otro'}
            </button>
            <button type="submit" className="boton-primario" disabled={guardando}>
              {guardando ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  )
}
