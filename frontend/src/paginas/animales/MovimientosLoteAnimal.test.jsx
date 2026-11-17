import { render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { peticionProtegida } from '../../api/cliente'
import MovimientosLoteAnimal from './MovimientosLoteAnimal'

vi.mock('../../api/cliente', () => ({
  peticionProtegida: vi.fn(),
}))

const ANIMAL = { aniId: 7, aniCaravana: 'CAR-007' }

describe('MovimientosLoteAnimal', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('pide los movimientos del animal y los muestra: fecha, motivo, origen → destino y responsable', async () => {
    peticionProtegida.mockResolvedValue([
      {
        transferenciaId: 2,
        fecha: '2026-03-10',
        motivo: 'DEVOLUCION',
        origen: 'Lote B',
        destino: 'Lote A',
        responsableNombre: 'Ana Pérez',
      },
      {
        transferenciaId: 1,
        fecha: '2026-03-01',
        motivo: 'SELECCION',
        origen: 'Sin lote',
        destino: 'Lote B',
        responsableNombre: 'Luis Gómez',
      },
    ])
    render(<MovimientosLoteAnimal animal={ANIMAL} />)

    const items = await screen.findAllByRole('listitem')
    expect(peticionProtegida).toHaveBeenCalledWith('/api/animales/7/movimientos')
    expect(items).toHaveLength(2)
    // Más reciente primero, como lo devuelve el backend.
    expect(within(items[0]).getByText('10/03/2026')).toBeInTheDocument()
    expect(within(items[0]).getByText('Devolución')).toBeInTheDocument()
    expect(within(items[0]).getByText('Lote B')).toBeInTheDocument()
    expect(within(items[0]).getByText('Lote A')).toBeInTheDocument()
    expect(within(items[0]).getByText('Registró: Ana Pérez')).toBeInTheDocument()
    expect(within(items[1]).getByText('Selección')).toBeInTheDocument()
    expect(within(items[1]).getByText('Sin lote')).toBeInTheDocument()
  })

  it('sin movimientos muestra el mensaje de vacío', async () => {
    peticionProtegida.mockResolvedValue([])
    render(<MovimientosLoteAnimal animal={ANIMAL} />)

    expect(await screen.findByText('Este animal todavía no cambió de lote')).toBeInTheDocument()
  })

  it('si falla la petición muestra un error', async () => {
    peticionProtegida.mockRejectedValue(new Error('falló'))
    render(<MovimientosLoteAnimal animal={ANIMAL} />)

    expect(await screen.findByText('No se pudieron cargar los movimientos de lote.')).toBeInTheDocument()
  })

  it('una respuesta que no es una lista no rompe: se trata como vacía', async () => {
    peticionProtegida.mockResolvedValue({ aniId: 7 })
    render(<MovimientosLoteAnimal animal={ANIMAL} />)

    expect(await screen.findByText('Este animal todavía no cambió de lote')).toBeInTheDocument()
  })
})
