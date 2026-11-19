/**
 * Nombre de quien genera un archivo exportado ("Generado el … por …"): el de
 * la persona asociada al usuario o, si todavía no se cargó, el nombre de
 * usuario. Lee el contexto de autenticación directamente (sin el hook
 * useAuth, que falla fuera de un AuthProvider) para que los listados se
 * puedan montar en pruebas sin proveedor; si no hay sesión, "Usuario".
 */

import { useContext } from 'react'
import { AuthContext } from '../../auth/contextoAuth'

export function useUsuarioExportacion() {
  const contexto = useContext(AuthContext)
  return contexto?.personaNombre || contexto?.usuario?.usuNombre || 'Usuario'
}
