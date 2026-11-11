/**
 * Pestaña "Individual" del modal "Nuevo pesaje" (RF011): un único animal,
 * fecha y peso, para cargar un pesaje suelto sin pasar por una sesión
 * completa. "Guardar" cierra el modal; "Guardar y agregar otro" limpia
 * animal y peso (conserva la fecha) y deja el modal abierto para seguir
 * cargando, así que usa su propio aviso/recarga de fondo (onGuardadoParcial)
 * en vez del que cierra todo (onGuardado), y le devuelve el foco al
 * buscador (vía el efecto que consume "pedidoFocoBuscador": enfocar en el
 * momento mismo de guardar no funciona porque el campo todavía tiene el
 * disabled viejo, de cuando guardando era true).
 *
 * Si la fecha elegida es anterior a fechaUltimoPesaje del animal (el
 * resumen), se avisa (sin bloquear, ver avisoRetroactivo) en vez de
 * comparar el peso contra el último registrado (avisoPesoMenor): ese
 * "último" sería de una fecha posterior a la que se está cargando, así
 * que la comparación no tendría sentido.
 *
 * El responsable (ver CampoResponsable/usePersonasResponsable) arranca
 * preseleccionado con la persona del usuario actual, pero es elegible:
 * "responsableId" (no "personaId" directo) es lo que se manda en el POST.
 */

import { TriangleAlert } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ErrorHttp, peticionProtegida } from '../../api/cliente'
import BuscadorAnimal from '../../componentes/BuscadorAnimal'
import { useAuth } from '../../auth/useAuth'
import { motivoNoElegible } from '../../utilidades/elegibilidadPesaje'
import { formatearPeso } from '../../utilidades/formato'
import { parsearPeso, pesoTextoEsValido } from '../../utilidades/peso'
import { avisoPesajeRetroactivo } from '../../utilidades/pesajeRetroactivo'
import CampoResponsable from './CampoResponsable'
import { useIdsYaPesadosEnFecha } from './useIdsYaPesadosEnFecha'
import { usePersonasResponsable } from './usePersonasResponsable'
import './PestanaIndividual.css'

/** Fecha de hoy en formato aaaa-mm-dd, en hora local. */
function obtenerFechaHoyIso() {
  const ahora = new Date()
  const anio = ahora.getFullYear()
  const mes = String(ahora.getMonth() + 1).padStart(2, '0')
  const dia = String(ahora.getDate()).padStart(2, '0')
  return `${anio}-${mes}-${dia}`
}

/** "Lote — Grupo", o null si el animal no tiene lote (BuscadorAnimal no muestra ese segmento si es null). */
function textoLoteDeAnimal(animal) {
  if (!animal.subGrupoDescripcion) {
    return null
  }
  return animal.grupoDescripcion ? `${animal.subGrupoDescripcion} — ${animal.grupoDescripcion}` : animal.subGrupoDescripcion
}

