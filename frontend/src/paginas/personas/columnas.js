/**
 * Metadatos de las columnas ordenables del listado de personas: clave,
 * etiqueta visible y el campo por el que se ordena cada una. Mismo
 * criterio que paginas/animales/columnas.js (evita que la tabla, el
 * selector "Ordenar por" de celular y el resto queden desincronizados),
 * pero sin columnas opcionales: en Personas todas las columnas se
 * muestran siempre, así que no hace falta un PanelOpciones.
 */

export const COLUMNAS_ORDENABLES = [
  { clave: 'nombreCompleto', etiqueta: 'Nombre', campoOrden: 'nombreCompleto' },
  { clave: 'tipo', etiqueta: 'Tipo', campoOrden: 'perTipo' },
  { clave: 'cantidadAnimales', etiqueta: 'Animales', campoOrden: 'cantidadAnimales' },
  { clave: 'cantidadPesajes', etiqueta: 'Pesajes', campoOrden: 'cantidadPesajes' },
]

/** Opciones del selector "Ordenar por" de celular: cada columna ordenable, en sus dos direcciones. */
export const OPCIONES_ORDEN_MOVIL = COLUMNAS_ORDENABLES.flatMap((columna) => [
  { valor: `${columna.campoOrden}:asc`, etiqueta: `${columna.etiqueta} (ascendente)` },
  { valor: `${columna.campoOrden}:desc`, etiqueta: `${columna.etiqueta} (descendente)` },
])
