import { describe, expect, it } from 'vitest'
import { avisoPesajeRetroactivo } from './pesajeRetroactivo'

describe('avisoPesajeRetroactivo', () => {
  it('null si la fecha no es anterior a fechaUltimoPesaje (es posterior)', () => {
    expect(avisoPesajeRetroactivo('CAR-001', '2026-02-01', '2026-01-10', 3)).toBeNull()
  })

  it('null si la fecha es la misma que fechaUltimoPesaje', () => {
    expect(avisoPesajeRetroactivo('CAR-001', '2026-01-10', '2026-01-10', 3)).toBeNull()
  })

  it('null si fechaUltimoPesaje no llegó del backend (undefined)', () => {
    expect(avisoPesajeRetroactivo('CAR-001', '2026-01-01', undefined, 3)).toBeNull()
  })

  it('null si fechaUltimoPesaje es null (el animal no tiene pesajes)', () => {
    expect(avisoPesajeRetroactivo('CAR-001', '2026-01-01', null, 3)).toBeNull()
  })

  it('arma el mensaje con la fecha formateada y el código de sesión (con lote) cuando la fecha es anterior', () => {
    expect(avisoPesajeRetroactivo('CAR-001', '2026-01-01', '2026-01-10', 3)).toBe(
      'CAR-001 ya tiene un pesaje posterior (10/01/2026, sesión S-260110-3). ' +
        'Este pesaje se guardará antes y recalculará la ganancia diaria de los posteriores.',
    )
  })

  it('usa 0 en el código de sesión cuando el animal no tiene lote', () => {
    expect(avisoPesajeRetroactivo('CAR-002', '2026-01-01', '2026-01-10', null)).toContain('sesión S-260110-0')
  })
})
