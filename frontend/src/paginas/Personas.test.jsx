import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { peticionProtegida } from '../api/cliente'
import Personas from './Personas'

vi.mock('../api/cliente', () => ({
  peticionProtegida: vi.fn(),
  ErrorHttp: class ErrorHttp extends Error {
    constructor(estado, mensaje) {
      super(mensaje)
      this.estado = estado
    }
  },
}))

const PROPIETARIO = {
  perId: 1,
  perNombre: 'Juan',
  perApellido: 'Pérez',
  perTipo: 'PROPIETARIO',
  perCi: '1111111',
  perTelefono: '0981111111',
  cantidadAnimales: 0,
  cantidadPesajes: 0,
  tieneUsuario: false,
}

const EMPLEADO = {
  perId: 2,
  perNombre: 'Ana',
  perApellido: 'Gómez',
  perTipo: 'EMPLEADO',
  perCi: '2222222',
  perTelefono: '0982222222',
  cantidadAnimales: 0,
  cantidadPesajes: 0,
  tieneUsuario: false,
}

describe('Personas: filtro por tipo', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('"Todos" muestra ambas personas; "Propietarios" y "Empleados" filtran a cada una', async () => {
    const usuario = userEvent.setup()
    peticionProtegida.mockResolvedValue([PROPIETARIO, EMPLEADO])

    render(<Personas />)

    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument())
    expect(screen.getAllByText('Juan Pérez').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Ana Gómez').length).toBeGreaterThan(0)

    const filtroTipo = screen.getByLabelText('Tipo')
    await usuario.selectOptions(filtroTipo, 'PROPIETARIO')

    expect(screen.getAllByText('Juan Pérez').length).toBeGreaterThan(0)
    expect(screen.queryByText('Ana Gómez')).not.toBeInTheDocument()

    await usuario.selectOptions(filtroTipo, 'EMPLEADO')

    expect(screen.queryByText('Juan Pérez')).not.toBeInTheDocument()
    expect(screen.getAllByText('Ana Gómez').length).toBeGreaterThan(0)

    await usuario.selectOptions(filtroTipo, 'todos')

    expect(screen.getAllByText('Juan Pérez').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Ana Gómez').length).toBeGreaterThan(0)
  })

  it('el filtro "Propietarios" sin coincidencias muestra el estado vacío con "Limpiar filtros"', async () => {
    const usuario = userEvent.setup()
    peticionProtegida.mockResolvedValue([EMPLEADO])

    render(<Personas />)

    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument())

    await usuario.selectOptions(screen.getByLabelText('Tipo'), 'PROPIETARIO')

    expect(screen.getByText('No hay personas que coincidan')).toBeInTheDocument()
    await usuario.click(screen.getByRole('button', { name: 'Limpiar filtros' }))

    expect(screen.getAllByText('Ana Gómez').length).toBeGreaterThan(0)
  })
})
