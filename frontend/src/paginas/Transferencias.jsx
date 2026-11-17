/**
 * Pantalla de Transferencias entre lotes: dos pestañas, "Nueva
 * transferencia" (elegir animales y destino, ver
 * transferencias/PestanaNuevaTransferencia.jsx) e "Historial" (ver
 * transferencias/PestanaHistorialTransferencias.jsx). Las dos quedan
 * siempre montadas (la inactiva con el atributo "hidden") para que cambiar
 * de pestaña no pierda la selección a medio armar ni el intervalo elegido
 * (mismo criterio que ModalNuevoPesaje).
 *
 * Cuando algo cambia datos que la otra pestaña ya cargó, se la vuelve a
 * montar cambiándole la "key": registrar una transferencia refresca el
 * historial y la lista de animales (que cambiaron de lote), y devolver una
 * desde el historial refresca la lista de animales. El aviso de éxito vive
 * acá, no en la pestaña, porque la pestaña se vuelve a montar y lo
 * perdería.
 */

import { useRef, useState } from 'react'
import EncabezadoPagina from '../componentes/EncabezadoPagina'
import PestanaHistorialTransferencias from './transferencias/PestanaHistorialTransferencias'
import PestanaNuevaTransferencia from './transferencias/PestanaNuevaTransferencia'
import './Transferencias.css'

const PESTANAS = [
  { clave: 'nueva', etiqueta: 'Nueva transferencia' },
  { clave: 'historial', etiqueta: 'Historial' },
]

export default function Transferencias() {
  const [pestana, setPestana] = useState('nueva')
  const [versionNueva, setVersionNueva] = useState(0)
  const [versionHistorial, setVersionHistorial] = useState(0)
  const [aviso, setAviso] = useState('')
  const refTemporizadorAviso = useRef(null)
  const refPestanas = useRef({})

  /** Muestra un aviso breve y lo retira solo a los pocos segundos (mismo patrón que Pesajes.jsx). */
  function mostrarAviso(mensaje) {
    setAviso(mensaje)
    window.clearTimeout(refTemporizadorAviso.current)
    refTemporizadorAviso.current = window.setTimeout(() => setAviso(''), 6000)
  }

  /** Transferencia registrada: aviso, selección vacía con datos frescos y el historial al día. */
  function alTransferir(mensaje) {
    mostrarAviso(mensaje)
    setVersionNueva((version) => version + 1)
    setVersionHistorial((version) => version + 1)
  }

  /** Flechas izquierda/derecha cambian de pestaña y mueven el foco con ella (patrón ARIA tablist). */
  function manejarTecla(evento) {
    if (evento.key === 'ArrowRight' || evento.key === 'ArrowLeft') {
      evento.preventDefault()
      const siguiente = pestana === 'nueva' ? 'historial' : 'nueva'
      setPestana(siguiente)
      refPestanas.current[siguiente]?.focus()
    }
  }

  return (
    <div className="transferencias-pagina">
      <EncabezadoPagina titulo="Transferencias" subtitulo="Mové animales de un lote a otro y consultá el historial" />

      <div role="tablist" aria-label="Secciones de transferencias" className="transferencias-pestanas">
        {PESTANAS.map((opcion) => (
          <button
            key={opcion.clave}
            type="button"
            ref={(nodo) => {
              refPestanas.current[opcion.clave] = nodo
            }}
            role="tab"
            id={`transferencias-tab-${opcion.clave}`}
            aria-selected={pestana === opcion.clave}
            aria-controls={`transferencias-panel-${opcion.clave}`}
            tabIndex={pestana === opcion.clave ? 0 : -1}
            className={`transferencias-pestana${pestana === opcion.clave ? ' transferencias-pestana--activa' : ''}`}
            onClick={() => setPestana(opcion.clave)}
            onKeyDown={manejarTecla}
          >
            {opcion.etiqueta}
          </button>
        ))}
      </div>

      {aviso && (
        <p className="transferencias-aviso" role="status" aria-live="polite">
          {aviso}
        </p>
      )}

      <div
        id="transferencias-panel-nueva"
        role="tabpanel"
        aria-labelledby="transferencias-tab-nueva"
        hidden={pestana !== 'nueva'}
      >
        <PestanaNuevaTransferencia key={versionNueva} onTransferida={alTransferir} />
      </div>

      <div
        id="transferencias-panel-historial"
        role="tabpanel"
        aria-labelledby="transferencias-tab-historial"
        hidden={pestana !== 'historial'}
      >
        <PestanaHistorialTransferencias
          key={versionHistorial}
          onCambio={() => setVersionNueva((version) => version + 1)}
        />
      </div>
    </div>
  )
}
