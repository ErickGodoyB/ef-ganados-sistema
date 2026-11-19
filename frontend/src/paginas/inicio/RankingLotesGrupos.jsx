/**
 * Ranking de lotes y grupos de Inicio: un selector Lotes / Grupos, dos
 * tarjetas destacadas ("Mayor peso promedio" y "Mayor GMD", con "—" si no
 * hay datos o si el máximo está empatado) y, debajo, el ranking en el orden
 * que manda el servidor (GMD promedio de mayor a menor), en tabla desde
 * 768px y tarjetas en celular. La GMD promedio lleva la barra proporcional
 * de BarraGmd (la misma del ranking de proveedores de Reportes).
 */

import { useState } from 'react'
import BarraGmd from '../../componentes/BarraGmd'
import { formatearGmd, formatearPeso } from '../../utilidades/formato'
import { mayorGmdPromedio } from '../reportes/rankingProveedores'
import { filaDestacada } from './rankingInicio'
import './RankingLotesGrupos.css'

const VISTAS = [
  { clave: 'lotes', etiqueta: 'Lotes' },
  { clave: 'grupos', etiqueta: 'Grupos' },
]

function textoPeso(valor) {
  return valor == null ? '—' : formatearPeso(valor)
}

/** Normaliza una fila de lote o de grupo a lo que el ranking necesita mostrar. */
function aFila(vista, item) {
  return vista === 'lotes'
    ? {
        clave: item.loteId ?? 'sin-lote',
        nombre: item.loteDescripcion,
        subtitulo: item.grupoDescripcion,
        lotes: null,
        animales: item.animalesActivos,
        pesoPromedio: item.pesoPromedio,
        gmdPromedio: item.gmdPromedio,
      }
    : {
        clave: item.grupoId ?? 'sin-lote',
        nombre: item.grupoDescripcion,
        subtitulo: null,
        lotes: item.lotes,
        animales: item.animalesActivos,
        pesoPromedio: item.pesoPromedio,
        gmdPromedio: item.gmdPromedio,
      }
}

function Destacado({ titulo, fila, valor }) {
  return (
    <div className="ranking-destacado tarjeta">
      <span className="ranking-destacado-titulo">{titulo}</span>
      <span className="ranking-destacado-nombre">{fila ? fila.nombre : '—'}</span>
      <span className="ranking-destacado-valor">{fila ? valor(fila) : '—'}</span>
    </div>
  )
}

export default function RankingLotesGrupos({ resumen }) {
  const [vista, setVista] = useState('lotes')
  const filas = (vista === 'lotes' ? resumen.lotes : resumen.grupos).map((item) => aFila(vista, item))
  const maximo = mayorGmdPromedio(filas)
  const mayorPeso = filaDestacada(filas, 'pesoPromedio')
  const mayorGmd = filaDestacada(filas, 'gmdPromedio')
  const etiquetaNombre = vista === 'lotes' ? 'Lote' : 'Grupo'

  return (
    <div className="ranking">
      <div className="ranking-selector">
        {VISTAS.map((opcion) => (
          <button
            key={opcion.clave}
            type="button"
            className={`ranking-opcion${opcion.clave === vista ? ' ranking-opcion--elegida' : ''}`}
            aria-pressed={opcion.clave === vista}
            onClick={() => setVista(opcion.clave)}
          >
            {opcion.etiqueta}
          </button>
        ))}
      </div>

      {filas.length === 0 ? (
        <p className="ranking-vacio">No hay animales activos para comparar.</p>
      ) : (
        <>
          <div className="ranking-destacados">
            <Destacado titulo="Mayor peso promedio" fila={mayorPeso} valor={(fila) => textoPeso(fila.pesoPromedio)} />
            <Destacado titulo="Mayor GMD" fila={mayorGmd} valor={(fila) => formatearGmd(fila.gmdPromedio)} />
          </div>

          <div className="ranking-tabla-solo-escritorio">
            <table className="ranking-tabla">
              <caption className="visualmente-oculto">
                Ranking de {vista === 'lotes' ? 'lotes' : 'grupos'} por GMD promedio
              </caption>
              <thead>
                <tr>
                  <th scope="col">{etiquetaNombre}</th>
                  {vista === 'grupos' && <th scope="col">Lotes</th>}
                  <th scope="col">Animales activos</th>
                  <th scope="col">Peso promedio</th>
                  <th scope="col">GMD promedio</th>
                </tr>
              </thead>
              <tbody>
                {filas.map((fila) => (
                  <tr key={fila.clave}>
                    <th scope="row" className="ranking-nombre">
                      {fila.nombre}
                      {fila.subtitulo && <span className="ranking-subtitulo">{fila.subtitulo}</span>}
                    </th>
                    {vista === 'grupos' && <td>{fila.lotes}</td>}
                    <td>{fila.animales}</td>
                    <td>{textoPeso(fila.pesoPromedio)}</td>
                    <td>
                      <BarraGmd gmd={fila.gmdPromedio} maximo={maximo} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="ranking-tarjetas-solo-movil">
            {filas.map((fila) => (
              <article key={fila.clave} className="ranking-tarjeta tarjeta">
                <p className="ranking-tarjeta-nombre">
                  {fila.nombre}
                  {fila.subtitulo && <span className="ranking-subtitulo">{fila.subtitulo}</span>}
                </p>
                <BarraGmd gmd={fila.gmdPromedio} maximo={maximo} />
                <dl className="ranking-tarjeta-datos">
                  {vista === 'grupos' && (
                    <div>
                      <dt>Lotes</dt>
                      <dd>{fila.lotes}</dd>
                    </div>
                  )}
                  <div>
                    <dt>Animales activos</dt>
                    <dd>{fila.animales}</dd>
                  </div>
                  <div>
                    <dt>Peso promedio</dt>
                    <dd>{textoPeso(fila.pesoPromedio)}</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
