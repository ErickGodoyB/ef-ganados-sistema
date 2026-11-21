/**
 * Carga del logo de la empresa (MARCA.rutaLogo, un PNG en /public) para
 * incrustarlo en los archivos exportados. Compartido por el PDF y el Excel.
 */

import { MARCA } from '../../configuracion/marca'
import { dimensionesDePng } from './formatos'

/**
 * Carga el logo como { base64, datos (data URL), ancho, alto } o devuelve null
 * si no se puede (no existe, no es PNG, falla la red): en ese caso el archivo
 * usa solo el nombre de la empresa en texto (PDF) o el título solo (Excel).
 */
export async function cargarLogo() {
  try {
    const respuesta = await fetch(MARCA.rutaLogo)
    if (!respuesta.ok) {
      return null
    }
    const bytes = new Uint8Array(await respuesta.arrayBuffer())
    const dimensiones = dimensionesDePng(bytes)
    if (!dimensiones) {
      return null
    }
    let binario = ''
    for (let i = 0; i < bytes.length; i += 0x8000) {
      binario += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
    }
    const base64 = btoa(binario)
    return { base64, datos: `data:image/png;base64,${base64}`, ...dimensiones }
  } catch {
    return null
  }
}
