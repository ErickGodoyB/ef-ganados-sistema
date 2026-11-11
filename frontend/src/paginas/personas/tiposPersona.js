/**
 * Tipos de persona permitidos (mismos valores que el backend, ver
 * PersonaService.TIPOS_PERMITIDOS en el backend): única fuente de las
 * opciones del select de "Nueva/Editar persona" (ModalFormularioPersona)
 * y del filtro por tipo del listado (Personas.jsx). Agregar un tipo nuevo
 * es agregar un elemento acá.
 */

export const TIPOS_PERSONA = [
  { valor: 'PROPIETARIO', etiqueta: 'Propietario' },
  { valor: 'EMPLEADO', etiqueta: 'Empleado' },
  { valor: 'CLIENTE', etiqueta: 'Cliente' },
]

/** Etiqueta legible de un tipo (ej. para la columna "Tipo" de la tabla); el valor crudo si no se reconoce. */
export function etiquetaTipo(valor) {
  return TIPOS_PERSONA.find((tipo) => tipo.valor === valor)?.etiqueta ?? valor
}
