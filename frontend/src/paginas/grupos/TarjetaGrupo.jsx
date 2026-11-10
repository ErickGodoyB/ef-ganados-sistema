/**
 * Tarjeta desplegable de un grupo (ver GruposYLotes.jsx): encabezado con
 * su nombre, cantidad de lotes y de animales (total y activos), y las
 * acciones "Agregar lote", Editar y Eliminar; al desplegarse, la lista de
 * sus lotes con sus propios datos y acciones. El botón Eliminar (de grupo
 * o de lote) queda deshabilitado con una explicación visible cuando
 * corresponde ("Tiene N lotes"/"Tiene N animales"), enlazada por
 * aria-describedby; igual así, GruposYLotes.jsx maneja el 409 del
 * servidor por si la cantidad cambió entre que se cargó el listado y el
 * clic (ver ModalEliminarGrupo.jsx/ModalEliminarLote.jsx).
 */

import { ChevronDown, Pencil, Plus, Trash2 } from 'lucide-react'
import { useId } from 'react'
import '../GruposYLotes.css'

export default function TarjetaGrupo({
  grupo,
  abierto,
  onAlternarAbierto,
  onEditarGrupo,
  onEliminarGrupo,
  onAgregarLote,
  onEditarLote,
  onEliminarLote,
}) {
  const idLista = useId()
  const idAvisoGrupo = useId()
  const grupoTieneLotes = grupo.cantidadLotes > 0

  return (
    <article className="tarjeta-grupo tarjeta">
      <div className="tarjeta-grupo-encabezado">
        <button
          type="button"
          className={`tarjeta-grupo-disclosure${abierto ? ' tarjeta-grupo-disclosure--abierto' : ''}`}
          aria-expanded={abierto}
          aria-controls={idLista}
          onClick={onAlternarAbierto}
        >
          <ChevronDown aria-hidden="true" size={18} className="tarjeta-grupo-icono-chevron" />
          <span className="tarjeta-grupo-nombre">{grupo.grpDescripcion}</span>
        </button>

        <div className="tarjeta-grupo-resumen-datos">
          <span>{grupo.cantidadLotes === 1 ? '1 lote' : `${grupo.cantidadLotes} lotes`}</span>
          <span>
            {grupo.cantidadAnimales} animales ({grupo.cantidadActivos} activos)
          </span>
        </div>

        <div className="tarjeta-grupo-acciones">
          <button type="button" className="boton-secundario" onClick={onAgregarLote}>
            <Plus aria-hidden="true" size={16} />
            Agregar lote
          </button>
          <button type="button" className="boton-secundario" onClick={onEditarGrupo}>
            <Pencil aria-hidden="true" size={16} />
            Editar
          </button>
          <div className="accion-eliminar-con-aviso">
            <button
              type="button"
              className="boton-peligro"
              onClick={onEliminarGrupo}
              disabled={grupoTieneLotes}
              aria-describedby={grupoTieneLotes ? idAvisoGrupo : undefined}
            >
              <Trash2 aria-hidden="true" size={16} />
              Eliminar
            </button>
            {grupoTieneLotes && (
              <p id={idAvisoGrupo} className="aviso-cantidad">
                Tiene {grupo.cantidadLotes} {grupo.cantidadLotes === 1 ? 'lote' : 'lotes'}
              </p>
            )}
          </div>
        </div>
      </div>

      {abierto && (
        <ul id={idLista} className="tarjeta-grupo-lotes">
          {grupo.lotes.length === 0 && (
            <li className="tarjeta-grupo-lotes-vacio">Este grupo todavía no tiene lotes</li>
          )}
          {grupo.lotes.map((lote) => {
            const loteTieneAnimales = lote.cantidadAnimales > 0
            const idAvisoLote = `${idLista}-aviso-${lote.sbId}`
            return (
              <li key={lote.sbId} className="fila-lote">
                <span className="fila-lote-nombre">{lote.sbDescripcion}</span>
                <span className="fila-lote-datos">
                  {lote.cantidadAnimales} animales ({lote.cantidadActivos} activos)
                </span>
                <div className="fila-lote-acciones">
                  <button type="button" className="boton-secundario" onClick={(evento) => onEditarLote(lote, evento)}>
                    <Pencil aria-hidden="true" size={16} />
                    Editar
                  </button>
                  <div className="accion-eliminar-con-aviso">
                    <button
                      type="button"
                      className="boton-peligro"
                      onClick={(evento) => onEliminarLote(lote, evento)}
                      disabled={loteTieneAnimales}
                      aria-describedby={loteTieneAnimales ? idAvisoLote : undefined}
                    >
                      <Trash2 aria-hidden="true" size={16} />
                      Eliminar
                    </button>
                    {loteTieneAnimales && (
                      <p id={idAvisoLote} className="aviso-cantidad">
                        Tiene {lote.cantidadAnimales} animales
                      </p>
                    )}
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </article>
  )
}
