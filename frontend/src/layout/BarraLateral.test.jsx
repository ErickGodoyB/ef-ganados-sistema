import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useAuth } from '../auth/useAuth'
import { useTema } from '../tema/useTema'
import BarraLateral from './BarraLateral'

vi.mock('../auth/useAuth', () => ({
  useAuth: vi.fn(),
}))

vi.mock('../tema/useTema', () => ({
  useTema: vi.fn(),
}))

function renderBarraLateral(rutaInicial = '/animales') {
  useAuth.mockReturnValue({ usuario: { usuNombre: 'jperez' }, cerrarSesion: vi.fn() })
  useTema.mockReturnValue({ tema: 'claro', alternarTema: vi.fn() })
  return render(
    <MemoryRouter initialEntries={[rutaInicial]}>
      <BarraLateral abierta onNavegar={vi.fn()} />
    </MemoryRouter>,
  )
}

describe('BarraLateral: desplegable Catálogos', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('arranca cerrado cuando la ruta actual no está dentro de Catálogos', () => {
    renderBarraLateral('/animales')

    const boton = screen.getByRole('button', { name: 'Catálogos' })
    expect(boton).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('link', { name: 'Razas' })).not.toBeInTheDocument()
  })

  it('se abre solo cuando la ruta actual está dentro de /catalogos, y lista Razas y Grupos y lotes', () => {
    renderBarraLateral('/catalogos/razas')

    const boton = screen.getByRole('button', { name: 'Catálogos' })
    expect(boton).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('link', { name: 'Razas' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Grupos y lotes' })).toBeInTheDocument()
  })

  it('también se abre solo al entrar directo a /catalogos/grupos-y-lotes', () => {
    renderBarraLateral('/catalogos/grupos-y-lotes')

    const boton = screen.getByRole('button', { name: 'Catálogos' })
    expect(boton).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('link', { name: 'Grupos y lotes' })).toBeInTheDocument()
  })

  it('un clic lo abre (y muestra el enlace a Razas); otro clic lo cierra', async () => {
    const usuario = userEvent.setup()
    renderBarraLateral('/animales')

    const boton = screen.getByRole('button', { name: 'Catálogos' })
    await usuario.click(boton)
    expect(boton).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('link', { name: 'Razas' })).toBeInTheDocument()

    await usuario.click(boton)
    expect(boton).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('link', { name: 'Razas' })).not.toBeInTheDocument()
  })

  it('es operable por teclado (foco + Enter) y no quita los accesos existentes', async () => {
    const usuario = userEvent.setup()
    renderBarraLateral('/animales')

    expect(screen.getByRole('link', { name: /Animales/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Pesajes/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Reportes/ })).toBeInTheDocument()

    const boton = screen.getByRole('button', { name: 'Catálogos' })
    boton.focus()
    await usuario.keyboard('{Enter}')

    expect(boton).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('link', { name: 'Razas' })).toBeInTheDocument()
  })
})
