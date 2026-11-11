/**
 * Funciones puras para buscar, filtrar y ordenar el listado de personas, y
 * para armar el motivo de bloqueo de su eliminación. Separadas de
 * Personas.jsx por el mismo criterio que paginas/animales/listadoAnimales.js.
 */

import { etiquetaTipo } from './tiposPersona'

/** Nombre completo para buscar y mostrar: "Nombre Apellido", o solo el nombre si no tiene apellido. */
export function nombreCompleto(persona) {
  return persona.perApellido ? `${persona.perNombre} ${persona.perApellido}` : persona.perNombre
}

function valorDeOrden(persona, campo) {
  switch (campo) {
    case 'nombreCompleto':
      return nombreCompleto(persona).toLowerCase()
    case 'perTipo':
      return etiquetaTipo(persona.perTipo).toLowerCase()
    case 'cantidadAnimales':
      return persona.cantidadAnimales
    case 'cantidadPesajes':
      return persona.cantidadPesajes
    default:
      return null
  }
}

function compararPersonas(a, b, campo, direccion) {
  const signo = direccion === 'desc' ? -1 : 1
  const va = valorDeOrden(a, campo)
  const vb = valorDeOrden(b, campo)

  if (typeof va === 'number' && typeof vb === 'number') {
    return (va - vb) * signo
  }
  return String(va).localeCompare(String(vb), 'es', { sensitivity: 'base' }) * signo
}

/**
 * Aplica, en orden, la búsqueda (por nombre, apellido, CI o RUC, sin
 * distinguir mayúsculas), el filtro por tipo, y el orden elegido. Devuelve
 * un array nuevo; no modifica "personas".
 */
export function filtrarYOrdenarPersonas(personas, { busqueda, tipo, orden }) {
  const termino = busqueda.trim().toLowerCase()

  const filtradas = personas.filter((persona) => {
    if (tipo !== 'todos' && persona.perTipo !== tipo) {
      return false
    }
    if (!termino) {
      return true
    }
    const campos = [nombreCompleto(persona), persona.perCi, persona.perRuc]
    return campos.some((campo) => campo?.toLowerCase().includes(termino))
  })

  return filtradas.sort((a, b) => compararPersonas(a, b, orden.campo, orden.direccion))
}

/**
 * Motivos por los que no se puede eliminar a la persona (ver
 * PersonaService.eliminar en el backend, mismo criterio de mensaje): uno
 * por cada condición que corresponda, en este orden.
 */
export function motivosBloqueo(persona) {
  const motivos = []
  if (persona.cantidadAnimales > 0) {
    motivos.push(`es dueña de ${persona.cantidadAnimales} animales`)
  }
  if (persona.cantidadComoComprador > 0) {
    motivos.push(`figura como comprador de ${persona.cantidadComoComprador} animales`)
  }
  if (persona.cantidadPesajes > 0) {
    motivos.push(`figura en ${persona.cantidadPesajes} pesajes`)
  }
  if (persona.tieneUsuario) {
    motivos.push('tiene un usuario de acceso')
  }
  return motivos
}

/** Une una lista de motivos en español: "a", "a y b", "a, b y c". */
export function unirConY(motivos) {
  if (motivos.length <= 1) {
    return motivos[0] ?? ''
  }
  return `${motivos.slice(0, -1).join(', ')} y ${motivos[motivos.length - 1]}`
}
