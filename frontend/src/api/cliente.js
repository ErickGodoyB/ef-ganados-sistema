/**
 * Cliente HTTP mínimo para hablar con el backend. No depende de React: son
 * funciones simples basadas en fetch, pensadas para que cualquier pantalla
 * o contexto pueda usarlas. La URL base viene de la variable de entorno
 * VITE_API_URL (ver .env / .env.example).
 */

import { borrarSesionGuardada, obtenerSesionGuardada } from '../auth/sesionAlmacenada'

/**
 * URL base del backend. Si VITE_API_URL está definida y no está vacía (ver
 * .env), se usa esa. Si no, se infiere a partir de la URL desde la que se
 * cargó el frontend (mismo protocolo y host, puerto 8080): así, al abrir la
 * app desde un celular en la misma red wifi (ej. http://192.168.1.5:5173,
 * levantando Vite con "npm run dev:red"), las peticiones van solas a
 * http://192.168.1.5:8080 sin tener que configurar nada a mano.
 */
const URL_BASE = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:8080`

/**
 * Error de una respuesta HTTP no exitosa. Lleva el código de estado para
 * que cada pantalla pueda decidir qué mensaje mostrar (ej. 401 vs. otros).
 */
export class ErrorHttp extends Error {
  constructor(estado, mensaje) {
    super(mensaje)
    this.name = 'ErrorHttp'
    this.estado = estado
  }
}

/**
 * Ejecuta la petición fetch dada y devuelve el cuerpo de la respuesta ya
 * parseado como JSON (o null si no trae cuerpo). Si la conexión falla
 * directamente (servidor caído, sin red, CORS, etc.), lanza un Error común.
 * Si el backend respondió pero con un código de error, lanza un ErrorHttp
 * con ese código y el mensaje de texto que mandó el backend.
 */
async function peticion(ruta, opciones) {
  let respuesta
  try {
    respuesta = await fetch(`${URL_BASE}${ruta}`, opciones)
  } catch {
    throw new Error('No se pudo conectar con el servidor')
  }

  // Los endpoints del backend devuelven JSON cuando salen bien, pero texto
  // plano en los errores (400/401/404/409), así que el cuerpo se lee siempre
  // como texto primero y solo se interpreta como JSON si la respuesta fue
  // exitosa y trae contenido.
  const texto = await respuesta.text()

  if (!respuesta.ok) {
    throw new ErrorHttp(respuesta.status, texto || 'Ocurrió un error inesperado')
  }

  return texto ? JSON.parse(texto) : null
}

/** Arma los encabezados de una petición JSON autenticada, con el token de la sesión guardada. */
function encabezadosConSesion() {
  const sesion = obtenerSesionGuardada()
  const encabezados = { 'Content-Type': 'application/json' }
  if (sesion?.token) {
    encabezados.Authorization = `Bearer ${sesion.token}`
  }
  return encabezados
}

/** Petición a un endpoint público (no necesita, ni manda, token de sesión). Ej: el login. */
export function peticionPublica(ruta, opciones = {}) {
  return peticion(ruta, {
    ...opciones,
    headers: { 'Content-Type': 'application/json', ...opciones.headers },
  })
}

/**
 * Petición a un endpoint protegido: manda el token de la sesión guardada.
 * Si el backend responde 401 (token ausente, inválido o vencido), borra la
 * sesión guardada y manda a la persona de vuelta a /login.
 */
export async function peticionProtegida(ruta, opciones = {}) {
  try {
    return await peticion(ruta, {
      ...opciones,
      headers: { ...encabezadosConSesion(), ...opciones.headers },
    })
  } catch (error) {
    if (error instanceof ErrorHttp && error.estado === 401) {
      borrarSesionGuardada()
      if (window.location.pathname !== '/login') {
        window.location.assign('/login')
      }
    }
    throw error
  }
}

/** Inicia sesión contra el backend. Devuelve { token, usuNombre, tipo } si las credenciales son correctas. */
export function login(usuNombre, usuPassword) {
  return peticionPublica('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ usuNombre, usuPassword }),
  })
}
