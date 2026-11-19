/**
 * Descarga directa de un archivo generado en el navegador: crea un enlace
 * temporal a un Blob y lo "clickea", sin pasar por el servidor. Separado de
 * los generadores para que estos devuelvan el Blob (y se puedan probar sin
 * disparar una descarga).
 */

/** Descarga el blob con el nombre dado. */
export function descargarArchivo(blob, nombre) {
  const url = URL.createObjectURL(blob)
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = nombre
  document.body.appendChild(enlace)
  enlace.click()
  enlace.remove()
  // Se libera después del clic: algunos navegadores necesitan que la URL siga viva un instante.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
