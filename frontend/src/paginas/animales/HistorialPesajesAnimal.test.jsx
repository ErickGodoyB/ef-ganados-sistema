import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { peticionProtegida } from '../../api/cliente'
import HistorialPesajesAnimal from './HistorialPesajesAnimal'

const mockNavigate = vi.fn()

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}))

vi.mock('../../api/cliente', () => ({
  peticionProtegida: vi.fn(),
}))

const ANIMAL = {
  aniId: 7,
  aniCaravana: 'CAR-007',
  aniFechaIngreso: '2026-01-01',
  aniPesoInicial: 200,
  subGrupoId: 3,
}

describe('HistorialPesajesAnimal', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    mockNavigate.mockClear()
  })

  it('muestra la fila de Ingreso primero, y los pesajes del más reciente al más antiguo', async () => {
    peticionProtegida.mockResolvedValue([
      { pesaId: 1, fecha: '2026-01-11', peso: 210, pesoAnterior: 200, gmd: 1.0, responsableNombre: 'Ana Pérez' },
      { pesaId: 2, fecha: '2026-01-21', peso: 230, pesoAnterior: 210, gmd: 2.0, responsableNombre: 'Ana Pérez' },
    ])
    render(<HistorialPesajesAnimal animal={ANIMAL} />)

    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument())

    const filas = screen.getAllByRole('row')
    // filas[0] es el encabezado; filas[1] es "Ingreso"; filas[2] y filas[3] son los pesajes, del más reciente al más antiguo.
    expect(within(filas[1]).getByText('Ingreso')).toBeInTheDocument()
    expect(within(filas[1]).getByText('200,0 kg')).toBeInTheDocument()
    expect(within(filas[2]).getByText('S-260121-3')).toBeInTheDocument()
    expect(within(filas[2]).getByText('230,0 kg')).toBeInTheDocument()
    expect(within(filas[3]).getByText('S-260111-3')).toBeInTheDocument()
    expect(within(filas[3]).getByText('210,0 kg')).toBeInTheDocument()
  })

  it('sin pesajes, muestra el mensaje de vacío', async () => {
    peticionProtegida.mockResolvedValue([])
    render(<HistorialPesajesAnimal animal={ANIMAL} />)

    expect(await screen.findByText('Este animal todavía no tiene pesajes')).toBeInTheDocument()
  })

  it('si falla la petición, muestra un error', async () => {
    peticionProtegida.mockRejectedValue(new Error('falló'))
    render(<HistorialPesajesAnimal animal={ANIMAL} />)

    expect(await screen.findByText('No se pudo cargar el historial de pesajes.')).toBeInTheDocument()
  })

  it('"Ver sesión" navega a /pesajes con el código calculado con la fecha del pesaje y el lote actual del animal', async () => {
    const usuario = userEvent.setup()
    peticionProtegida.mockResolvedValue([
      { pesaId: 1, fecha: '2026-01-11', peso: 210, pesoAnterior: 200, gmd: 1.0, responsableNombre: 'Ana Pérez' },
    ])
    render(<HistorialPesajesAnimal animal={ANIMAL} />)

    const botones = await screen.findAllByRole('button', { name: 'Ver sesión' })
    await usuario.click(botones[0])

    expect(mockNavigate).toHaveBeenCalledWith(`/pesajes?codigo=${encodeURIComponent('S-260111-3')}`)
  })
})