export default function PestanaIndividual({
  animales,
  cargandoAnimales,
  errorAnimales,
  animalParaPreseleccionar,
  onConsumidaPreseleccion,
  onRegistrarNuevo,
  onGuardado,
  onGuardadoParcial,
}) {
  const { personaId, personaNombre, cargandoYo, errorYo } = useAuth()
  const { personas, cargandoPersonas, errorPersonas } = usePersonasResponsable(personaId)

  const [texto, setTexto] = useState('')
  const [animalElegido, setAnimalElegido] = useState(null)
  const [fecha, setFecha] = useState(obtenerFechaHoyIso())
  const [peso, setPeso] = useState('')
  const [responsableId, setResponsableId] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const [accionEnCurso, setAccionEnCurso] = useState(null)
  const [errorGuardar, setErrorGuardar] = useState('')
  // Pedido de foco para el buscador tras "Guardar y agregar otro": se marca
  // en guardar() y se consume en el efecto de abajo, una vez que el
  // re-render ya dejó el campo habilitado (ver ese efecto: enfocar en el
  // momento no funciona porque el campo todavía está disabled={guardando}
  // con el valor viejo de guardando). Es un ref (no un estado) para no
  // disparar un re-render extra solo por apagar el pedido ya atendido.
  const refPedidoFocoBuscador = useRef(false)

  const refBuscador = useRef(null)
  const refPeso = useRef(null)
  const idsYaPesadosHoy = useIdsYaPesadosEnFecha(fecha)

  useEffect(() => {
    function aplicarPreseleccion() {
      if (animalParaPreseleccionar?.pestana !== 'individual') {
        return
      }
      const animal = animalParaPreseleccionar.animal
      setAnimalElegido({
        id: animal.aniId,
        caravana: animal.aniCaravana,
        lote: textoLoteDeAnimal(animal),
        pesoActual: animal.pesoActual,
        fechaUltimoPesaje: animal.fechaUltimoPesaje,
        subGrupoId: animal.subGrupoId,
      })
      setTexto(animal.aniCaravana)
      // Si no había un peso ya escrito, se precarga con el peso inicial
      // recién puesto en el alta rápida (editable); si ya había uno, se
      // respeta (es justo lo que "salvo que el usuario ya hubiera escrito
      // un peso antes" pide).
      if (!peso.trim()) {
        setPeso(String(animal.aniPesoInicial).replace('.', ','))
      }
      // El siguiente paso es revisar el peso (ya precargado) y guardar: a
      // diferencia de "Por lote", acá "Guardar" dispara el POST real al
      // toque, así que el foco va al peso (editable, sin riesgo) y no al
      // botón -un Enter/espacio sin querer ahí ya guardaría de verdad-.
      refPeso.current?.focus()
      onConsumidaPreseleccion()
    }
    aplicarPreseleccion()
    // "peso" se lee adentro (para no pisarlo si ya había algo escrito) pero
    // a propósito no es una dependencia: el efecto solo tiene que correr
    // cuando llega un animalParaPreseleccionar nuevo, nunca por el propio
    // setPeso de acá arriba (eso lo reiniciaría en bucle).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animalParaPreseleccionar, onConsumidaPreseleccion])

  useEffect(() => {
    if (refPedidoFocoBuscador.current && !guardando) {
      refBuscador.current?.enfocar()
      refPedidoFocoBuscador.current = false
    }
  }, [guardando])

  // Preselecciona el responsable con la persona actual apenas se conoce
  // (useAuth es async); no lo pisa si el usuario ya había elegido otro.
  useEffect(() => {
    if (personaId != null) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setResponsableId((actual) => actual ?? personaId)
    }
  }, [personaId])

  const elegibles = useMemo(
    () => animales.filter((animal) => motivoNoElegible(animal, fecha, idsYaPesadosHoy) == null),
    [animales, fecha, idsYaPesadosHoy],
  )

  const opciones = elegibles.map((animal) => ({
    id: animal.aniId,
    caravana: animal.aniCaravana,
    lote: textoLoteDeAnimal(animal),
    pesoActual: animal.pesoActual,
    fechaUltimoPesaje: animal.fechaUltimoPesaje,
    subGrupoId: animal.subGrupoId,
  }))

  function elegir(opcion) {
    setAnimalElegido(opcion)
    setTexto(opcion.caravana)
  }

  function cambiarTexto(valor) {
    setTexto(valor)
    setAnimalElegido(null)
  }

  // Si lo escrito coincide EXACTO con la caravana de un animal que ya
  // existe (sea o no elegible), nunca se ofrece "Registrar animal nuevo":
  // si no es elegible, en vez de esa opción se explica el motivo.
  const textoBuscado = texto.trim()
  const animalExistente = textoBuscado
    ? animales.find((animal) => animal.aniCaravana.toLowerCase() === textoBuscado.toLowerCase())
    : null
  const motivoExistente = animalExistente ? motivoNoElegible(animalExistente, fecha, idsYaPesadosHoy) : null

  const pesoNumero = parsearPeso(peso)
  const pesoValido = pesoTextoEsValido(peso)

  // Si el pesaje es retroactivo, "pesoActual" es de una fecha posterior a
  // la que se está cargando: compararlo contra el peso nuevo no tendría
  // sentido, así que ese aviso se reemplaza por el retroactivo.
  const avisoRetroactivo = animalElegido
    ? avisoPesajeRetroactivo(animalElegido.caravana, fecha, animalElegido.fechaUltimoPesaje, animalElegido.subGrupoId)
    : null
  const avisoPesoMenor =
    !avisoRetroactivo && animalElegido && pesoValido && pesoNumero < animalElegido.pesoActual
      ? `Es menor al último peso registrado (${formatearPeso(animalElegido.pesoActual)})`
      : ''

  const responsableIdEfectivo = responsableId ?? personaId

  async function guardar(continuar) {
    if (!animalElegido || !pesoValido || !fecha || responsableIdEfectivo == null) {
      return
    }
    setGuardando(true)
    setAccionEnCurso(continuar ? 'agregarOtro' : 'guardar')
    setErrorGuardar('')
    try {
      await peticionProtegida(`/api/animales/${animalElegido.id}/pesajes`, {
        method: 'POST',
        body: JSON.stringify({ peso: pesoNumero, fecha, responsableId: responsableIdEfectivo }),
      })
      const mensaje = `Pesaje de ${animalElegido.caravana} guardado`
      if (continuar) {
        setTexto('')
        setAnimalElegido(null)
        setPeso('')
        refPedidoFocoBuscador.current = true
        onGuardadoParcial(mensaje)
      } else {
        onGuardado(mensaje)
      }
    } catch (err) {
      setErrorGuardar(
        err instanceof ErrorHttp ? err.message || 'No se pudo guardar el pesaje.' : 'No se pudo conectar con el servidor.',
      )
    } finally {
      setGuardando(false)
      setAccionEnCurso(null)
    }
  }

  return (
    <div className="pestana-individual">
      {cargandoAnimales && <p role="status">Cargando animales…</p>}

      {!cargandoAnimales && errorAnimales && (
        <p className="campo-error" role="alert">
          {errorAnimales}
        </p>
      )}

      {!cargandoAnimales && !errorAnimales && (
        <>
          <BuscadorAnimal
            ref={refBuscador}
            id="nuevo-pesaje-buscador-individual"
            label="Buscar animal por caravana"
            opciones={opciones}
            valor={texto}
            alCambiarValor={cambiarTexto}
            alElegir={elegir}
            textoSinResultados={motivoExistente || 'No hay animales con ese texto'}
            alNoEncontrado={animalExistente ? undefined : (textoEscrito) => onRegistrarNuevo({ caravana: textoEscrito, fecha })}
            disabled={guardando}
          />

          <div className="pestana-individual-campos">
            <div className="campo">
              <label htmlFor="nuevo-pesaje-individual-fecha">Fecha</label>
              <input
                id="nuevo-pesaje-individual-fecha"
                type="date"
                value={fecha}
                max={obtenerFechaHoyIso()}
                onChange={(evento) => setFecha(evento.target.value)}
                disabled={guardando}
              />
            </div>

            <div className="campo">
              <label htmlFor="nuevo-pesaje-individual-peso">Peso (kg)</label>
              <input
                id="nuevo-pesaje-individual-peso"
                ref={refPeso}
                type="text"
                inputMode="decimal"
                value={peso}
                onChange={(evento) => setPeso(evento.target.value)}
                disabled={guardando}
              />
            </div>

            <CampoResponsable
              id="nuevo-pesaje-individual-responsable"
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

          {avisoRetroactivo && (
            <p className="pestana-individual-aviso-retroactivo" role="status">
              <TriangleAlert aria-hidden="true" size={16} />
              {avisoRetroactivo}
            </p>
          )}

          {avisoPesoMenor && (
            <p className="pestana-individual-aviso-peso" aria-live="polite">
              {avisoPesoMenor}
            </p>
          )}
        </>
      )}

      {cargandoYo && <p role="status">Identificando al usuario actual…</p>}

      {!cargandoYo && (errorYo || personaId == null) && (
        <p className="campo-error" role="alert">
          {errorYo || 'No se encontró una persona asociada a tu usuario.'} No se puede guardar el pesaje sin saber a
          nombre de quién registrarlo.
        </p>
      )}

      {errorGuardar && (
        <p className="campo-error" role="alert">
          {errorGuardar}
        </p>
      )}

      <div className="pestana-individual-acciones">
        <button
          type="button"
          className="boton-secundario"
          onClick={() => guardar(true)}
          disabled={guardando || !animalElegido || !pesoValido || responsableIdEfectivo == null}
        >
          {accionEnCurso === 'agregarOtro' ? 'Guardando...' : 'Guardar y agregar otro'}
        </button>
        <button
          type="button"
          className="boton-primario"
          onClick={() => guardar(false)}
          disabled={guardando || !animalElegido || !pesoValido || responsableIdEfectivo == null}
        >
          {accionEnCurso === 'guardar' ? 'Guardando...' : 'Guardar'}
        </button>
      </div>
    </div>
  )
}
