import { renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { peticionProtegida } from '../../api/cliente'
import { useDatosFormularioAnimal } from './useDatosFormularioAnimal'

vi.mock('../../api/cliente', () => ({
  peticionProtegida: vi.fn(),
  ErrorHttp: class ErrorHttp extends Error {},
}))

const RAZAS = [{ rzId: 1, rzNombre: 'Brahman' }]
const SUB_GRUPOS = [{ sbId: 1, sbNombre: 'Lote 1' }]
const PERSONAS = [
  { perId: 1, perNombre: 'Ana', perApellido: 'Gómez', perTipo: 'EMPLEADO' },
  { perId: 2, perNombre: 'Juan', perApellido: 'Pérez', perTipo: 'PROPIETARIO' },
  { perId: 3, perNombre: 'Lucía', perApellido: 'Flores', perTipo: 'CLIENTE' },
]

describe('useDatosFormularioAnimal', () => {
  it('solo ofrece como dueños a las personas de tipo PROPIETARIO', async () => {
    peticionProtegida.mockImplementation((ruta) => {
      if (ruta === '/api/razas') return Promise.resolve(RAZAS)
      if (ruta === '/api/subgrupos') return Promise.resolve(SUB_GRUPOS)
      if (ruta === '/api/personas') return Promise.resolve(PERSONAS)
      return Promise.reject(new Error(`ruta inesperada: ${ruta}`))
    })

    const { result } = renderHook(() => useDatosFormularioAnimal())

    await waitFor(() => expect(result.current.cargando).toBe(false))

    expect(result.current.duenios.map((persona) => persona.perId)).toEqual([2])
  })
})
