/**
 * Metadatos de las columnas del listado de animales: clave (para mostrarla
 * u ocultarla según las preferencias, y para armar sus celdas), etiqueta
 * visible y el campo por el que se ordena cada una. Un solo lugar para
 * esto evita que la tabla (clic en el encabezado), el selector "Ordenar
 * por" de celular y el panel de columnas opcionales queden
 * desincronizados entre sí.
 */

export const COLUMNAS = [
  { clave: 'aniCaravana', etiqueta: 'Caravana', campoOrden: 'aniCaravana', obligatoria: true },
  { clave: 'raza', etiqueta: 'Raza', campoOrden: 'razaDescripcion' },
  { clave: 'lote', etiqueta: 'Lote', campoOrden: 'lote' },
  { clave: 'pesoActual', etiqueta: 'Peso actual', campoOrden: 'pesoActual' },
  { clave: 'gmd', etiqueta: 'GMD', campoOrden: 'gmd' },
  { clave: 'estado', etiqueta: 'Estado', campoOrden: 'aptoVenta' },
  { clave: 'fechaIngreso', etiqueta: 'Fecha de ingreso', campoOrden: 'aniFechaIngreso' },
]

/** Columnas que se pueden mostrar u ocultar desde el panel de opciones (todas salvo Caravana, que es obligatoria). */
export const COLUMNAS_OPCIONALES = COLUMNAS.filter((columna) => !columna.obligatoria)

/**
 * Opciones del selector "Ordenar por" de celular: cada columna, en sus dos
 * direcciones. En pantallas chicas reemplaza al clic en el encabezado de
 * la tabla, que ahí no se ve.
 */
export const OPCIONES_ORDEN_MOVIL = COLUMNAS.flatMap((columna) => [
  { valor: `${columna.campoOrden}:asc`, etiqueta: `${columna.etiqueta} (ascendente)` },
  { valor: `${columna.campoOrden}:desc`, etiqueta: `${columna.etiqueta} (descendente)` },
])
