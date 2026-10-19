/**
 * Lectura y escritura de la sesión guardada en el navegador. Según la
 * casilla "Recordarme en este dispositivo" de Login.jsx, se guarda en
 * localStorage (sobrevive a cerrar la pestaña o el navegador) o en
 * sessionStorage (se pierde al cerrarlos). La usan tanto AuthContext
 * (fuente de verdad mientras la app está abierta) como api/cliente.js (que
 * necesita leer el token para las peticiones protegidas sin depender de
 * React). La contraseña nunca se guarda acá: "sesion" es solo lo que
 * devuelve el backend en el login ({ token, usuNombre, tipo }).
 */

const CLAVE_SESION = 'ef-ganados.sesion'

/**
 * Devuelve la sesión guardada ({ token, usuNombre, tipo }) o null si no hay
 * ninguna, o si lo guardado no es un JSON válido. Busca primero en
 * sessionStorage (sesión sin "Recordarme", de esta pestaña) y, si no hay
 * nada ahí, en localStorage (sesión con "Recordarme", de una vez anterior).
 */
export function obtenerSesionGuardada() {
  try {
    const deEstaSesion = sessionStorage.getItem(CLAVE_SESION)
    if (deEstaSesion) {
      return JSON.parse(deEstaSesion)
    }
  } catch {
    // Sin sessionStorage disponible: se sigue probando en localStorage.
  }

  try {
    const persistida = localStorage.getItem(CLAVE_SESION)
    return persistida ? JSON.parse(persistida) : null
  } catch {
    return null
  }
}

/**
 * Guarda la sesión actual. Con "recordarme" va a localStorage; si no, a
 * sessionStorage. Si el almacenamiento elegido falla (ej. navegación
 * privada muy restrictiva), la app sigue funcionando con la sesión en
 * memoria durante esta pestaña, solo que no se recuerda.
 */
export function guardarSesion(sesion, recordarme) {
  const almacenamiento = recordarme ? localStorage : sessionStorage
  try {
    almacenamiento.setItem(CLAVE_SESION, JSON.stringify(sesion))
  } catch {
    // Ver el comentario de arriba: no es un error fatal.
  }
}

/**
 * Elimina la sesión guardada en los dos almacenamientos (cierre de sesión,
 * o token inválido/expirado). Borra de ambos sin importar con qué opción
 * se había guardado, para no dejar una copia vieja dando vueltas.
 */
export function borrarSesionGuardada() {
  try {
    sessionStorage.removeItem(CLAVE_SESION)
  } catch {
    // Ver comentario de guardarSesion.
  }
  try {
    localStorage.removeItem(CLAVE_SESION)
  } catch {
    // Ver comentario de guardarSesion.
  }
}
