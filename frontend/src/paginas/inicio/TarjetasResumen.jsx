/**
 * Las cuatro tarjetas de resumen de Inicio (2 columnas en celular, 4 en PC):
 * animales activos, pesados este mes, aptos para venta y sin pesaje
 * reciente. Las dos primeras son enlaces (a Animales y a Pesajes). Una
 * tarjeta con valor 0 se ve igual pero atenuada: el número sigue legible, y
 * el 0 se lee igual que cualquier otro valor (la atenuación nunca es la
 * única señal).
 */

import { Link } from 'react-router-dom'
import './TarjetasResumen.css'

/** Contenido común de una tarjeta: etiqueta, valor grande y una línea de detalle opcional. */
function Contenido({ etiqueta, valor, detalle }) {
  return (
    <>
      <span className="tarjeta-resumen-etiqueta">{etiqueta}</span>
      <span className="tarjeta-resumen-valor">{valor}</span>
      {detalle && <span className="tarjeta-resumen-detalle">{detalle}</span>}
    </>
  )
}

function Tarjeta({ etiqueta, valor, detalle, a }) {
  const clase = `tarjeta-resumen tarjeta${valor === 0 ? ' tarjeta-resumen--atenuada' : ''}`
  return a ? (
    <Link to={a} className={`${clase} tarjeta-resumen--enlace`}>
      <Contenido etiqueta={etiqueta} valor={valor} detalle={detalle} />
    </Link>
  ) : (
    <div className={clase}>
      <Contenido etiqueta={etiqueta} valor={valor} detalle={detalle} />
    </div>
  )
}

export default function TarjetasResumen({ resumen }) {
  const sesiones = resumen.sesionesEsteMes === 1 ? 'en 1 sesión' : `en ${resumen.sesionesEsteMes} sesiones`
  return (
    <div className="tarjetas-resumen">
      <Tarjeta etiqueta="Animales activos" valor={resumen.animalesActivos} a="/animales" />
      <Tarjeta etiqueta="Pesados este mes" valor={resumen.pesadosEsteMes} detalle={sesiones} a="/pesajes" />
      <Tarjeta etiqueta="Aptos para venta" valor={resumen.aptosVenta} />
      <Tarjeta
        etiqueta="Sin pesaje reciente"
        valor={resumen.sinPesajeReciente}
        detalle={`más de ${resumen.parametros.diasSinPesaje} días`}
      />
    </div>
  )
}
