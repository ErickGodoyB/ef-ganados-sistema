/**
 * Lista de animales candidatos de la pestaña "Nueva transferencia": tabla
 * desde 768px y tarjetas en celular (se ve una u otra por CSS, ver
 * Transferencias.css; las dos están en el DOM, igual que en Pesajes).
 *
 * Cada animal tiene su casilla. Los que ya están en el lote de destino
 * aparecen deshabilitados, con la etiqueta "ya está en el destino": el
 * backend rechaza transferir un animal al lote donde ya está, así que ni
 * se deja marcarlos. La casilla de un animal deshabilitado siempre se
 * muestra sin marcar (aunque estuviera en la selección antes de elegir el
 * destino), para que lo que se ve coincida con lo que se va a enviar.
 */

import EstadoBadge from '../animales/EstadoBadge'
import ValorGmd from '../../componentes/ValorGmd'
import { formatearPeso } from '../../utilidades/formato'

/**
 * Casilla de selección con su texto accesible ("Seleccionar CAR-001") y un
 * área táctil de al menos 44×44 px. "vista" ('tabla' o 'tarjeta') va en el
 * id: la tabla y las tarjetas están las dos en el DOM (solo una se ve, por
 * CSS), y sin esto el mismo animal tendría dos elementos con el mismo id.
 */
function Casilla({ vista, animal, marcada, deshabilitada, onAlternar }) {
  const id = `transferencia-casilla-${vista}-${animal.aniId}`
  return (
    <label className="transferencia-casilla" htmlFor={id}>
      <input
        id={id}
        type="checkbox"
        checked={marcada && !deshabilitada}
        disabled={deshabilitada}
        onChange={() => onAlternar(animal)}
      />
      <span className="visualmente-oculto">Seleccionar {animal.aniCaravana}</span>
    </label>
  )
}

function EtiquetaYaEnDestino() {
  return <span className="transferencia-etiqueta-destino">ya está en el destino</span>
}

export default function ListaAnimalesTransferencia({ animales, seleccionados, destinoId, onAlternar }) {
  const estaEnDestino = (animal) => destinoId !== '' && String(animal.subGrupoId) === destinoId

  return (
    <>
      <div className="transferencia-tabla-solo-escritorio">
        <table className="transferencia-tabla">
          <caption className="visualmente-oculto">Animales activos que se pueden transferir</caption>
          <thead>
            <tr>
              <th scope="col">
                <span className="visualmente-oculto">Selección</span>
              </th>
              <th scope="col">Caravana</th>
              <th scope="col">Raza</th>
              <th scope="col">Lote actual</th>
              <th scope="col">Peso actual</th>
              <th scope="col">GMD</th>
            </tr>
          </thead>
          <tbody>
            {animales.map((animal) => {
              const enDestino = estaEnDestino(animal)
              const marcado = seleccionados.has(animal.aniId) && !enDestino
              return (
                <tr
                  key={animal.aniId}
                  className={marcado ? 'transferencia-fila--marcada' : undefined}
                >
                  <td>
                    <Casilla
                      vista="tabla"
                      animal={animal}
                      marcada={seleccionados.has(animal.aniId)}
                      deshabilitada={enDestino}
                      onAlternar={onAlternar}
                    />
                  </td>
                  <td className="transferencia-caravana">
                    {animal.aniCaravana}
                    {enDestino && <EtiquetaYaEnDestino />}
                  </td>
                  <td>{animal.razaDescripcion}</td>
                  <td>{animal.subGrupoDescripcion ?? 'Sin lote'}</td>
                  <td>{formatearPeso(animal.pesoActual)}</td>
                  <td>
                    <ValorGmd gmd={animal.gmd} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="transferencia-tarjetas-solo-movil">
        {animales.map((animal) => {
          const enDestino = estaEnDestino(animal)
          const marcado = seleccionados.has(animal.aniId) && !enDestino
          return (
            <article
              key={animal.aniId}
              className={`transferencia-tarjeta tarjeta${marcado ? ' transferencia-tarjeta--marcada' : ''}`}
            >
              <div className="transferencia-tarjeta-encabezado">
                <Casilla
                  vista="tarjeta"
                  animal={animal}
                  marcada={seleccionados.has(animal.aniId)}
                  deshabilitada={enDestino}
                  onAlternar={onAlternar}
                />
                <span className="transferencia-caravana">{animal.aniCaravana}</span>
                <span className="transferencia-tarjeta-peso">{formatearPeso(animal.pesoActual)}</span>
              </div>
              {enDestino && <EtiquetaYaEnDestino />}
              <dl className="transferencia-tarjeta-datos">
                <div>
                  <dt>Raza</dt>
                  <dd>{animal.razaDescripcion}</dd>
                </div>
                <div>
                  <dt>Lote actual</dt>
                  <dd>{animal.subGrupoDescripcion ?? 'Sin lote'}</dd>
                </div>
                <div>
                  <dt>GMD</dt>
                  <dd>
                    <ValorGmd gmd={animal.gmd} />
                  </dd>
                </div>
              </dl>
              <EstadoBadge animal={animal} />
            </article>
          )
        })}
      </div>
    </>
  )
}
