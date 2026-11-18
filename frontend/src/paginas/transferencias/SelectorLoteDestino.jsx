/**
 * Selector del lote de destino: las opciones van agrupadas por grupo
 * (<optgroup>), ordenadas alfabéticamente, y junto al select está el botón
 * "+" del alta rápida de lote (AltaRapidaLote), que al crear un lote lo
 * deja elegido. Un lote sin grupo (no debería pasar, pero el modelo lo
 * permite) va a un grupo "Sin grupo" al final, en vez de perderse.
 */

import { AlertCircle } from 'lucide-react'
import { useMemo } from 'react'
import AltaRapidaLote from '../animales/AltaRapidaLote'
import '../animales/FormularioAnimal.css'
import { agruparLotesPorGrupo } from './animalesCandidatos'

export default function SelectorLoteDestino({ id, refSelect, lotes, valor, onCambiar, onLoteCreado, error, disabled }) {
  const grupos = useMemo(() => agruparLotesPorGrupo(lotes), [lotes])
  const idError = `${id}-error`

  return (
    <div className="campo">
      <label htmlFor={id}>Lote de destino</label>
      <div className="campo-con-alta-rapida">
        <select
          id={id}
          ref={refSelect}
          value={valor}
          onChange={(evento) => onCambiar(evento.target.value)}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? idError : undefined}
          disabled={disabled}
        >
          <option value="">Elegí un lote</option>
          {grupos.map((grupo) => (
            <optgroup key={grupo.nombre} label={grupo.nombre}>
              {grupo.lotes.map((lote) => (
                <option key={lote.sbId} value={String(lote.sbId)}>
                  {lote.sbDescripcion}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <AltaRapidaLote subGrupos={lotes} onCreado={onLoteCreado} />
      </div>
      {error && (
        <p id={idError} className="campo-error" role="alert">
          <AlertCircle aria-hidden="true" size={14} /> {error}
        </p>
      )}
    </div>
  )
}
