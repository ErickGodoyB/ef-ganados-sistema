import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { peticionProtegida } from '../../api/cliente'
import ModalFormularioGrupo from './ModalFormularioGrupo'

vi.mock('../../api/cliente', () => ({
  peticionProtegida: vi.fn(),
  ErrorHttp: class ErrorHttp extends Error {
    constructor(estado, mensaje) {
      super(mensaje)
      this.estado = estado
    }
  },
}))

const GRUPO = { grpId: 1, grpDescripcion: 'Invernada' }

describe('ModalFormularioGrupo', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('crea un grupo nuevo con la descripción ingresada', async () => {
    const usuario = userEvent.setup()
    const onGuardado = vi.fn()
    peticionProtegida.mockResolvedValue({ grpId: 9, grpDescripcion: 'Engorde' })

    render(<ModalFormularioGrupo grupo={null} onCerrar={vi.fn()} onGuardado={onGuardado} />)

    await usuario.type(screen.getByLabelText('Descripción'), 'Engorde')
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(peticionProtegida).toHaveBeenCalledWith('/api/grupos', {
      method: 'POST',
      body: JSON.stringify({ grpDescripcion: 'Engorde' }),
    })
    expect(onGuardado).toHaveBeenCalledWith({ grpId: 9, grpDescripcion: 'Engorde' }, false)
  })

  it('valida en el cliente: descripción vacía no llama al servidor', async () => {
    const usuario = userEvent.setup()
    render(<ModalFormularioGrupo grupo={null} onCerrar={vi.fn()} onGuardado={vi.fn()} />)

    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(screen.getByText('Ingresá la descripción del grupo')).toBeInTheDocument()
    expect(peticionProtegida).not.toHaveBeenCalled()
  })

  it('edita un grupo existente con PUT a su id', async () => {
    const usuario = userEvent.setup()
    const onGuardado = vi.fn()
    peticionProtegida.mockResolvedValue({ grpId: 1, grpDescripcion: 'Invernada 2026' })

    render(<ModalFormularioGrupo grupo={GRUPO} onCerrar={vi.fn()} onGuardado={onGuardado} />)

    const campo = screen.getByLabelText('Descripción')
    await usuario.clear(campo)
    await usuario.type(campo, 'Invernada 2026')
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(peticionProtegida).toHaveBeenCalledWith('/api/grupos/1', {
      method: 'PUT',
      body: JSON.stringify({ grpDescripcion: 'Invernada 2026' }),
    })
    expect(onGuardado).toHaveBeenCalledWith({ grpId: 1, grpDescripcion: 'Invernada 2026' }, true)
  })

  it('un 409 del servidor (descripción duplicada) se muestra dentro del modal', async () => {
    const usuario = userEvent.setup()
    const { ErrorHttp } = await import('../../api/cliente')
    peticionProtegida.mockRejectedValue(new ErrorHttp(409, 'Ya existe un grupo con la descripción Invernada'))

    render(<ModalFormularioGrupo grupo={null} onCerrar={vi.fn()} onGuardado={vi.fn()} />)

    await usuario.type(screen.getByLabelText('Descripción'), 'Invernada')
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(await screen.findByText('Ya existe un grupo con la descripción Invernada')).toBeInTheDocument()
  })
})
