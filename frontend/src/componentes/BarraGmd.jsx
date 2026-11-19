/**
 * GMD promedio con una barra proporcional al mayor valor de la lista que se
 * está comparando (ranking de proveedores en Reportes, ranking de lotes y
 * grupos en Inicio). El número escrito es lo que informa (y lo que lee un
 * lector de pantalla); la barra es solo una ayuda visual para comparar de
 * un vistazo, así que va oculta a las tecnologías de apoyo y nunca es la
 * única señal. Sin dato (null) muestra "—" con la barra vacía; una GMD
 * negativa se escribe con su signo, en el color de pérdida, y deja la barra
 * en 0.
 */

import { formatearGmd } from '../utilidades/formato'
import { porcentajeDeBarra } from '../paginas/reportes/rankingProveedores'
import './BarraGmd.css'

/**
 * @param {object} props
 * @param {number|null} props.gmd GMD promedio en kg/día, o null si no hay dato.
 * @param {number} props.maximo Mayor GMD de la lista (base de la proporción); 0 si ninguna tiene dato.
 */
export default function BarraGmd({ gmd, maximo }) {
  return (
    <div className="barra-gmd">
      <span className={gmd != null && gmd < 0 ? 'valor-negativo' : 'barra-gmd-valor'}>{formatearGmd(gmd)}</span>
      <span className="barra-gmd-pista" aria-hidden="true">
        <span className="barra-gmd-relleno" style={{ width: `${porcentajeDeBarra(gmd, maximo)}%` }} />
      </span>
    </div>
  )
}
