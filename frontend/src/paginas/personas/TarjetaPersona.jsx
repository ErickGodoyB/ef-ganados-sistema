/**
 * Tarjeta de una persona para pantallas chicas (< 768px, ver Personas.css).
 * Alternativa a la fila de tabla (TablaPersonas.jsx), con la misma
 * información y las mismas acciones.
 */

import { Pencil, Trash2 } from 'lucide-react'
import { motivosBloqueo, nombreCompleto, unirConY } from './listadoPersonas'
import { etiquetaTipo } from './tiposPersona'
import './TarjetaPersona.css'

function capitalizar(texto) {
  return texto ? texto.charAt(0).toUpperCase() + texto.slice(1) : texto
}

export default function TarjetaPersona({ persona, onEditar, onEliminar }) {
  const motivos = motivosBloqueo(persona)
  const bloqueada = motivos.length > 0
  const idAviso = `personas-tarjeta-aviso-${persona.perId}`

  return (
    <article className="tarjeta-persona tarjeta">
      <div className="tarjeta-persona-encabezado">
        <p className="tarjeta-persona-nombre">{nombreCompleto(persona)}</p>
        {persona.tieneUsuario && <span className="badge">Con acceso</span>}
      </div>

      <dl className="tarjeta-persona-datos">
        <div className="tarjeta-persona-dato">
          <dt>Tipo</dt>
          <dd>{etiquetaTipo(persona.perTipo)}</dd>
        </div>
        <div className="tarjeta-persona-dato">
          <dt>CI</dt>
          <dd>{persona.perCi || 'Sin datos'}</dd>
        </div>
        <div className="tarjeta-persona-dato">
          <dt>Teléfono</dt>
          <dd>{persona.perTelefono || 'Sin datos'}</dd>
        </div>
        <div className="tarjeta-persona-dato">
          <dt>Animales</dt>
          <dd>{persona.cantidadAnimales}</dd>
        </div>
        <div className="tarjeta-persona-dato">
          <dt>Compras</dt>
          <dd>{persona.cantidadComoComprador}</dd>
        </div>
        <div className="tarjeta-persona-dato">
          <dt>Pesajes</dt>
          <dd>{persona.cantidadPesajes}</dd>
        </div>
      </dl>

      <div className="tarjeta-persona-acciones">
        <button type="button" className="boton-secundario" onClick={(evento) => onEditar(persona, evento)}>
          <Pencil aria-hidden="true" size={16} />
          Editar
        </button>
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
      </div>
      {bloqueada && (
        <p id={idAviso} className="tarjeta-persona-aviso">
          {capitalizar(unirConY(motivos))}
        </p>
      )}
    </article>
  )
}
