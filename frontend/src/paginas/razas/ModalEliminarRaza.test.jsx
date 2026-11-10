import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { peticionProtegida } from '../../api/cliente'
import ModalEliminarRaza from './ModalEliminarRaza'

vi.mock('../../api/cliente', () => ({
  peticionProtegida: vi.fn(),
  ErrorHttp: class ErrorHttp extends Error {
    constructor(estado, mensaje) {
      super(mensaje)
      this.estado = estado
    }
  },
}))

const RAZA = { rzId: 1, rzDescripcion: 'Brangus', rzPesoObjetivoVenta: 450, cantidadAnimales: 0 }

describe('ModalEliminarRaza', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('al confirmar, elimina la raza y avisa', async () => {
    const usuario = userEvent.setup()
    const onEliminado = vi.fn()
    peticionProtegida.mockResolvedValue(null)

    render(<ModalEliminarRaza raza={RAZA} onCerrar={vi.fn()} onEliminado={onEliminado} onYaNoExiste={vi.fn()} />)

    await usuario.click(screen.getByRole('button', { name: 'Eliminar' }))

    expect(peticionProtegida).toHaveBeenCalledWith('/api/razas/1', { method: 'DELETE' })
    expect(onEliminado).toHaveBeenCalledWith('Brangus')
  })

  it('un 409 del servidor (tiene animales) se muestra dentro del modal, sin cerrar', async () => {
    const usuario = userEvent.setup()
    const onEliminado = vi.fn()
    const { ErrorHttp } = await import('../../api/cliente')
    peticionProtegida.mockRejectedValue(new ErrorHttp(409, 'No se puede eliminar la raza: tiene 2 animales'))

    render(<ModalEliminarRaza raza={RAZA} onCerrar={vi.fn()} onEliminado={onEliminado} onYaNoExiste={vi.fn()} />)

    await usuario.click(screen.getByRole('button', { name: 'Eliminar' }))

    expect(await screen.findByText('No se puede eliminar la raza: tiene 2 animales')).toBeInTheDocument()
    expect(onEliminado).not.toHaveBeenCalled()
  })

  it('un 404 del servidor (ya no existe) avisa que se actualizó el listado', async () => {
    const usuario = userEvent.setup()
    const onYaNoExiste = vi.fn()
    const { ErrorHttp } = await import('../../api/cliente')
    peticionProtegida.mockRejectedValue(new ErrorHttp(404, 'Raza no encontrada con id: 1'))

    render(<ModalEliminarRaza raza={RAZA} onCerrar={vi.fn()} onEliminado={vi.fn()} onYaNoExiste={onYaNoExiste} />)

    await usuario.click(screen.getByRole('button', { name: 'Eliminar' }))

    expect(onYaNoExiste).toHaveBeenCalled()
  })
})
