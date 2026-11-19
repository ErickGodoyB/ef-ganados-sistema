import { describe, expect, it } from 'vitest'
import { columnasParaExportar } from './animales/exportacionAnimales'
import { COLUMNAS_HISTORIAL } from './animales/exportacionHistorial'
import { COLUMNAS_PERSONAS } from './personas/exportacionPersonas'
import { COLUMNAS_DETALLE_SESION } from './pesajes/exportacionDetalleSesion'
import { columnasSesionesParaExportar } from './pesajes/exportacionSesiones'
import { COLUMNAS_ANIMALES_PROVEEDOR, COLUMNAS_RANKING } from './reportes/exportacionProveedores'
import { COLUMNAS_DETALLE_TRANSFERENCIA, COLUMNAS_TRANSFERENCIAS } from './transferencias/exportacionTransferencias'

const LISTADOS = {
  animales: columnasParaExportar({}),
  personas: COLUMNAS_PERSONAS,
  sesiones: columnasSesionesParaExportar({}),
  'detalle de sesión': COLUMNAS_DETALLE_SESION,
  transferencias: COLUMNAS_TRANSFERENCIAS,
  'detalle de transferencia': COLUMNAS_DETALLE_TRANSFERENCIA,
  'ranking de proveedores': COLUMNAS_RANKING,
  'animales de un proveedor': COLUMNAS_ANIMALES_PROVEEDOR,
  'historial de pesajes': COLUMNAS_HISTORIAL,
}

const TIPOS_CENTRADOS = ['numero', 'entero', 'fecha', 'booleano']

describe.each(Object.entries(LISTADOS))('columnas de exportación: %s', (_nombre, columnas) => {
  it('cada columna tiene clave, título, tipo y alineación ("izquierda" o "centro")', () => {
    for (const columna of columnas) {
      expect(columna.clave, columna.titulo).toBeTruthy()
      expect(columna.titulo).toBeTruthy()
      expect(['texto', 'numero', 'entero', 'fecha', 'booleano']).toContain(columna.tipo)
      expect(['izquierda', 'centro'], `${columna.clave}: alineación`).toContain(columna.alineacion)
    }
  })

  it('números, fechas y sí/no van centrados; los textos, a la izquierda', () => {
    for (const columna of columnas) {
      expect(columna.alineacion, columna.clave).toBe(TIPOS_CENTRADOS.includes(columna.tipo) ? 'centro' : 'izquierda')
    }
  })

  it('cada columna numérica declara sus decimales (misma cantidad en toda la columna)', () => {
    for (const columna of columnas.filter((candidata) => candidata.tipo === 'numero')) {
      expect(Number.isInteger(columna.decimales), columna.clave).toBe(true)
    }
  })

  it('las claves no se repiten', () => {
    const claves = columnas.map((columna) => columna.clave)
    expect(new Set(claves).size).toBe(claves.length)
  })
})

describe('decimales: pesos con 1 y GMD con 3 en todos los listados', () => {
  it('los pesos llevan 1 decimal y las GMD, 3', () => {
    for (const columnas of Object.values(LISTADOS)) {
      for (const columna of columnas.filter((candidata) => candidata.tipo === 'numero')) {
        const esGmd = columna.titulo.includes('GMD')
        expect(columna.decimales, `${columna.clave} (${columna.titulo})`).toBe(esGmd ? 3 : 1)
      }
    }
  })
})
