/**
 * Proveedor de tema claro/oscuro. Por defecto sigue la preferencia del
 * sistema (prefers-color-scheme); en cuanto la persona elige un tema con
 * BotonTema, esa elección se guarda en localStorage y pasa a tener
 * prioridad sobre la preferencia del sistema, incluso si esta cambia
 * después. El valor actual se refleja en el atributo data-tema de <html>,
 * que es lo que leen las variables CSS definidas en index.css (ver
 * useTema.js para el hook de acceso al contexto).
 */

import { useCallback, useEffect, useState } from 'react'
import { TemaContext } from './contextoTema'

const CLAVE_TEMA = 'ef-ganados.tema'

function temaGuardado() {
  try {
    return localStorage.getItem(CLAVE_TEMA)
  } catch {
    return null
  }
}

function prefiereOscuroElSistema() {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false
}

/** Envuelve la app y provee el contexto de tema. */
export function TemaProvider({ children }) {
  const [tema, setTema] = useState(() => temaGuardado() ?? (prefiereOscuroElSistema() ? 'oscuro' : 'claro'))

  useEffect(() => {
    document.documentElement.setAttribute('data-tema', tema)
  }, [tema])

  /** Alterna entre tema claro y oscuro, y guarda la elección en localStorage. */
  const alternarTema = useCallback(() => {
    setTema((actual) => {
      const siguiente = actual === 'oscuro' ? 'claro' : 'oscuro'
      try {
        localStorage.setItem(CLAVE_TEMA, siguiente)
      } catch {
        // Sin localStorage disponible: el tema sigue funcionando en esta
        // pestaña, solo que no se recuerda entre sesiones.
      }
      return siguiente
    })
  }, [])

  return <TemaContext.Provider value={{ tema, alternarTema }}>{children}</TemaContext.Provider>
}
