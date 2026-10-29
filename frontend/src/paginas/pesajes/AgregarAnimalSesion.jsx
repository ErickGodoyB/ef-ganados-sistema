/**
 * Sección "+ Agregar animal" al pie del detalle de una sesión (RF011): un
 * buscador tipo combobox (accesible por teclado: flechas para moverse
 * entre resultados, Enter para elegir, Escape para cerrar la lista) filtra
 * los animales ELEGIBLES para esta sesión -- del mismo lote (o sin lote),
 * sin salida registrada y que todavía no estén en la sesión -- mostrando
 * caravana y último peso. Elegido uno, pide el peso nuevo y lo registra
 * con POST /api/pesajes/sesion (misma fecha de la sesión, un solo ítem,
 * responsableId = personaId de la persona autenticada).
 */

import { Plus, Search } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { ErrorHttp, peticionProtegida } from '../../api/cliente'
import { useAuth } from '../../auth/useAuth'
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
  const [listaAbierta, setListaAbierta] = useState(false)
  const [indiceActivo, setIndiceActivo] = useState(-1)
  const [animalElegido, setAnimalElegido] = useState(null)
  const [peso, setPeso] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [errorGuardar, setErrorGuardar] = useState('')

  const idBase = useId()
  const refInput = useRef(null)

  useEffect(() => {
    if (abierto && !cargandoElegibles && !errorElegibles) {
      refInput.current?.focus()
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
    setListaAbierta(false)
    setIndiceActivo(-1)
  }

  const resultados = texto.trim()
    ? elegibles.filter((animal) => animal.aniCaravana.toLowerCase().includes(texto.trim().toLowerCase()))
    : elegibles

  function elegir(animal) {
    setAnimalElegido(animal)
    setTexto(animal.aniCaravana)
    setListaAbierta(false)
    setIndiceActivo(-1)
  }

  function manejarCambioTexto(valor) {
    setTexto(valor)
    setAnimalElegido(null)
    setListaAbierta(true)
    setIndiceActivo(-1)
  }

  function manejarTeclado(evento) {
    if (evento.key === 'ArrowDown') {
      evento.preventDefault()
      setListaAbierta(true)
      setIndiceActivo((actual) => Math.min(actual + 1, resultados.length - 1))
    } else if (evento.key === 'ArrowUp') {
      evento.preventDefault()
      setListaAbierta(true)
      setIndiceActivo((actual) => Math.max(actual - 1, 0))
    } else if (evento.key === 'Enter' && listaAbierta && indiceActivo >= 0 && resultados[indiceActivo]) {
      evento.preventDefault()
      elegir(resultados[indiceActivo])
    } else if (evento.key === 'Escape' && listaAbierta) {
      evento.preventDefault()
      setListaAbierta(false)
    }
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
          items: [{ animalId: animalElegido.aniId, peso: pesoNumero }],
        }),
      })
      const caravana = animalElegido.aniCaravana
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
          <div className="campo agregar-animal-sesion-combobox">
            <label htmlFor={`${idBase}-input`}>Buscar por caravana</label>
            <div className="campo-busqueda-entrada">
              <Search aria-hidden="true" size={18} className="campo-busqueda-icono" />
              <input
                id={`${idBase}-input`}
                ref={refInput}
                type="text"
                role="combobox"
                aria-haspopup="listbox"
                aria-expanded={listaAbierta}
                aria-controls={`${idBase}-listbox`}
                aria-autocomplete="list"
                aria-activedescendant={
                  listaAbierta && indiceActivo >= 0 && resultados[indiceActivo]
                    ? `${idBase}-opcion-${resultados[indiceActivo].aniId}`
                    : undefined
                }
                className="campo-busqueda--con-icono"
                value={texto}
                onChange={(evento) => manejarCambioTexto(evento.target.value)}
                onFocus={() => setListaAbierta(true)}
                onBlur={() => setListaAbierta(false)}
                onKeyDown={manejarTeclado}
                placeholder="Ej. CAR-001"
                autoComplete="off"
                disabled={deshabilitado || guardando}
              />
            </div>
            {listaAbierta && (
              <ul className="agregar-animal-sesion-lista" role="listbox" id={`${idBase}-listbox`}>
                {resultados.length === 0 && (
                  <li className="agregar-animal-sesion-vacio">No hay animales elegibles con ese texto</li>
                )}
                {resultados.map((animal, indice) => (
                  <li
                    key={animal.aniId}
                    id={`${idBase}-opcion-${animal.aniId}`}
                    role="option"
                    aria-selected={indice === indiceActivo}
                    className={`agregar-animal-sesion-opcion${indice === indiceActivo ? ' agregar-animal-sesion-opcion--activa' : ''}`}
                    onMouseDown={(evento) => evento.preventDefault()}
                    onClick={() => elegir(animal)}
                  >
                    <span>{animal.aniCaravana}</span>
                    <span className="agregar-animal-sesion-opcion-peso">{formatearPeso(animal.pesoActual)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {animalElegido && (
            <div className="agregar-animal-sesion-formulario">
              <div className="campo">
                <label htmlFor={`${idBase}-peso`}>Peso (kg)</label>
                <input
                  id={`${idBase}-peso`}
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
