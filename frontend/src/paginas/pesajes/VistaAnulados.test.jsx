import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { peticionProtegida } from '../../api/cliente'
import VistaAnulados from './VistaAnulados'

vi.mock('../../api/cliente', () => ({
  peticionProtegida: vi.fn(),
}))

const ANULADOS = [
  {
    pesaId: 1,
    fecha: '2026-03-01',
    animalId: 1,
    caravana: 'CAR-001',
    subGrupoDescripcion: 'Lote A',
    peso: 200,
    motivo: 'Error de carga',
    anuladoEn: '2026-03-02T10:15:00',
    anuladoPorNombre: 'Responsable Uno',
  },
  {
    pesaId: 2,
    fecha: '2026-03-05',
    animalId: 2,
    caravana: 'TEST-25',
    subGrupoDescripcion: null,
    peso: 210,
    motivo: 'Animal equivocado',
    anuladoEn: '2026-03-06T08:00:00',
    anuladoPorNombre: null,
  },
]

describe('VistaAnulados', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('muestra el estado vacío cuando no hay pesajes anulados', async () => {
    peticionProtegida.mockResolvedValue([])
    render(<VistaAnulados desde="" hasta="" />)
    expect(await screen.findByText('No hay pesajes anulados')).toBeInTheDocument()
  })

  it('lista los anulados con sus datos (fecha, lote, motivo, anulado el/por)', async () => {
    peticionProtegida.mockResolvedValue(ANULADOS)
    render(<VistaAnulados desde="" hasta="" />)

    await screen.findAllByText('CAR-001')
    expect(screen.getAllByText('01/03/2026').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Lote A').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Error de carga').length).toBeGreaterThan(0)
    expect(screen.getAllByText('02/03/2026 10:15').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Responsable Uno').length).toBeGreaterThan(0)
    // El segundo, sin lote ni "anulado por": se completan con los textos por defecto.
    expect(screen.getAllByText('Sin lote').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Sin datos').length).toBeGreaterThan(0)
  })

  it('pide el listado con desde/hasta como parámetros de la URL', async () => {
    peticionProtegida.mockResolvedValue([])
    render(<VistaAnulados desde="2026-03-01" hasta="2026-03-31" />)
    await waitFor(() =>
      expect(peticionProtegida).toHaveBeenCalledWith('/api/pesajes/anulados?desde=2026-03-01&hasta=2026-03-31'),
    )
  })

  it('el buscador filtra por caravana en el cliente', async () => {
    const usuario = userEvent.setup()
    peticionProtegida.mockResolvedValue(ANULADOS)
    render(<VistaAnulados desde="" hasta="" />)
    await screen.findAllByText('CAR-001')

    await usuario.type(screen.getByLabelText('Buscar por caravana'), 'TEST')

    expect(screen.queryByText('CAR-001')).not.toBeInTheDocument()
    expect(screen.getAllByText('TEST-25').length).toBeGreaterThan(0)
  })
})
