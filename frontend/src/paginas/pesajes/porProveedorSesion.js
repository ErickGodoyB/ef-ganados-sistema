/**
 * Funciones puras del bloque "Por proveedor" del detalle de una sesión de
 * pesaje: agrupa los animales de la sesión por su proveedor (los que no
 * tienen, juntos como "Sin proveedor") y calcula, por proveedor, cuántos
 * animales hay, su peso promedio, la diferencia promedio contra el pesaje
 * anterior y la GMD promedio (solo de los que tienen GMD, igual que el
 * resumen de la sesión). Se calcula en el cliente a partir de la lista local
 * de animales, así queda al día tras cada edición o anulación.
 */

import { calcularDiferenciaPeso } from '../../utilidades/peso'
import { calcularGmdPromedioSesion } from '../../utilidades/resumenSesion'

export const SIN_PROVEEDOR = 'Sin proveedor'

/** Promedio de los valores que no son null; null si no queda ninguno. */
function promedioDeValidos(valores) {
  const validos = valores.filter((valor) => valor != null)
  return validos.length === 0 ? null : validos.reduce((suma, valor) => suma + valor, 0) / validos.length
}

/**
 * Una fila por proveedor, de mayor a menor GMD promedio (los que no tienen
 * GMD al final; a igual valor, por nombre). "mejor" es true en la fila de
 * mayor GMD promedio, pero solo si ese máximo es único: con un empate no hay
 * un "mejor" claro y ninguna lleva la etiqueta.
 *
 * @param {{proveedorId?: number|null, proveedorNombre?: string|null, peso: number, pesoAnterior?: number|null, gmd?: number|null}[]} items
 *   Pesajes del detalle de la sesión.
 */
export function resumenPorProveedor(items) {
  const grupos = new Map()
  for (const item of items) {
    const clave = item.proveedorId ?? null
    if (!grupos.has(clave)) {
      grupos.set(clave, { proveedorId: clave, nombre: item.proveedorNombre || SIN_PROVEEDOR, items: [] })
    }
    grupos.get(clave).items.push(item)
  }

  const filas = [...grupos.values()].map((grupo) => ({
    proveedorId: grupo.proveedorId,
    nombre: grupo.nombre,
    animales: grupo.items.length,
    pesoPromedio: grupo.items.reduce((suma, item) => suma + item.peso, 0) / grupo.items.length,
    diferenciaPromedio: promedioDeValidos(grupo.items.map((item) => calcularDiferenciaPeso(item.peso, item.pesoAnterior))),
    gmdPromedio: calcularGmdPromedioSesion(grupo.items.map((item) => item.gmd)).gmdPromedio,
    mejor: false,
  }))

  filas.sort((a, b) => {
    if (a.gmdPromedio == null && b.gmdPromedio == null) {
      return a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' })
    }
    if (a.gmdPromedio == null) {
      return 1
    }
    if (b.gmdPromedio == null) {
      return -1
    }
    return b.gmdPromedio - a.gmdPromedio || a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' })
  })

  const maximo = filas.find((fila) => fila.gmdPromedio != null)?.gmdPromedio
  const conMaximo = filas.filter((fila) => fila.gmdPromedio != null && fila.gmdPromedio === maximo)
  if (conMaximo.length === 1) {
    conMaximo[0].mejor = true
  }
  return filas
}

/** El bloque "Por proveedor" solo tiene sentido con 2 o más proveedores (contando "Sin proveedor" como uno). */
export function mostrarPorProveedor(filas) {
  return filas.length >= 2
}
