import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { peticionProtegida } from '../../api/cliente'
import ModalFormularioPersona from './ModalFormularioPersona'

vi.mock('../../api/cliente', () => ({
  peticionProtegida: vi.fn(),
  ErrorHttp: class ErrorHttp extends Error {
    constructor(estado, mensaje) {
      super(mensaje)
      this.estado = estado
    }
  },
}))

const PERSONA = {
  perId: 1,
  perNombre: 'Juan',
  perApellido: 'Pérez',
  perTipo: 'PROPIETARIO',
  perCi: '1234567',
  perRuc: '80000000-1',
  perTelefono: '0981000000',
  perCorreo: 'juan@test.com',
  perDireccion: 'Calle 123',
}

async function completarMinimo(usuario) {
  await usuario.type(screen.getByLabelText('Nombre'), 'Ana')
  await usuario.selectOptions(screen.getByLabelText('Tipo'), 'EMPLEADO')
}

describe('ModalFormularioPersona', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('crea una persona nueva con los datos ingresados', async () => {
    const usuario = userEvent.setup()
    const onGuardado = vi.fn()
    peticionProtegida.mockResolvedValue({ perId: 9, perNombre: 'Ana', perTipo: 'EMPLEADO' })

    render(<ModalFormularioPersona persona={null} onCerrar={vi.fn()} onGuardado={onGuardado} />)

    await completarMinimo(usuario)
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(peticionProtegida).toHaveBeenCalledWith('/api/personas', {
      method: 'POST',
      body: JSON.stringify({
        perNombre: 'Ana',
        perApellido: '',
        perTipo: 'EMPLEADO',
        perCi: '',
        perRuc: '',
        perTelefono: '',
        perCorreo: '',
        perDireccion: '',
      }),
    })
    expect(onGuardado).toHaveBeenCalledWith({ perId: 9, perNombre: 'Ana', perTipo: 'EMPLEADO' }, false)
  })

  it('valida en el cliente: nombre y tipo vacíos no llaman al servidor', async () => {
    const usuario = userEvent.setup()
    render(<ModalFormularioPersona persona={null} onCerrar={vi.fn()} onGuardado={vi.fn()} />)

    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(screen.getByText('Ingresá el nombre')).toBeInTheDocument()
    expect(screen.getAllByRole('alert').map((elemento) => elemento.textContent)).toContain('Elegí un tipo')
    expect(peticionProtegida).not.toHaveBeenCalled()
  })

  it('valida en el cliente: un correo sin formato válido no llama al servidor', async () => {
    const usuario = userEvent.setup()
    render(<ModalFormularioPersona persona={null} onCerrar={vi.fn()} onGuardado={vi.fn()} />)

    await completarMinimo(usuario)
    await usuario.type(screen.getByLabelText('Correo'), 'no-es-un-correo')
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(screen.getByText('El correo no tiene un formato válido')).toBeInTheDocument()
    expect(peticionProtegida).not.toHaveBeenCalled()
  })

  it('edita una persona existente con PUT a su id', async () => {
    const usuario = userEvent.setup()
    const onGuardado = vi.fn()
    peticionProtegida.mockResolvedValue({ ...PERSONA, perApellido: 'Pérez Benítez' })

    render(<ModalFormularioPersona persona={PERSONA} onCerrar={vi.fn()} onGuardado={onGuardado} />)

    const campoApellido = screen.getByLabelText('Apellido')
    await usuario.clear(campoApellido)
    await usuario.type(campoApellido, 'Pérez Benítez')
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(peticionProtegida).toHaveBeenCalledWith('/api/personas/1', {
      method: 'PUT',
      body: JSON.stringify({
        perNombre: 'Juan',
        perApellido: 'Pérez Benítez',
        perTipo: 'PROPIETARIO',
        perCi: '1234567',
        perRuc: '80000000-1',
        perTelefono: '0981000000',
        perCorreo: 'juan@test.com',
        perDireccion: 'Calle 123',
      }),
    })
    expect(onGuardado).toHaveBeenCalledWith({ ...PERSONA, perApellido: 'Pérez Benítez' }, true)
  })

  it('un 409 del servidor con "la CI" se muestra bajo el campo CI', async () => {
    const usuario = userEvent.setup()
    const { ErrorHttp } = await import('../../api/cliente')
    peticionProtegida.mockRejectedValue(new ErrorHttp(409, 'Ya existe una persona con la CI 1234567'))

    render(<ModalFormularioPersona persona={null} onCerrar={vi.fn()} onGuardado={vi.fn()} />)

    await completarMinimo(usuario)
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(await screen.findByText('Ya existe una persona con la CI 1234567')).toBeInTheDocument()
    expect(screen.getByLabelText('CI')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByLabelText('RUC')).toHaveAttribute('aria-invalid', 'false')
  })

  it('un 409 del servidor con "el RUC" se muestra bajo el campo RUC', async () => {
    const usuario = userEvent.setup()
    const { ErrorHttp } = await import('../../api/cliente')
    peticionProtegida.mockRejectedValue(new ErrorHttp(409, 'Ya existe una persona con el RUC 80000000-1'))

    render(<ModalFormularioPersona persona={null} onCerrar={vi.fn()} onGuardado={vi.fn()} />)

    await completarMinimo(usuario)
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(await screen.findByText('Ya existe una persona con el RUC 80000000-1')).toBeInTheDocument()
    expect(screen.getByLabelText('RUC')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByLabelText('CI')).toHaveAttribute('aria-invalid', 'false')
  })

  it('un 400 genérico del servidor se muestra como error general', async () => {
    const usuario = userEvent.setup()
    const { ErrorHttp } = await import('../../api/cliente')
    peticionProtegida.mockRejectedValue(new ErrorHttp(400, 'Falta el campo nombre'))

    render(<ModalFormularioPersona persona={null} onCerrar={vi.fn()} onGuardado={vi.fn()} />)

    await completarMinimo(usuario)
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(await screen.findByText('Falta el campo nombre')).toBeInTheDocument()
  })
})
