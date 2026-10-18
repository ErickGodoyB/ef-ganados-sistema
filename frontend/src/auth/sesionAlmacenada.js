/**
 * Lectura y escritura de la sesión guardada en localStorage, para que no se
 * pierda al recargar la página. La usan tanto AuthContext (fuente de verdad
 * mientras la app está abierta) como api/cliente.js (que necesita leer el
 * token para las peticiones protegidas sin depender de React).
 */

const CLAVE_SESION = 'ef-ganados.sesion'

/**
 * Devuelve la sesión guardada ({ token, usuNombre, tipo }) o null si no hay
 * ninguna, o si lo guardado no es un JSON válido.
 */
export function obtenerSesionGuardada() {
  try {
    const bruto = localStorage.getItem(CLAVE_SESION)
    return bruto ? JSON.parse(bruto) : null
  } catch {
    return null
  }
}

/** Guarda la sesión actual en localStorage. */
export function guardarSesion(sesion) {
  try {
    localStorage.setItem(CLAVE_SESION, JSON.stringify(sesion))
  } catch {
    // Sin localStorage disponible (ej. navegación privada muy restrictiva):
    // la sesión sigue funcionando en memoria durante esta pestaña, solo que
    // no sobrevive a un recargado de página.
  }
}

/** Elimina la sesión guardada (cierre de sesión, o token inválido/expirado). */
export function borrarSesionGuardada() {
  try {
    localStorage.removeItem(CLAVE_SESION)
  } catch {
    // Ver comentario de guardarSesion.
  }
}
