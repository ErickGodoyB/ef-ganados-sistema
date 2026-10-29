/**
 * Sección "+ Agregar animal" al pie del detalle de una sesión (RF011): un
 * buscador (ver componentes/BuscadorAnimal.jsx) filtra los animales
 * ELEGIBLES para esta sesión -- del mismo lote (o sin lote), sin salida
 * registrada y que todavía no estén en la sesión -- mostrando caravana y
 * último peso. Elegido uno, pide el peso nuevo y lo registra con
 * POST /api/pesajes/sesion (misma fecha de la sesión, un solo ítem,
 * responsableId = personaId de la persona autenticada).
 */

import { Plus } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { ErrorHttp, peticionProtegida } from '../../api/cliente'
import { useAuth } from '../../auth/useAuth'
import BuscadorAnimal from '../../componentes/BuscadorAnimal'
import { formatearPeso } from '../../utilidades/formato'
import './AgregarAnimalSesion.css'

/** Convierte el texto de un campo de peso (acepta coma o punto) a número; NaN si no es válido. */
function parsearPeso(texto) {
  const normalizado = texto.trim().replace(',', '.')
  return normalizado === '' ? NaN : Number(normalizado)
}

export default function AgregarAnimalSesion({ sesion, idsEnSesion, deshabilitado, onAgregado }) {
  const { personaId, cargandoYo, errorYo } = useAuth()

  const [abierto, setAbierto] = useState(false)
  const [cargandoElegibles, setCargandoElegibles] = useState(false)
  const [errorElegibles, setErrorElegibles] = useState('')
  const [elegibles, setElegibles] = useState([])

  const [texto, setTexto] = useState('')
  const [animalElegido, setAnimalElegido] = useState(null)
  const [peso, setPeso] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [errorGuardar, setErrorGuardar] = useState('')

  const refBuscador = useRef(null)

  useEffect(() => {
    if (abierto && !cargandoElegibles && !errorElegibles) {
      refBuscador.current?.enfocar()
    }
  }, [abierto, cargandoElegibles, errorElegibles])

  /** Trae los animales (una vez por apertura) y filtra los elegibles para esta sesión. */
  async function abrir() {
    setAbierto(true)
    setCargandoElegibles(true)
    setErrorElegibles('')
    try {
      const animales = await peticionProtegida('/api/animales/resumen')
      const filtrados = (animales ?? []).filter((animal) => {
        if (animal.aniFechaEgreso) {
          return false
        }
        if (idsEnSesion.has(animal.aniId)) {
          return false
        }
        return sesion.subGrupoId == null ? animal.subGrupoId == null : animal.subGrupoId === sesion.subGrupoId
      })
      setElegibles(filtrados)
    } catch {
      setErrorElegibles('No se pudieron cargar los animales disponibles.')
    } finally {
      setCargandoElegibles(false)
    }
  }

  function cerrarSeccion() {
    setAbierto(false)
    setTexto('')
    setAnimalElegido(null)
    setPeso('')
    setErrorGuardar('')
  }

  // BuscadorAnimal no necesita conocer el resto de los campos del animal
  // (duenio, raza, etc.): solo id/caravana/peso. El lote no se muestra acá
  // porque ya está implícito (es el mismo de la sesión).
  const opciones = elegibles.map((animal) => ({ id: animal.aniId, caravana: animal.aniCaravana, pesoActual: animal.pesoActual }))

  function elegir(opcion) {
    setAnimalElegido(opcion)
    setTexto(opcion.caravana)
  }

  function manejarCambioTexto(valor) {
    setTexto(valor)
    setAnimalElegido(null)
  }

  const pesoNumero = parsearPeso(peso)
  const pesoValido = peso.trim() !== '' && !Number.isNaN(pesoNumero) && pesoNumero > 0 && pesoNumero <= 2000
  const avisoPesoMenor =
    animalElegido && pesoValido && pesoNumero < animalElegido.pesoActual
      ? `Es menor al último peso registrado (${formatearPeso(animalElegido.pesoActual)})`
      : ''

  async function agregar() {
    if (!animalElegido || !pesoValido || personaId == null) {
      return
    }
    setGuardando(true)
    setErrorGuardar('')
    try {
      await peticionProtegida('/api/pesajes/sesion', {
        method: 'POST',
        body: JSON.stringify({
          fecha: sesion.fecha,
          responsableId: personaId,
          items: [{ animalId: animalElegido.id, peso: pesoNumero }],
        }),
      })
      const caravana = animalElegido.caravana
      cerrarSeccion()
      await onAgregado(`Animal ${caravana} agregado a la sesión`)
    } catch (err) {
      setErrorGuardar(
        err instanceof ErrorHttp ? err.message || 'No se pudo agregar el animal.' : 'No se pudo conectar con el servidor.',
      )
    } finally {
      setGuardando(false)
    }
  }

  if (!abierto) {
    return (
      <div className="agregar-animal-sesion">
        <button type="button" className="boton-secundario" onClick={abrir} disabled={deshabilitado}>
          <Plus aria-hidden="true" size={16} />
          Agregar animal
        </button>
      </div>
    )
  }

  return (
    <div className="agregar-animal-sesion agregar-animal-sesion--abierta">
      <div className="agregar-animal-sesion-encabezado">
        <h3 className="agregar-animal-sesion-titulo">Agregar animal</h3>
        <button type="button" className="boton-fantasma" onClick={cerrarSeccion} disabled={guardando}>
          Cancelar
        </button>
      </div>

      {cargandoYo && <p role="status">Identificando al usuario actual…</p>}

      {!cargandoYo && (errorYo || personaId == null) && (
        <p className="campo-error" role="alert">
          {errorYo || 'No se encontró una persona asociada a tu usuario.'} No se puede agregar un animal sin saber a
          nombre de quién registrarlo.
        </p>
      )}

      {cargandoElegibles && <p role="status">Cargando animales disponibles…</p>}

      {!cargandoElegibles && errorElegibles && (
        <p className="campo-error" role="alert">
          {errorElegibles}
        </p>
      )}

      {!cargandoYo && !errorYo && personaId != null && !cargandoElegibles && !errorElegibles && (
        <>
          <BuscadorAnimal
            ref={refBuscador}
            label="Buscar por caravana"
            opciones={opciones}
            valor={texto}
            alCambiarValor={manejarCambioTexto}
            alElegir={elegir}
            textoSinResultados="No hay animales elegibles con ese texto"
            disabled={deshabilitado || guardando}
          />

          {animalElegido && (
            <div className="agregar-animal-sesion-formulario">
              <div className="campo">
                <label htmlFor="agregar-animal-sesion-peso">Peso (kg)</label>
                <input
                  id="agregar-animal-sesion-peso"
                  type="text"
                  inputMode="decimal"
                  value={peso}
                  onChange={(evento) => setPeso(evento.target.value)}
                  disabled={deshabilitado || guardando}
                />
              </div>

              {avisoPesoMenor && (
                <p className="agregar-animal-sesion-aviso" aria-live="polite">
                  {avisoPesoMenor}
                </p>
              )}

              {errorGuardar && (
                <p className="campo-error" role="alert">
                  {errorGuardar}
                </p>
              )}

              <div className="agregar-animal-sesion-acciones">
                <button
                  type="button"
                  className="boton-primario"
                  onClick={agregar}
                  disabled={deshabilitado || guardando || !pesoValido}
                >
                  {guardando ? 'Agregando...' : 'Agregar'}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
