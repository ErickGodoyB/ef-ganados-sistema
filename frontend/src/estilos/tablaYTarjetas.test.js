/**
 * Protege el patrón "tabla en PC / tarjetas en celular" de toda la app.
 *
 * jsdom no resuelve @media ni la cascada real, así que la prueba lee los
 * .css y simula la cascada a mano: para cada clase `*-tabla-solo-escritorio`
 * y `*-tarjetas-solo-movil` recorre las reglas en orden de aparición (gana
 * la última con la misma especificidad) y comprueba el `display` final en
 * celular (< 768px) y en PC (>= 768px).
 *
 * El error que evita: declarar el `display: flex` de las tarjetas DESPUÉS
 * del @media que las oculta en PC. La regla posterior pisa al
 * `display: none` y se ven la tabla y las tarjetas a la vez.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const RAIZ_SRC = join(import.meta.dirname, '..')

function archivosCss(directorio) {
  return readdirSync(directorio).flatMap((nombre) => {
    const ruta = join(directorio, nombre)
    if (statSync(ruta).isDirectory()) return archivosCss(ruta)
    return nombre.endsWith('.css') ? [ruta] : []
  })
}

/**
 * Devuelve las reglas con su display, en orden: { selectores, enMedia, display }.
 * Solo contempla un nivel de @media (el que usa el proyecto).
 */
function leerReglas(css) {
  const sinComentarios = css.replace(/\/\*[\s\S]*?\*\//g, '')
  const reglas = []
  let media = null
  let i = 0
  while (i < sinComentarios.length) {
    const abre = sinComentarios.indexOf('{', i)
    if (abre === -1) break
    const prelude = sinComentarios.slice(i, abre).trim()
    if (prelude.startsWith('@media')) {
      media = prelude
      i = abre + 1
      continue
    }
    const cierra = sinComentarios.indexOf('}', abre)
    const cuerpo = sinComentarios.slice(abre + 1, cierra)
    const display = /(?:^|;|\s)display\s*:\s*([^;]+)/.exec(cuerpo)?.[1].trim()
    if (display) {
      reglas.push({
        selectores: prelude.split(',').map((s) => s.trim()),
        enMedia: media,
        display,
      })
    }
    i = cierra + 1
    // Un "}" extra cierra el @media.
    if (media && sinComentarios.slice(i).match(/^\s*}/)) {
      media = null
      i = sinComentarios.indexOf('}', i) + 1
    }
  }
  return reglas
}

/** display final de una clase en un ancho dado, o null si ninguna regla lo fija. */
function displayFinal(reglas, clase, ancho) {
  let resultado = null
  for (const regla of reglas) {
    if (!regla.selectores.includes(`.${clase}`)) continue
    if (regla.enMedia && !/min-width:\s*768px/.test(regla.enMedia)) continue
    if (regla.enMedia && ancho < 768) continue
    resultado = regla.display
  }
  return resultado
}

const MOVIL = 400
const ESCRITORIO = 1200

const pares = []
for (const ruta of archivosCss(RAIZ_SRC)) {
  const css = readFileSync(ruta, 'utf8')
  const reglas = leerReglas(css)
  const clases = new Set(
    [...css.matchAll(/\.([\w-]+-(?:tabla-solo-escritorio|tarjetas-solo-movil))\b/g)].map((m) => m[1]),
  )
  for (const clase of clases) {
    pares.push({ archivo: ruta.slice(RAIZ_SRC.length + 1), clase, reglas })
  }
}

describe('tabla en PC / tarjetas en celular', () => {
  it('encuentra los pares de la app (si no, la prueba no estaría revisando nada)', () => {
    expect(pares.length).toBeGreaterThanOrEqual(10)
  })

  it.each(pares.filter((p) => p.clase.endsWith('tabla-solo-escritorio')))(
    '$archivo: .$clase se oculta en celular y se muestra en PC',
    ({ reglas, clase }) => {
      expect(displayFinal(reglas, clase, MOVIL)).toBe('none')
      expect(displayFinal(reglas, clase, ESCRITORIO)).not.toBe('none')
      expect(displayFinal(reglas, clase, ESCRITORIO)).not.toBeNull()
    },
  )

  it.each(pares.filter((p) => p.clase.endsWith('tarjetas-solo-movil')))(
    '$archivo: .$clase se muestra en celular y se oculta en PC',
    ({ reglas, clase }) => {
      expect(displayFinal(reglas, clase, MOVIL)).not.toBe('none')
      expect(displayFinal(reglas, clase, ESCRITORIO)).toBe('none')
    },
  )
})
