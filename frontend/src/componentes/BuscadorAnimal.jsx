/**
 * Buscador de un animal por caravana, tipo combobox accesible por teclado
 * (flechas para moverse entre resultados, Enter para elegir, Escape para
 * cerrar la lista; aria-activedescendant en vez de mover el foco real, así
 * el cursor de texto nunca se pierde). El valor del campo de texto es
 * controlado por quien lo usa (prop "valor" + "alCambiarValor"), igual que
 * la lista de opciones (prop "opciones": ya vienen filtradas por quien
 * llama, acá solo se filtran por el texto escrito).
 *
 * Si se pasa "alNoEncontrado" y no hay resultados para lo escrito, la
 * lista agrega una última opción "Registrar animal nuevo «texto»" que lo
 * llama; si no se pasa (ver AgregarAnimalSesion.jsx, que no la necesita),
 * esa opción no aparece y el comportamiento es el de un combobox común.
 *
 * Expone, vía ref, enfocar(): lo usa quien lo contiene para devolver el
 * foco acá después de una acción rápida (ej. tras agregar un animal con
 * Enter en el campo de peso, ver PestanaPorLote.jsx).
 */

import { Plus, Search } from 'lucide-react'
import { forwardRef, useImperativeHandle, useId, useRef, useState } from 'react'
import { formatearPeso } from '../utilidades/formato'
import './BuscadorAnimal.css'

const BuscadorAnimal = forwardRef(function BuscadorAnimal(
  {
    id,
    label,
    opciones,
    valor,
    alCambiarValor,
    alElegir,
    textoSinResultados,
    alNoEncontrado,
    disabled = false,
    placeholder = 'Ej. CAR-001',
  },
  ref,
) {
  const [listaAbierta, setListaAbierta] = useState(false)
  const [indiceActivo, setIndiceActivo] = useState(-1)

  const idGenerado = useId()
  const idBase = id || idGenerado
  const refInput = useRef(null)

  useImperativeHandle(ref, () => ({
    enfocar: () => refInput.current?.focus(),
  }))

  const textoBuscado = valor.trim().toLowerCase()
  const resultados = textoBuscado ? opciones.filter((opcion) => opcion.caravana.toLowerCase().includes(textoBuscado)) : opciones

  const mostrarOpcionNueva = Boolean(alNoEncontrado) && valor.trim() !== '' && resultados.length === 0
  const totalOpciones = resultados.length + (mostrarOpcionNueva ? 1 : 0)

  function elegir(opcion) {
    alElegir(opcion)
    setListaAbierta(false)
    setIndiceActivo(-1)
  }

  function elegirNueva() {
    alNoEncontrado(valor.trim())
    setListaAbierta(false)
    setIndiceActivo(-1)
  }

  function manejarCambioTexto(evento) {
    alCambiarValor(evento.target.value)
    setListaAbierta(true)
    setIndiceActivo(-1)
  }

  function manejarTeclado(evento) {
    if (evento.key === 'ArrowDown') {
      evento.preventDefault()
      setListaAbierta(true)
      setIndiceActivo((actual) => Math.min(actual + 1, totalOpciones - 1))
    } else if (evento.key === 'ArrowUp') {
      evento.preventDefault()
      setListaAbierta(true)
      setIndiceActivo((actual) => Math.max(actual - 1, 0))
    } else if (evento.key === 'Enter' && listaAbierta && indiceActivo >= 0) {
      evento.preventDefault()
      if (indiceActivo < resultados.length) {
        elegir(resultados[indiceActivo])
      } else if (mostrarOpcionNueva) {
        elegirNueva()
      }
    } else if (evento.key === 'Escape' && listaAbierta) {
      evento.preventDefault()
      setListaAbierta(false)
    }
  }

  const idActivo =
    listaAbierta && indiceActivo >= 0
      ? indiceActivo < resultados.length
        ? `${idBase}-opcion-${resultados[indiceActivo].id}`
        : `${idBase}-opcion-nueva`
      : undefined

  return (
    <div className="campo buscador-animal">
      <label htmlFor={`${idBase}-input`}>{label}</label>
      <div className="campo-busqueda-entrada campo-busqueda--con-icono">
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
          aria-activedescendant={idActivo}
          value={valor}
          onChange={manejarCambioTexto}
          onFocus={() => setListaAbierta(true)}
          onBlur={() => setListaAbierta(false)}
          onKeyDown={manejarTeclado}
          placeholder={placeholder}
          autoComplete="off"
          disabled={disabled}
        />
      </div>
      {listaAbierta && (
        <ul className="buscador-animal-lista" role="listbox" id={`${idBase}-listbox`}>
          {resultados.length === 0 && !mostrarOpcionNueva && <li className="buscador-animal-vacio">{textoSinResultados}</li>}
          {resultados.map((opcion, indice) => (
            <li
              key={opcion.id}
              id={`${idBase}-opcion-${opcion.id}`}
              role="option"
              aria-selected={indice === indiceActivo}
              className={`buscador-animal-opcion${indice === indiceActivo ? ' buscador-animal-opcion--activa' : ''}`}
              onMouseDown={(evento) => evento.preventDefault()}
              onClick={() => elegir(opcion)}
            >
              <span className="buscador-animal-opcion-texto">
                {opcion.caravana}
                {opcion.lote && <span className="buscador-animal-opcion-lote"> · {opcion.lote}</span>}
              </span>
              <span className="buscador-animal-opcion-peso">{formatearPeso(opcion.pesoActual)}</span>
            </li>
          ))}
          {mostrarOpcionNueva && (
            <li
              id={`${idBase}-opcion-nueva`}
              role="option"
              aria-selected={indiceActivo === resultados.length}
              className={`buscador-animal-opcion buscador-animal-opcion--nueva${
                indiceActivo === resultados.length ? ' buscador-animal-opcion--activa' : ''
              }`}
              onMouseDown={(evento) => evento.preventDefault()}
              onClick={elegirNueva}
            >
              <Plus aria-hidden="true" size={16} />
              Registrar animal nuevo «{valor.trim()}»
            </li>
          )}
        </ul>
      )}
    </div>
  )
})

export default BuscadorAnimal
