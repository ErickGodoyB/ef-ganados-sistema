import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { peticionProtegida } from '../../api/cliente'
import ModalFormularioLote from './ModalFormularioLote'

vi.mock('../../api/cliente', () => ({
  peticionProtegida: vi.fn(),
  ErrorHttp: class ErrorHttp extends Error {
    constructor(estado, mensaje) {
      super(mensaje)
      this.estado = estado
    }
  },
}))

const GRUPOS = [
  { grpId: 1, grpDescripcion: 'Invernada' },
  { grpId: 2, grpDescripcion: 'Engorde' },
]
const LOTE = { sbId: 5, sbDescripcion: 'Lote 1' }

describe('ModalFormularioLote', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('crea un lote nuevo con el grupo preseleccionado ("Agregar lote" de un grupo puntual)', async () => {
    const usuario = userEvent.setup()
    const onGuardado = vi.fn()
    peticionProtegida.mockResolvedValue({ sbId: 9, sbDescripcion: 'Lote 2', grupo: { grpId: 1 } })

    render(
      <ModalFormularioLote
        lote={null}
        grupoInicialId={1}
        grupos={GRUPOS}
        onCerrar={vi.fn()}
        onGuardado={onGuardado}
      />,
    )

    expect(screen.getByLabelText('Grupo')).toHaveValue('1')

    await usuario.type(screen.getByLabelText('Descripción'), 'Lote 2')
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(peticionProtegida).toHaveBeenCalledWith('/api/subgrupos', {
      method: 'POST',
      body: JSON.stringify({ sbDescripcion: 'Lote 2', grupo: { grpId: 1 } }),
    })
    expect(onGuardado).toHaveBeenCalledWith({ sbId: 9, sbDescripcion: 'Lote 2', grupo: { grpId: 1 } }, false)
  })

  it('valida en el cliente: descripción y grupo vacíos no llaman al servidor', async () => {
    const usuario = userEvent.setup()
    render(<ModalFormularioLote lote={null} grupoInicialId={null} grupos={GRUPOS} onCerrar={vi.fn()} onGuardado={vi.fn()} />)

    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(screen.getByText('Ingresá la descripción del lote')).toBeInTheDocument()
    expect(screen.getAllByRole('alert').map((elemento) => elemento.textContent)).toContain('Elegí un grupo')
    expect(peticionProtegida).not.toHaveBeenCalled()
  })

  it('al editar, cambiar de grupo manda el nuevo grpId en el PUT', async () => {
    const usuario = userEvent.setup()
    const onGuardado = vi.fn()
    peticionProtegida.mockResolvedValue({ sbId: 5, sbDescripcion: 'Lote 1', grupo: { grpId: 2 } })

    render(
      <ModalFormularioLote
        lote={LOTE}
        grupoInicialId={1}
        grupos={GRUPOS}
        onCerrar={vi.fn()}
        onGuardado={onGuardado}
      />,
    )

    expect(screen.getByLabelText('Grupo')).toHaveValue('1')
    await usuario.selectOptions(screen.getByLabelText('Grupo'), '2')
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(peticionProtegida).toHaveBeenCalledWith('/api/subgrupos/5', {
      method: 'PUT',
      body: JSON.stringify({ sbDescripcion: 'Lote 1', grupo: { grpId: 2 } }),
    })
    expect(onGuardado).toHaveBeenCalledWith({ sbId: 5, sbDescripcion: 'Lote 1', grupo: { grpId: 2 } }, true)
  })

  it('un 409 del servidor (descripción duplicada en el grupo) se muestra bajo el campo Descripción', async () => {
    const usuario = userEvent.setup()
    const { ErrorHttp } = await import('../../api/cliente')
    peticionProtegida.mockRejectedValue(
      new ErrorHttp(409, 'Ya existe un lote con la descripción Lote 1 en el grupo Invernada'),
    )

    render(
      <ModalFormularioLote lote={null} grupoInicialId={1} grupos={GRUPOS} onCerrar={vi.fn()} onGuardado={vi.fn()} />,
    )

    await usuario.type(screen.getByLabelText('Descripción'), 'Lote 1')
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(
      await screen.findByText('Ya existe un lote con la descripción Lote 1 en el grupo Invernada'),
    ).toBeInTheDocument()
  })

  it('un 404 del servidor (el grupo ya no existe) se muestra como error general', async () => {
    const usuario = userEvent.setup()
    const { ErrorHttp } = await import('../../api/cliente')
    peticionProtegida.mockRejectedValue(new ErrorHttp(404, 'Grupo no encontrado con id: 1'))

    render(
      <ModalFormularioLote lote={null} grupoInicialId={1} grupos={GRUPOS} onCerrar={vi.fn()} onGuardado={vi.fn()} />,
    )

    await usuario.type(screen.getByLabelText('Descripción'), 'Lote 1')
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(await screen.findByText('Grupo no encontrado con id: 1')).toBeInTheDocument()
  })
})
