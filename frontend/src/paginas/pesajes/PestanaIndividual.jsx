/**
 * Pestaña "Individual" del modal "Nuevo pesaje" (RF011): un único animal,
 * fecha y peso, para cargar un pesaje suelto sin pasar por una sesión
 * completa. "Guardar" cierra el modal; "Guardar y agregar otro" limpia
 * animal y peso (conserva la fecha) y deja el modal abierto para seguir
 * cargando, así que usa su propio aviso/recarga de fondo (onGuardadoParcial)
 * en vez del que cierra todo (onGuardado).
 */

import { useEffect, useRef, useState } from 'react'
import { ErrorHttp, peticionProtegida } from '../../api/cliente'
import BuscadorAnimal from '../../componentes/BuscadorAnimal'
import { useAuth } from '../../auth/useAuth'
import { formatearPeso } from '../../utilidades/formato'
import './PestanaIndividual.css'

/** Fecha de hoy en formato aaaa-mm-dd, en hora local. */
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
  const { personaId, cargandoYo, errorYo } = useAuth()

  const [texto, setTexto] = useState('')
  const [animalElegido, setAnimalElegido] = useState(null)
  const [fecha, setFecha] = useState(obtenerFechaHoyIso())
  const [peso, setPeso] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [accionEnCurso, setAccionEnCurso] = useState(null)
  const [errorGuardar, setErrorGuardar] = useState('')

  const refBuscador = useRef(null)

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
      })
      setTexto(animal.aniCaravana)
      onConsumidaPreseleccion()
    }
    aplicarPreseleccion()
  }, [animalParaPreseleccionar, onConsumidaPreseleccion])

  const opciones = animales.map((animal) => ({
    id: animal.aniId,
    caravana: animal.aniCaravana,
    lote: textoLoteDeAnimal(animal),
    pesoActual: animal.pesoActual,
  }))

  function elegir(opcion) {
    setAnimalElegido(opcion)
    setTexto(opcion.caravana)
  }

  function cambiarTexto(valor) {
    setTexto(valor)
    setAnimalElegido(null)
  }

  const pesoNumero = parsearPeso(peso)
  const pesoValido = peso.trim() !== '' && !Number.isNaN(pesoNumero) && pesoNumero > 0 && pesoNumero <= 2000
  const avisoPesoMenor =
    animalElegido && pesoValido && pesoNumero < animalElegido.pesoActual
      ? `Es menor al último peso registrado (${formatearPeso(animalElegido.pesoActual)})`
      : ''

  async function guardar(continuar) {
    if (!animalElegido || !pesoValido || !fecha || personaId == null) {
      return
    }
    setGuardando(true)
    setAccionEnCurso(continuar ? 'agregarOtro' : 'guardar')
    setErrorGuardar('')
    try {
      await peticionProtegida(`/api/animales/${animalElegido.id}/pesajes`, {
        method: 'POST',
        body: JSON.stringify({ peso: pesoNumero, fecha, responsableId: personaId }),
      })
      const mensaje = `Pesaje de ${animalElegido.caravana} guardado`
      if (continuar) {
        setTexto('')
        setAnimalElegido(null)
        setPeso('')
        refBuscador.current?.enfocar()
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
            textoSinResultados="No hay animales con ese texto"
            alNoEncontrado={(textoEscrito) => onRegistrarNuevo({ caravana: textoEscrito, fecha })}
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
                type="text"
                inputMode="decimal"
                value={peso}
                onChange={(evento) => setPeso(evento.target.value)}
                disabled={guardando}
              />
            </div>
          </div>

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
          disabled={guardando || !animalElegido || !pesoValido || personaId == null}
        >
          {accionEnCurso === 'agregarOtro' ? 'Guardando...' : 'Guardar y agregar otro'}
        </button>
        <button
          type="button"
          className="boton-primario"
          onClick={() => guardar(false)}
          disabled={guardando || !animalElegido || !pesoValido || personaId == null}
        >
          {accionEnCurso === 'guardar' ? 'Guardando...' : 'Guardar'}
        </button>
      </div>
    </div>
  )
}
