/**
 * Preferencias persistidas del listado de animales (RF010): qué columnas
 * opcionales se muestran y cuántas filas por página. Se guardan en
 * localStorage bajo la clave "preferenciasListadoAnimales"; si localStorage
 * falla (ej. navegación privada muy restrictiva), la pantalla sigue
 * funcionando con los valores por defecto, solo que no los recuerda entre
 * sesiones.
 */

import { useCallback, useState } from 'react'
import { COLUMNAS_OPCIONALES } from './columnas'

const CLAVE = 'preferenciasListadoAnimales'
const FILAS_POR_PAGINA_POR_DEFECTO = 10

// Todas las columnas opcionales visibles por defecto, salvo "Fecha de
// ingreso" (pedido explícitamente así). Se arma a partir de
// COLUMNAS_OPCIONALES para que una columna nueva no quede fuera por olvido.
const COLUMNAS_POR_DEFECTO = COLUMNAS_OPCIONALES.reduce((acumulado, columna) => {
  acumulado[columna.clave] = columna.clave !== 'fechaIngreso'
  return acumulado
}, {})

function valoresPorDefecto() {
  return { columnasVisibles: { ...COLUMNAS_POR_DEFECTO }, filasPorPagina: FILAS_POR_PAGINA_POR_DEFECTO }
}

function leerPreferenciasGuardadas() {
  try {
    const bruto = localStorage.getItem(CLAVE)
    if (!bruto) {
      return null
    }
    const datos = JSON.parse(bruto)
    return {
      columnasVisibles: { ...COLUMNAS_POR_DEFECTO, ...datos.columnasVisibles },
      filasPorPagina: datos.filasPorPagina ?? FILAS_POR_PAGINA_POR_DEFECTO,
    }
  } catch {
    return null
  }
}

function guardarPreferencias(preferencias) {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(preferencias))
  } catch {
    // Sin localStorage disponible: la pantalla sigue funcionando, solo que
    // no recuerda estas preferencias entre sesiones.
  }
}

/** Hook de preferencias del listado de animales: columnas visibles y filas por página, persistidas en localStorage. */
export function usePreferenciasListadoAnimales() {
  const [preferencias, setPreferencias] = useState(() => leerPreferenciasGuardadas() ?? valoresPorDefecto())

  /** Muestra u oculta una columna opcional (clave de columnas.js) y guarda la preferencia. */
  const cambiarColumnaVisible = useCallback((clave, visible) => {
    setPreferencias((actual) => {
      const siguiente = { ...actual, columnasVisibles: { ...actual.columnasVisibles, [clave]: visible } }
      guardarPreferencias(siguiente)
      return siguiente
    })
  }, [])

  /** Cambia cuántas filas se muestran por página y guarda la preferencia. */
  const cambiarFilasPorPagina = useCallback((filasPorPagina) => {
    setPreferencias((actual) => {
      const siguiente = { ...actual, filasPorPagina }
      guardarPreferencias(siguiente)
      return siguiente
    })
  }, [])

  /** Vuelve columnas visibles y filas por página a sus valores por defecto. */
  const restablecer = useCallback(() => {
    const porDefecto = valoresPorDefecto()
    setPreferencias(porDefecto)
    guardarPreferencias(porDefecto)
  }, [])

  return {
    columnasVisibles: preferencias.columnasVisibles,
    filasPorPagina: preferencias.filasPorPagina,
    cambiarColumnaVisible,
    cambiarFilasPorPagina,
    restablecer,
  }
}
