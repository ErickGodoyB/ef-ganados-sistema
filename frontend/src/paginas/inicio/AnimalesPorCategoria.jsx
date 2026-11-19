/**
 * Gráfico de anillo "Animales por…" de Inicio, con un selector Lotes /
 * Grupos / Razas. Lotes y grupos salen del resumen que ya cargó la pantalla
 * (animalesActivos de cada uno); las razas se agregan en el cliente desde
 * GET /api/animales/resumen, contando solo los animales activos (sin
 * salida), y esa consulta se hace recién al elegir "Razas". Máximo 6
 * porciones: las más chicas se agrupan en "Otros".
 */

import { RefreshCw, TriangleAlert } from 'lucide-react'
import { useState } from 'react'
import GraficoAnillo from '../../componentes/GraficoAnillo'
import { agregarPorRaza, agruparEnOtros } from '../../utilidades/graficos'
import TarjetaGrafico from './TarjetaGrafico'
import { useAnimalesParaRazas } from './useDatosInicio'

const VISTAS = [
  { clave: 'lotes', etiqueta: 'Lotes', singular: 'lote' },
  { clave: 'grupos', etiqueta: 'Grupos', singular: 'grupo' },
  { clave: 'razas', etiqueta: 'Razas', singular: 'raza' },
]

/** Etiqueta de un lote: con el grupo entre paréntesis si lo tiene (puede haber lotes con el mismo nombre en grupos distintos). */
function etiquetaDeLote(lote) {
  return lote.grupoDescripcion ? `${lote.loteDescripcion} (${lote.grupoDescripcion})` : lote.loteDescripcion
}

export default function AnimalesPorCategoria({ resumen }) {
  const [vista, setVista] = useState('lotes')
  const razas = useAnimalesParaRazas(vista === 'razas')
  const actual = VISTAS.find((opcion) => opcion.clave === vista)

  let items
  if (vista === 'lotes') {
    items = resumen.lotes.map((lote) => ({ etiqueta: etiquetaDeLote(lote), valor: lote.animalesActivos }))
  } else if (vista === 'grupos') {
    items = resumen.grupos.map((grupo) => ({ etiqueta: grupo.grupoDescripcion, valor: grupo.animalesActivos }))
  } else {
    items = agregarPorRaza(razas.animales)
  }

  const selector = (
    <div className="grafico-selector">
      {VISTAS.map((opcion) => (
        <button
          key={opcion.clave}
          type="button"
          className={`grafico-selector-opcion${opcion.clave === vista ? ' grafico-selector-opcion--elegida' : ''}`}
          aria-pressed={opcion.clave === vista}
          onClick={() => setVista(opcion.clave)}
        >
          {opcion.etiqueta}
        </button>
      ))}
    </div>
  )

  let contenido
  if (vista === 'razas' && razas.cargando) {
    contenido = <p role="status">Cargando razas…</p>
  } else if (vista === 'razas' && razas.error) {
    contenido = (
      <div className="estado-mensaje">
        <TriangleAlert aria-hidden="true" size={32} className="estado-mensaje-icono" />
        <p>{razas.error}</p>
        <button type="button" className="boton boton-secundario" onClick={razas.recargar}>
          <RefreshCw aria-hidden="true" size={16} />
          Reintentar
        </button>
      </div>
    )
  } else {
    contenido = (
      <GraficoAnillo
        titulo={`Animales por ${actual.singular}`}
        items={agruparEnOtros(items)}
        mensajeVacio="No hay animales activos para mostrar."
      />
    )
  }

  return (
    <TarjetaGrafico titulo={`Animales por ${actual.singular}`} controles={selector}>
      {contenido}
    </TarjetaGrafico>
  )
}
