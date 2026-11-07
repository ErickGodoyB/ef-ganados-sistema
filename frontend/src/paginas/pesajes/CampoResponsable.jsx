/**
 * Selector de "Responsable" del pesaje (ver usePersonasResponsable):
 * preseleccionado con la persona del usuario actual (personaActualId),
 * pero elegible entre todas las de GET /api/personas. Si esa lista falló
 * al cargar, no se puede elegir otra (el error ya explica por qué): el
 * select queda fijo en la persona actual, con esa única opción.
 */

export default function CampoResponsable({
  id,
  personas,
  cargando,
  error,
  personaActualId,
  personaActualNombre,
  valor,
  onCambiar,
  disabled,
}) {
  if (error) {
    return (
      <div className="campo">
        <label htmlFor={id}>Responsable</label>
        <select id={id} value={personaActualId ?? ''} disabled>
          <option value={personaActualId ?? ''}>{personaActualNombre || 'Persona actual'}</option>
        </select>
        <p className="campo-error" role="alert">
          {error}
        </p>
      </div>
    )
  }

  return (
    <div className="campo">
      <label htmlFor={id}>Responsable</label>
      <select
        id={id}
        value={valor ?? ''}
        onChange={(evento) => onCambiar(Number(evento.target.value))}
        disabled={disabled || cargando}
      >
        {cargando && <option value="">Cargando responsables…</option>}
        {!cargando &&
          personas.map((persona) => (
            <option key={persona.perId} value={persona.perId}>
              {persona.perNombre} {persona.perApellido}
            </option>
          ))}
      </select>
    </div>
  )
}
