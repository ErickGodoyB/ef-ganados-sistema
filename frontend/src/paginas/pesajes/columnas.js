/**
 * Metadatos de las columnas del listado de sesiones de pesaje (RF011):
 * clave (para mostrarla u ocultarla según las preferencias, y para armar
 * sus celdas), etiqueta visible y el campo por el que se ordena cada una.
 * Mismo criterio que columnas.js de Animales: un solo lugar para esto evita
 * que la tabla, el selector "Ordenar por" de celular y el panel de
 * columnas opcionales queden desincronizados entre sí.
 */

export const COLUMNAS = [
  { clave: 'fecha', etiqueta: 'Fecha', campoOrden: 'fecha', obligatoria: true },
  { clave: 'lote', etiqueta: 'Lote', campoOrden: 'lote', obligatoria: true },
  { clave: 'cantidad', etiqueta: 'Animales', campoOrden: 'cantidad' },
  { clave: 'promedio', etiqueta: 'Promedio', campoOrden: 'promedio' },
  { clave: 'minimo', etiqueta: 'Mínimo', campoOrden: 'minimo' },
  { clave: 'maximo', etiqueta: 'Máximo', campoOrden: 'maximo' },
  { clave: 'total', etiqueta: 'Total', campoOrden: 'total' },
]

/** Columnas que se pueden mostrar u ocultar desde el panel de opciones (todas salvo Fecha y Lote, obligatorias). */
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
