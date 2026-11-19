import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { peticionProtegida } from '../api/cliente'
import Pesajes from './Pesajes'

vi.mock('../api/cliente', () => ({
  peticionProtegida: vi.fn(),
  ErrorHttp: class ErrorHttp extends Error {},
}))

beforeEach(() => {
  localStorage.clear()
  peticionProtegida.mockResolvedValue([])
})

afterEach(() => {
  vi.restoreAllMocks()
})

async function renderizar(ruta) {
  render(
    <MemoryRouter initialEntries={[ruta]}>
      <Pesajes />
    </MemoryRouter>,
  )
  await waitFor(() => expect(peticionProtegida).toHaveBeenCalled())
}

describe('Pesajes: ?fecha= en la URL', () => {
  it('precarga el Intervalo con ese único día (llegada desde el calendario de Inicio)', async () => {
    await renderizar('/pesajes?fecha=2026-11-18')

    expect(screen.getByRole('button', { name: '18/11 – 18/11' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Quitar el filtro de intervalo' })).toBeInTheDocument()
  })

  it('una fecha con formato inválido se ignora', async () => {
    await renderizar('/pesajes?fecha=mañana')

    expect(screen.queryByRole('button', { name: 'Quitar el filtro de intervalo' })).not.toBeInTheDocument()
  })

  it('sin el parámetro no hay intervalo aplicado', async () => {
    await renderizar('/pesajes')

    expect(screen.queryByRole('button', { name: 'Quitar el filtro de intervalo' })).not.toBeInTheDocument()
  })
})
