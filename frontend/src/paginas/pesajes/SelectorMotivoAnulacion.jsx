/**
 * Campo de motivo para anular un pesaje o una sesión completa (RF011): una
 * fila de chips con motivos frecuentes (clic en uno de los tres primeros
 * escribe ese texto directo; "Otro" solo vacía el campo y deja el cursor
 * libre para escribir) más el textarea en sí, siempre editable a mano. El
 * mismo componente lo usan TablaItemsSesion/TarjetaItemSesion (anular un
 * pesaje puntual) y ModalDetalleSesion (anular la sesión completa), para no
 * repetir los chips ni la validación de largo en tres lugares.
 */

import './SelectorMotivoAnulacion.css'

const CHIPS = ['Error de carga', 'Animal equivocado', 'Pesaje duplicado', 'Otro']

export default function SelectorMotivoAnulacion({ id, motivo, onCambiarMotivo, disabled, error }) {
  return (
    <div className="selector-motivo-anulacion">
      <div className="selector-motivo-anulacion-chips">
        {CHIPS.map((chip) => (
          <button
            key={chip}
            type="button"
            className="selector-motivo-anulacion-chip"
            onClick={() => onCambiarMotivo(chip === 'Otro' ? '' : chip)}
            disabled={disabled}
          >
            {chip}
          </button>
        ))}
      </div>

      <label className="visualmente-oculto" htmlFor={id}>
        Motivo de la anulación
      </label>
      <textarea
        id={id}
        className="entrada"
        rows={2}
        maxLength={255}
        placeholder="Contá brevemente el motivo (entre 3 y 255 caracteres)"
        value={motivo}
        onChange={(evento) => onCambiarMotivo(evento.target.value)}
        disabled={disabled}
        aria-invalid={Boolean(error)}
      />
      {error && (
        <p className="campo-error" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
