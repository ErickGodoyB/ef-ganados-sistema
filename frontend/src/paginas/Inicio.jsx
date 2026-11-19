/**
 * Pantalla de Inicio (ruta "/"): saludo con el nombre de la persona y la
 * fecha de hoy, tarjetas de resumen del hato, alertas, ranking de lotes y
 * grupos, y el calendario de pesajes. El resumen se pide una vez y alimenta
 * las tarjetas, las alertas (sus totales) y el ranking; el calendario y la
 * lista de cada alerta se piden por su cuenta, así que un bloque que falla
 * muestra su propio error con "Reintentar" sin romper a los demás. Si no hay
 * nada cargado todavía (ni animales activos ni pesajes del mes), en vez de
 * los bloques se muestra un mensaje de bienvenida.
 */

import { RefreshCw, Sprout, TriangleAlert } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import EncabezadoPagina from '../componentes/EncabezadoPagina'
import { fechaLarga } from '../utilidades/calendario'
import { fechaHoyIso } from '../utilidades/fechas'
import AlertasInicio from './inicio/AlertasInicio'
import CalendarioPesajes from './inicio/CalendarioPesajes'
import RankingLotesGrupos from './inicio/RankingLotesGrupos'
import TarjetasResumen from './inicio/TarjetasResumen'
import { useInicioResumen } from './inicio/useDatosInicio'
import './Inicio.css'

/** Error de un bloque que depende del resumen, con su "Reintentar". */
function ErrorDeBloque({ mensaje, onReintentar }) {
  return (
    <div className="estado-mensaje tarjeta">
      <TriangleAlert aria-hidden="true" size={40} className="estado-mensaje-icono" />
      <p>{mensaje}</p>
      <button type="button" className="boton boton-secundario" onClick={onReintentar}>
        <RefreshCw aria-hidden="true" size={16} />
        Reintentar
      </button>
    </div>
  )
}

/** Sección con encabezado (h2) propio, para que los títulos queden ordenados bajo el h1 del saludo. */
function Seccion({ id, titulo, children, titulosOculto = false }) {
  return (
    <section className="inicio-seccion" aria-labelledby={id}>
      <h2 id={id} className={titulosOculto ? 'visualmente-oculto' : 'inicio-seccion-titulo'}>
        {titulo}
      </h2>
      {children}
    </section>
  )
}

export default function Inicio() {
  const { personaNombre } = useAuth()
  const { resumen, cargando, error, recargar } = useInicioResumen()
  const saludo = personaNombre ? `Hola, ${personaNombre}` : 'Hola'
  const sinNada =
    resumen && resumen.animalesActivos === 0 && resumen.pesadosEsteMes === 0 && resumen.sesionesEsteMes === 0

  function bloqueDelResumen(contenido) {
    if (cargando) {
      return <p role="status">Cargando resumen…</p>
    }
    if (error) {
      return <ErrorDeBloque mensaje={error} onReintentar={recargar} />
    }
    return contenido
  }

  return (
    <div className="inicio-pagina">
      <EncabezadoPagina titulo={saludo} subtitulo={fechaLarga(fechaHoyIso())} />

      {sinNada ? (
        <div className="estado-mensaje tarjeta inicio-bienvenida">
          <Sprout aria-hidden="true" size={40} className="estado-mensaje-icono" />
          <h2 className="inicio-bienvenida-titulo">¡Bienvenido!</h2>
          <p>Todavía no hay animales registrados. Registrá el primero para empezar a ver el resumen de tu hato.</p>
          <Link to="/animales" className="boton boton-primario">
            Registrar el primer animal
          </Link>
        </div>
      ) : (
        <>
          <Seccion id="inicio-resumen" titulo="Resumen del hato" titulosOculto>
            {bloqueDelResumen(resumen && <TarjetasResumen resumen={resumen} />)}
          </Seccion>

          <Seccion id="inicio-alertas" titulo="Alertas">
            {bloqueDelResumen(resumen && <AlertasInicio resumen={resumen} />)}
          </Seccion>

          <Seccion id="inicio-ranking" titulo="Lotes y grupos">
            {bloqueDelResumen(resumen && <RankingLotesGrupos resumen={resumen} />)}
          </Seccion>

          <Seccion id="inicio-calendario" titulo="Calendario de pesajes">
            <CalendarioPesajes />
          </Seccion>
        </>
      )}
    </div>
  )
}
