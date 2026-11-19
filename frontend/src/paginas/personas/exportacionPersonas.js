/**
 * Lo propio de la exportación del listado de Personas: las columnas
 * disponibles, el armado de las filas y la descripción de los filtros
 * (búsqueda y tipo) para el encabezado del archivo. El filtrado reutiliza
 * filtrarYOrdenarPersonas (el mismo del listado), ordenando por nombre.
 */

import { filtrarYOrdenarPersonas } from './listadoPersonas'
import { etiquetaTipo, TIPOS_PERSONA } from './tiposPersona'

/** Aviso que el modal muestra siempre: el archivo lleva documentos, teléfonos y direcciones. */
export const AVISO_DATOS_PERSONALES = 'El archivo contiene datos personales'

/** Columnas exportables; arrancan marcadas las que el listado muestra (más el apellido, que el listado junta con el nombre). */
export const COLUMNAS_PERSONAS = [
  { clave: 'nombre', titulo: 'Nombre', tipo: 'texto', porDefecto: true },
  { clave: 'apellido', titulo: 'Apellido', tipo: 'texto', porDefecto: true },
  { clave: 'tipo', titulo: 'Tipo', tipo: 'texto', porDefecto: true },
  { clave: 'ci', titulo: 'CI', tipo: 'texto', porDefecto: true },
  { clave: 'ruc', titulo: 'RUC', tipo: 'texto', porDefecto: false },
  { clave: 'telefono', titulo: 'Teléfono', tipo: 'texto', porDefecto: true },
  { clave: 'correo', titulo: 'Correo', tipo: 'texto', porDefecto: false },
  { clave: 'direccion', titulo: 'Dirección', tipo: 'texto', porDefecto: false },
  { clave: 'animales', titulo: 'Animales', tipo: 'entero', porDefecto: true },
  { clave: 'compras', titulo: 'Compras', tipo: 'entero', porDefecto: true },
  { clave: 'comoProveedor', titulo: 'Proveedor de', tipo: 'entero', porDefecto: true },
  { clave: 'pesajes', titulo: 'Pesajes', tipo: 'entero', porDefecto: true },
]

/** Una fila de exportación a partir de una persona del resumen. */
export function filaDePersona(persona) {
  return {
    nombre: persona.perNombre,
    apellido: persona.perApellido,
    tipo: etiquetaTipo(persona.perTipo),
    ci: persona.perCi,
    ruc: persona.perRuc,
    telefono: persona.perTelefono,
    correo: persona.perCorreo,
    direccion: persona.perDireccion,
    animales: persona.cantidadAnimales,
    compras: persona.cantidadComoComprador,
    comoProveedor: persona.cantidadComoProveedor ?? 0,
    pesajes: persona.cantidadPesajes,
  }
}

/** Personas que cumplen los filtros del modal (búsqueda y tipo), ordenadas por nombre, como filas de exportación. */
export function filasDePersonasParaExportar(personas, filtros) {
  return filtrarYOrdenarPersonas(personas, {
    busqueda: filtros.busqueda,
    tipo: filtros.tipo,
    orden: { campo: 'nombreCompleto', direccion: 'asc' },
  }).map(filaDePersona)
}

/** Los filtros aplicados, para el encabezado del archivo (solo los que filtran algo). */
export function describirFiltrosPersonas(filtros) {
  const lineas = []
  if (filtros.busqueda.trim() !== '') {
    lineas.push({ etiqueta: 'Búsqueda', valor: filtros.busqueda.trim() })
  }
  if (filtros.tipo !== 'todos') {
    const tipo = TIPOS_PERSONA.find((candidato) => candidato.valor === filtros.tipo)
    lineas.push({ etiqueta: 'Tipo', valor: tipo?.etiqueta ?? filtros.tipo })
  }
  return lineas
}
