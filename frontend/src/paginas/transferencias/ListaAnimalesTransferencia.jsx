/**
 * Lista de animales candidatos del modal "Nueva transferencia": tabla desde
 * 768px y tarjetas en celular (se ve una u otra por CSS, ver
 * Transferencias.css; las dos están en el DOM, igual que en Pesajes).
 *
 * Columnas: casilla, caravana, raza, proveedor, cantidad de pesajes, peso de
 * ingreso, peso actual, ganancia total, peso anterior (con su
 * fecha y los días transcurridos hasta el último pesaje, ver
 * ValorPesoAnterior: si el anterior es el ingreso del animal, lo aclara) y
 * GMD. El peso anterior y su fecha vienen del resumen de animales, y los
 * días se miden contra la fecha del último pesaje, que es el pesaje al que
 * pertenece ese "anterior".
 *
 * Cada animal tiene su casilla. Los que ya están en el lote de destino
 * aparecen deshabilitados, con la etiqueta "ya está en el destino": el
 * backend rechaza transferir un animal al lote donde ya está, así que ni
 * se deja marcarlos. La casilla de un animal deshabilitado siempre se
 * muestra sin marcar (aunque estuviera en la selección antes de elegir el
 * destino), para que lo que se ve coincida con lo que se va a enviar.
 */

import ValorDiferenciaPeso from '../../componentes/ValorDiferenciaPeso'
import ValorGmd from '../../componentes/ValorGmd'
import ValorPesoAnterior from '../../componentes/ValorPesoAnterior'
import { formatearPeso } from '../../utilidades/formato'
import './ListaAnimalesTransferencia.css'

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

/** "Sin pesajes" en vez de un 0 pelado (mismo criterio que el listado de Animales). */
function textoPesajes(animal) {
  return animal.cantidadPesajes === 0 ? 'Sin pesajes' : animal.cantidadPesajes
}

function GananciaTotal({ animal }) {
  return <ValorDiferenciaPeso diferencia={animal.gananciaTotal} sinDato="Todavía no tiene pesajes" />
}

function PesoAnterior({ animal }) {
  return (
    <ValorPesoAnterior
      pesoAnterior={animal.pesoAnterior}
      pesoAnteriorEsIngreso={animal.pesoAnteriorEsIngreso}
      fechaPesoAnterior={animal.fechaPesoAnterior}
      fechaPesaje={animal.fechaUltimoPesaje}
    />
  )
}

export default function ListaAnimalesTransferencia({ animales, seleccionados, destinoId, onAlternar }) {
  const estaEnDestino = (animal) => destinoId !== '' && String(animal.subGrupoId) === destinoId

  return (
    <>
      <div className="transferencia-tabla-solo-escritorio">
        <table className="transferencia-tabla">
          <caption className="visualmente-oculto">Animales activos del lote de origen</caption>
          <thead>
            <tr>
              <th scope="col">
                <span className="visualmente-oculto">Selección</span>
              </th>
              <th scope="col">Caravana</th>
              <th scope="col">Raza</th>
              <th scope="col">Proveedor</th>
              <th scope="col">Pesajes</th>
              <th scope="col">Peso de ingreso</th>
              <th scope="col">Peso actual</th>
              <th scope="col">Ganancia total</th>
              <th scope="col">Peso anterior</th>
              <th scope="col">GMD</th>
            </tr>
          </thead>
          <tbody>
            {animales.map((animal) => {
              const enDestino = estaEnDestino(animal)
              const marcado = seleccionados.has(animal.aniId) && !enDestino
              return (
                <tr key={animal.aniId} className={marcado ? 'transferencia-fila--marcada' : undefined}>
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
                  <td>{animal.proveedorNombre || 'Sin proveedor'}</td>
                  <td>{textoPesajes(animal)}</td>
                  <td>{formatearPeso(animal.aniPesoInicial)}</td>
                  <td>{formatearPeso(animal.pesoActual)}</td>
                  <td>
                    <GananciaTotal animal={animal} />
                  </td>
                  <td>
                    <PesoAnterior animal={animal} />
                  </td>
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
                  <dt>Proveedor</dt>
                  <dd>{animal.proveedorNombre || 'Sin proveedor'}</dd>
                </div>
                <div>
                  <dt>Pesajes</dt>
                  <dd>{textoPesajes(animal)}</dd>
                </div>
                <div>
                  <dt>Peso de ingreso</dt>
                  <dd>{formatearPeso(animal.aniPesoInicial)}</dd>
                </div>
                <div>
                  <dt>Ganancia total</dt>
                  <dd>
                    <GananciaTotal animal={animal} />
                  </dd>
                </div>
                <div>
                  <dt>GMD</dt>
                  <dd>
                    <ValorGmd gmd={animal.gmd} />
                  </dd>
                </div>
                <div className="transferencia-tarjeta-dato--ancho">
                  <dt>Peso anterior</dt>
                  <dd>
                    <PesoAnterior animal={animal} />
                  </dd>
                </div>
              </dl>
            </article>
          )
        })}
      </div>
    </>
  )
}
