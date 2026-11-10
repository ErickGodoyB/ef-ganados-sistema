/**
 * Tabla del listado de personas (>= 768px, ver Personas.css). Las cuatro
 * columnas ordenables (ver columnas.js) tienen un botón en su encabezado,
 * igual criterio que TablaAnimales; CI, Teléfono y Acceso no se ordenan
 * (no lo pide la consigna) y quedan como texto simple. El botón Eliminar
 * se deshabilita con una explicación visible cuando corresponde (ver
 * motivosBloqueo en listadoPersonas.js), enlazada por aria-describedby.
 */

import { Pencil, Trash2 } from 'lucide-react'
import { motivosBloqueo, nombreCompleto, unirConY } from './listadoPersonas'
import { etiquetaTipo } from './tiposPersona'
import './TablaPersonas.css'

/** Pone en mayúscula la primera letra (para mostrar el motivo de bloqueo como una frase). */
function capitalizar(texto) {
  return texto ? texto.charAt(0).toUpperCase() + texto.slice(1) : texto
}

export default function TablaPersonas({ personas, orden, onOrdenar, onEditar, onEliminar }) {
  function ariaSortDe(campoOrden) {
    if (orden.campo !== campoOrden) {
      return 'none'
    }
    return orden.direccion === 'asc' ? 'ascending' : 'descending'
  }

  function encabezadoOrdenable(campoOrden, etiqueta) {
    return (
      <th scope="col" aria-sort={ariaSortDe(campoOrden)}>
        <button type="button" className="tabla-personas-orden" onClick={() => onOrdenar(campoOrden)}>
          {etiqueta}
        </button>
      </th>
    )
  }

  return (
    <div className="tabla-personas-contenedor">
      <table className="tabla-personas">
        <caption className="visualmente-oculto">Listado de personas</caption>
        <thead>
          <tr>
            {encabezadoOrdenable('nombreCompleto', 'Nombre')}
            {encabezadoOrdenable('perTipo', 'Tipo')}
            <th scope="col">CI</th>
            <th scope="col">Teléfono</th>
            {encabezadoOrdenable('cantidadAnimales', 'Animales')}
            {encabezadoOrdenable('cantidadPesajes', 'Pesajes')}
            <th scope="col">Acceso</th>
            <th scope="col">
              <span className="visualmente-oculto">Acciones</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {personas.map((persona) => {
            const motivos = motivosBloqueo(persona)
            const bloqueada = motivos.length > 0
            const idAviso = `personas-aviso-${persona.perId}`
            return (
              <tr key={persona.perId}>
                <td className="tabla-personas-nombre">{nombreCompleto(persona)}</td>
                <td>{etiquetaTipo(persona.perTipo)}</td>
                <td>{persona.perCi || '—'}</td>
                <td>{persona.perTelefono || '—'}</td>
                <td>{persona.cantidadAnimales}</td>
                <td>{persona.cantidadPesajes}</td>
                <td>{persona.tieneUsuario && <span className="badge">Con acceso</span>}</td>
                <td>
                  <div className="personas-acciones">
                    <button type="button" className="boton-secundario" onClick={(evento) => onEditar(persona, evento)}>
                      <Pencil aria-hidden="true" size={16} />
                      Editar
                    </button>
                    <div className="personas-accion-eliminar">
                      <button
                        type="button"
                        className="boton-peligro"
                        onClick={(evento) => onEliminar(persona, evento)}
                        disabled={bloqueada}
                        aria-describedby={bloqueada ? idAviso : undefined}
                      >
                        <Trash2 aria-hidden="true" size={16} />
                        Eliminar
                      </button>
                      {bloqueada && (
                        <p id={idAviso} className="personas-aviso-cantidad">
                          {capitalizar(unirConY(motivos))}
                        </p>
                      )}
                    </div>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
