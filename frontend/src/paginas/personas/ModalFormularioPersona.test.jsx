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

  it('el campo Teléfono filtra las letras al escribir o pegar', async () => {
    const usuario = userEvent.setup()
    render(<ModalFormularioPersona persona={null} onCerrar={vi.fn()} onGuardado={vi.fn()} />)

    const campoTelefono = screen.getByLabelText('Teléfono')
    expect(campoTelefono).toHaveAttribute('inputMode', 'tel')

    await usuario.type(campoTelefono, '09ab81-ab111222')

    expect(campoTelefono).toHaveValue('0981-111222')
  })

  it('valida en el cliente: un teléfono con menos de 6 números no llama al servidor', async () => {
    const usuario = userEvent.setup()
    render(<ModalFormularioPersona persona={null} onCerrar={vi.fn()} onGuardado={vi.fn()} />)

    await completarMinimo(usuario)
    await usuario.type(screen.getByLabelText('Teléfono'), '12345')
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(screen.getByText('El teléfono debe tener al menos 6 números')).toBeInTheDocument()
    expect(peticionProtegida).not.toHaveBeenCalled()
  })

  it('valida en el cliente: un teléfono de más de 20 caracteres no llama al servidor', async () => {
    const usuario = userEvent.setup()
    render(<ModalFormularioPersona persona={null} onCerrar={vi.fn()} onGuardado={vi.fn()} />)

    await completarMinimo(usuario)
    await usuario.type(screen.getByLabelText('Teléfono'), '0'.repeat(21))
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(screen.getByText('El teléfono no puede tener más de 20 caracteres')).toBeInTheDocument()
    expect(peticionProtegida).not.toHaveBeenCalled()
  })

  it('un teléfono válido con +595, espacios y guiones llama al servidor', async () => {
    const usuario = userEvent.setup()
    peticionProtegida.mockResolvedValue({ perId: 9, perNombre: 'Ana', perTipo: 'EMPLEADO' })

    render(<ModalFormularioPersona persona={null} onCerrar={vi.fn()} onGuardado={vi.fn()} />)

    await completarMinimo(usuario)
    await usuario.type(screen.getByLabelText('Teléfono'), '+595 981-123456')
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(peticionProtegida).toHaveBeenCalledWith(
      '/api/personas',
      expect.objectContaining({ body: expect.stringContaining('"perTelefono":"+595 981-123456"') }),
    )
  })

  it('un teléfono inválido ya cargado (editando) se revalida igual, sin depender del filtro de escritura', async () => {
    const usuario = userEvent.setup()
    render(
      <ModalFormularioPersona
        persona={{ ...PERSONA, perTelefono: '098-abc-1234' }}
        onCerrar={vi.fn()}
        onGuardado={vi.fn()}
      />,
    )

    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(
      screen.getByText('El teléfono solo puede tener números, espacios y los símbolos + - ( )'),
    ).toBeInTheDocument()
    expect(peticionProtegida).not.toHaveBeenCalled()
  })

  it('valida en el cliente: una CI con caracteres inválidos no llama al servidor', async () => {
    const usuario = userEvent.setup()
    render(<ModalFormularioPersona persona={null} onCerrar={vi.fn()} onGuardado={vi.fn()} />)

    await completarMinimo(usuario)
    await usuario.type(screen.getByLabelText('CI'), '123@456')
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(screen.getByText('La CI solo puede tener letras, números, puntos, guiones y espacios')).toBeInTheDocument()
    expect(peticionProtegida).not.toHaveBeenCalled()
  })

  it('valida en el cliente: un RUC de más de 20 caracteres no llama al servidor', async () => {
    const usuario = userEvent.setup()
    render(<ModalFormularioPersona persona={null} onCerrar={vi.fn()} onGuardado={vi.fn()} />)

    await completarMinimo(usuario)
    await usuario.type(screen.getByLabelText('RUC'), '1'.repeat(21))
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(screen.getByText('El RUC no puede tener más de 20 caracteres')).toBeInTheDocument()
    expect(peticionProtegida).not.toHaveBeenCalled()
  })

  it('una CI válida con puntos y guiones llama al servidor', async () => {
    const usuario = userEvent.setup()
    peticionProtegida.mockResolvedValue({ perId: 9, perNombre: 'Ana', perTipo: 'EMPLEADO' })

    render(<ModalFormularioPersona persona={null} onCerrar={vi.fn()} onGuardado={vi.fn()} />)

    await completarMinimo(usuario)
    await usuario.type(screen.getByLabelText('CI'), '1.234.567-8')
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(peticionProtegida).toHaveBeenCalledWith(
      '/api/personas',
      expect.objectContaining({ body: expect.stringContaining('"perCi":"1.234.567-8"') }),
    )
  })

  it('un 400 del servidor por formato de teléfono se muestra bajo el campo Teléfono', async () => {
    const usuario = userEvent.setup()
    const { ErrorHttp } = await import('../../api/cliente')
    peticionProtegida.mockRejectedValue(
      new ErrorHttp(400, 'El teléfono debe tener al menos 6 números'),
    )

    render(<ModalFormularioPersona persona={null} onCerrar={vi.fn()} onGuardado={vi.fn()} />)

    await completarMinimo(usuario)
    await usuario.type(screen.getByLabelText('Teléfono'), '123456')
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(await screen.findByText('El teléfono debe tener al menos 6 números')).toBeInTheDocument()
    expect(screen.getByLabelText('Teléfono')).toHaveAttribute('aria-invalid', 'true')
  })
})
