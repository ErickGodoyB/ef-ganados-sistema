/**
 * Identidad de la empresa (nombre, subtítulo, logo). Este es el único
 * lugar del frontend donde debe escribirse el nombre "EF Ganados" o
 * cualquier otro dato de marca: todas las pantallas importan MARCA en vez
 * de tener el texto escrito a mano, para que un cambio de nombre, de
 * subtítulo o de logo se haga en un solo sitio.
 */

export const MARCA = {
  /** Nombre de la empresa, como se muestra en el login y en otras pantallas. */
  nombre: 'EF Ganados',

  /** Subtítulo corto que acompaña al nombre en la pantalla de login. */
  subtitulo: 'Sistema de gestión bovina',

  /** Ruta pública del logo. Si no existe el archivo, se muestra el respaldo de "iniciales". */
  rutaLogo: '/logo.png',

  /** Iniciales que se muestran como logo provisional cuando rutaLogo no se puede cargar. */
  iniciales: 'EF',
}
