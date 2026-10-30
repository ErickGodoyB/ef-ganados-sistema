import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { peticionProtegida } from '../api/cliente'
import { useAuth } from '../auth/useAuth'
import Cuenta from './Cuenta'

vi.mock('../auth/useAuth', () => ({
  useAuth: vi.fn(),
}))

vi.mock('../api/cliente', () => ({
  peticionProtegida: vi.fn(),
  ErrorHttp: class ErrorHttp extends Error {
    constructor(estado, mensaje) {
      super(mensaje)
      this.estado = estado
    }
  },
}))

function mockearAuth(datos = {}) {
  useAuth.mockReturnValue({
    usuario: { usuNombre: 'jperez' },
    personaNombre: 'Juan Pérez',
    cargandoYo: false,
    errorYo: '',
    ...datos,
  })
}

async function completarFormulario(usuario, { actual, nueva, confirmacion }) {
  await usuario.type(screen.getByLabelText('Clave actual'), actual)
  await usuario.type(screen.getByLabelText('Clave nueva'), nueva)
  await usuario.type(screen.getByLabelText('Confirmar clave nueva'), confirmacion)
}

describe('Cuenta', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('muestra el usuario y la persona de la cuenta', () => {
    mockearAuth()
    render(<Cuenta />)
    expect(screen.getByText('jperez')).toBeInTheDocument()
    expect(screen.getByText('Juan Pérez')).toBeInTheDocument()
  })

  it('cambia la clave, muestra "Clave actualizada" y limpia el formulario', async () => {
    const usuario = userEvent.setup()
    mockearAuth()
    peticionProtegida.mockResolvedValue(null)
    render(<Cuenta />)

    await completarFormulario(usuario, { actual: 'vieja123', nueva: 'nueva123', confirmacion: 'nueva123' })
    await usuario.click(screen.getByRole('button', { name: 'Cambiar clave' }))

    expect(await screen.findByText('Clave actualizada')).toBeInTheDocument()
    expect(peticionProtegida).toHaveBeenCalledWith('/api/auth/clave', {
      method: 'PUT',
      body: JSON.stringify({ claveActual: 'vieja123', claveNueva: 'nueva123' }),
    })
    expect(screen.getByLabelText('Clave actual')).toHaveValue('')
    expect(screen.getByLabelText('Clave nueva')).toHaveValue('')
    expect(screen.getByLabelText('Confirmar clave nueva')).toHaveValue('')
  })

  it('si las claves no coinciden, no llama al servidor y muestra el error local', async () => {
    const usuario = userEvent.setup()
    mockearAuth()
    render(<Cuenta />)

    await completarFormulario(usuario, { actual: 'vieja123', nueva: 'nueva123', confirmacion: 'otra456' })
    await usuario.click(screen.getByRole('button', { name: 'Cambiar clave' }))

    expect(screen.getByText('Las claves no coinciden')).toBeInTheDocument()
    expect(peticionProtegida).not.toHaveBeenCalled()
  })

  it('una clave nueva corta no llama al servidor y muestra el error local', async () => {
    const usuario = userEvent.setup()
    mockearAuth()
    render(<Cuenta />)

    await completarFormulario(usuario, { actual: 'vieja123', nueva: 'ab', confirmacion: 'ab' })
    await usuario.click(screen.getByRole('button', { name: 'Cambiar clave' }))

    expect(screen.getByText('Debe tener al menos 5 caracteres')).toBeInTheDocument()
    expect(peticionProtegida).not.toHaveBeenCalled()
  })

  it('400 del servidor (clave actual incorrecta) se muestra bajo el formulario sin cerrar sesión', async () => {
    const usuario = userEvent.setup()
    mockearAuth()
    const { ErrorHttp } = await import('../api/cliente')
    peticionProtegida.mockRejectedValue(new ErrorHttp(400, 'La clave actual no es correcta'))
    render(<Cuenta />)

    await completarFormulario(usuario, { actual: 'mala', nueva: 'nueva123', confirmacion: 'nueva123' })
    await usuario.click(screen.getByRole('button', { name: 'Cambiar clave' }))

    expect(await screen.findByText('La clave actual no es correcta')).toBeInTheDocument()
    // El formulario no se limpia tras un error: la persona puede corregir sin volver a tipear todo.
    expect(screen.getByLabelText('Clave actual')).toHaveValue('mala')
  })

  it('muestra el botón para mostrar/ocultar cada campo de clave de forma independiente', async () => {
    const usuario = userEvent.setup()
    mockearAuth()
    render(<Cuenta />)

    const claveActual = screen.getByLabelText('Clave actual')
    expect(claveActual).toHaveAttribute('type', 'password')
    await usuario.click(screen.getByRole('button', { name: 'Mostrar clave actual' }))
    expect(claveActual).toHaveAttribute('type', 'text')
    expect(screen.getByLabelText('Clave nueva')).toHaveAttribute('type', 'password')
  })
})
