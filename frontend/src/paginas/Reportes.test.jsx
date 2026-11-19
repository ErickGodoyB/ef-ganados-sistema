import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { peticionProtegida } from '../api/cliente'
import { useAuth } from '../auth/useAuth'
import BarraLateral from '../layout/BarraLateral'
import { useTema } from '../tema/useTema'
import Reportes from './Reportes'

vi.mock('../api/cliente', () => ({
  peticionProtegida: vi.fn(),
  ErrorHttp: class ErrorHttp extends Error {},
}))

vi.mock('../auth/useAuth', () => ({
  useAuth: vi.fn(),
}))

vi.mock('../tema/useTema', () => ({
  useTema: vi.fn(),
}))

beforeEach(() => {
  peticionProtegida.mockResolvedValue([])
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('Reportes', () => {
  it('tiene el título, ya no dice "Próximamente" y muestra el selector con el reporte elegido', async () => {
    render(<Reportes />)
    await waitFor(() => expect(screen.queryByText('Cargando reporte…')).not.toBeInTheDocument())

    expect(screen.getByRole('heading', { level: 1, name: 'Reportes' })).toBeInTheDocument()
    expect(screen.queryByText('Próximamente')).not.toBeInTheDocument()

    const selector = screen.getByRole('navigation', { name: 'Reportes disponibles' })
    const opcion = selector.querySelector('button')
    expect(opcion).toHaveTextContent('Rendimiento por proveedor')
    expect(opcion).toHaveAttribute('aria-pressed', 'true')
  })

  it('muestra el reporte de rendimiento por proveedor con su explicación', async () => {
    render(<Reportes />)
    await waitFor(() => expect(screen.queryByText('Cargando reporte…')).not.toBeInTheDocument())

    expect(screen.getByRole('heading', { level: 2, name: 'Rendimiento por proveedor' })).toBeInTheDocument()
    expect(screen.getByText(/GMD acumulado = /)).toBeInTheDocument()
    expect(peticionProtegida).toHaveBeenCalledWith('/api/reportes/proveedores?soloActivos=false')
  })
})

describe('Barra lateral: Reportes', () => {
  it('el acceso "Reportes" es un enlace a /reportes y no dice "Próximamente"', () => {
    useAuth.mockReturnValue({ usuario: { usuNombre: 'jperez' }, cerrarSesion: vi.fn() })
    useTema.mockReturnValue({ tema: 'claro', alternarTema: vi.fn() })
    render(
      <MemoryRouter initialEntries={['/animales']}>
        <BarraLateral abierta onNavegar={vi.fn()} />
      </MemoryRouter>,
    )

    expect(screen.getByRole('link', { name: 'Reportes' })).toHaveAttribute('href', '/reportes')
    expect(screen.queryByText(/Próximamente/)).not.toBeInTheDocument()
  })
})
