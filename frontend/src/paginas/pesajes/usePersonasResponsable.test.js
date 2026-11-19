import { renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { peticionProtegida } from '../../api/cliente'
import { usePersonasResponsable } from './usePersonasResponsable'

vi.mock('../../api/cliente', () => ({
  peticionProtegida: vi.fn(),
  ErrorHttp: class ErrorHttp extends Error {},
}))

const PERSONAS = [
  { perId: 1, perNombre: 'Ana', perApellido: 'Gómez', perTipo: 'EMPLEADO' },
  { perId: 2, perNombre: 'Juan', perApellido: 'Pérez', perTipo: 'PROPIETARIO' },
  { perId: 3, perNombre: 'Lucía', perApellido: 'Flores', perTipo: 'CLIENTE' },
  { perId: 4, perNombre: 'Pedro', perApellido: 'Vera', perTipo: 'PROVEEDOR' },
]

describe('usePersonasResponsable', () => {
  it('excluye a las personas de tipo CLIENTE y PROVEEDOR', async () => {
    peticionProtegida.mockResolvedValueOnce(PERSONAS)

    const { result } = renderHook(() => usePersonasResponsable(999))

    await waitFor(() => expect(result.current.cargandoPersonas).toBe(false))

    expect(result.current.personas.map((persona) => persona.perId)).toEqual([1, 2])
  })

  it('incluye a la persona actual aunque sea de tipo CLIENTE', async () => {
    peticionProtegida.mockResolvedValueOnce(PERSONAS)

    const { result } = renderHook(() => usePersonasResponsable(3))

    await waitFor(() => expect(result.current.cargandoPersonas).toBe(false))

    expect(result.current.personas.map((persona) => persona.perId)).toEqual([1, 2, 3])
  })

  it('incluye a la persona actual aunque sea de tipo PROVEEDOR, pero no a los demás proveedores', async () => {
    peticionProtegida.mockResolvedValueOnce(PERSONAS)

    const { result } = renderHook(() => usePersonasResponsable(4))

    await waitFor(() => expect(result.current.cargandoPersonas).toBe(false))

    expect(result.current.personas.map((persona) => persona.perId)).toEqual([1, 2, 4])
  })
})
