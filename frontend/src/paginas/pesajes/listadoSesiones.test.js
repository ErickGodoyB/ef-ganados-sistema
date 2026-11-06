import { describe, expect, it } from 'vitest'
import { filtrarYOrdenarSesiones } from './listadoSesiones'

const ORDEN = { campo: 'fecha', direccion: 'desc' }

const SESIONES = [
  { fecha: '2026-10-29', subGrupoId: 3, subGrupoDescripcion: 'Recría', grupoDescripcion: 'Campo Norte', cantidad: 2, total: 400, promedio: 200, minimo: 190, maximo: 210 },
  { fecha: '2026-10-30', subGrupoId: null, subGrupoDescripcion: null, grupoDescripcion: null, cantidad: 1, total: 180, promedio: 180, minimo: 180, maximo: 180 },
]

describe('filtrarYOrdenarSesiones - búsqueda por código de sesión', () => {
  it('encuentra una sesión por su código completo, sin distinguir mayúsculas', () => {
    const resultado = filtrarYOrdenarSesiones(SESIONES, { busqueda: 's-261029-3', lote: 'todos', desde: '', hasta: '', orden: ORDEN })
    expect(resultado).toHaveLength(1)
    expect(resultado[0].fecha).toBe('2026-10-29')
  })

  it('encuentra una sesión por una parte del código (ej. solo la fecha compacta)', () => {
    const resultado = filtrarYOrdenarSesiones(SESIONES, { busqueda: '261029', lote: 'todos', desde: '', hasta: '', orden: ORDEN })
    expect(resultado).toHaveLength(1)
    expect(resultado[0].fecha).toBe('2026-10-29')
  })

  it('encuentra la sesión "Sin lote" por su código (N=0)', () => {
    const resultado = filtrarYOrdenarSesiones(SESIONES, { busqueda: '-0', lote: 'todos', desde: '', hasta: '', orden: ORDEN })
    expect(resultado).toHaveLength(1)
    expect(resultado[0].fecha).toBe('2026-10-30')
  })

  it('sigue encontrando por lote o grupo (no rompió la búsqueda existente)', () => {
    const resultado = filtrarYOrdenarSesiones(SESIONES, { busqueda: 'campo norte', lote: 'todos', desde: '', hasta: '', orden: ORDEN })
    expect(resultado).toHaveLength(1)
    expect(resultado[0].fecha).toBe('2026-10-29')
  })

  it('un texto que no coincide ni con lote/grupo ni con ningún código no devuelve nada', () => {
    const resultado = filtrarYOrdenarSesiones(SESIONES, { busqueda: 'inexistente', lote: 'todos', desde: '', hasta: '', orden: ORDEN })
    expect(resultado).toHaveLength(0)
  })
})
