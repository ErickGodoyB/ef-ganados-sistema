import { describe, expect, it } from 'vitest'
import { calcularCodigoSesion } from './codigoSesion'

describe('calcularCodigoSesion', () => {
  it('arma "S-AAAAMMDD-N" con el id del lote', () => {
    expect(calcularCodigoSesion('2026-10-29', 3)).toBe('S-20261029-3')
  })

  it('usa 0 como N cuando la sesión es "Sin lote" (subGrupoId null)', () => {
    expect(calcularCodigoSesion('2026-10-29', null)).toBe('S-20261029-0')
  })

  it('usa 0 como N cuando subGrupoId es undefined', () => {
    expect(calcularCodigoSesion('2026-10-29', undefined)).toBe('S-20261029-0')
  })

  it('es estable: la misma fecha y lote siempre dan el mismo código', () => {
    expect(calcularCodigoSesion('2026-01-05', 10)).toBe(calcularCodigoSesion('2026-01-05', 10))
  })

  it('distingue sesiones de distinto lote en la misma fecha', () => {
    expect(calcularCodigoSesion('2026-01-05', 1)).not.toBe(calcularCodigoSesion('2026-01-05', 2))
  })
})
