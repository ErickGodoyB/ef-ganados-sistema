import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { peticionProtegida } from '../../api/cliente'
import Personas from '../Personas'
import { motivosBloqueo } from './listadoPersonas'
import TablaPersonas from './TablaPersonas'
import TarjetaPersona from './TarjetaPersona'

vi.mock('../../api/cliente', () => ({
  peticionProtegida: vi.fn(),
  ErrorHttp: class ErrorHttp extends Error {},
}))

const PROVEEDOR = {
  perId: 7,
  perNombre: 'Pedro',
  perApellido: 'Vera',
  perTipo: 'PROVEEDOR',
  perCi: '7777777',
  perTelefono: '0987777777',
  cantidadAnimales: 0,
  cantidadComoComprador: 0,
  cantidadComoProveedor: 3,
  cantidadPesajes: 0,
  tieneUsuario: false,
}

const PROVEEDOR_LIBRE = { ...PROVEEDOR, perId: 8, perNombre: 'Rosa', cantidadComoProveedor: 0 }

const PROPIETARIO = {
  perId: 1,
  perNombre: 'Juan',
  perApellido: 'Pérez',
  perTipo: 'PROPIETARIO',
  cantidadAnimales: 0,
  cantidadComoProveedor: 0,
  cantidadPesajes: 0,
  tieneUsuario: false,
}

const ORDEN = { campo: 'nombreCompleto', direccion: 'asc' }

afterEach(() => {
  vi.restoreAllMocks()
})

describe('Personas: tipo PROVEEDOR', () => {
  it('la tabla muestra la etiqueta "Proveedor" y cuántos animales provee', () => {
    render(
      <TablaPersonas
        personas={[PROVEEDOR]}
        orden={ORDEN}
        onOrdenar={vi.fn()}
        onEditar={vi.fn()}
        onEliminar={vi.fn()}
      />,
    )

    expect(screen.getByRole('columnheader', { name: 'Proveedor de' })).toBeInTheDocument()
    const fila = screen.getByText('Pedro Vera').closest('tr')
    expect(within(fila).getByText('Proveedor')).toBeInTheDocument()
    expect(within(fila).getByText('3')).toBeInTheDocument()
  })

  it('un proveedor con animales tiene Eliminar deshabilitado con el aviso correspondiente', () => {
    render(
      <TablaPersonas
        personas={[PROVEEDOR]}
        orden={ORDEN}
        onOrdenar={vi.fn()}
        onEditar={vi.fn()}
        onEliminar={vi.fn()}
      />,
    )

    const fila = screen.getByText('Pedro Vera').closest('tr')
    expect(within(fila).getByRole('button', { name: 'Eliminar' })).toBeDisabled()
    expect(within(fila).getByText('Es proveedor de 3 animales')).toBeInTheDocument()
  })

  it('un proveedor sin animales se puede eliminar', () => {
    render(
      <TablaPersonas
        personas={[PROVEEDOR_LIBRE]}
        orden={ORDEN}
        onOrdenar={vi.fn()}
        onEditar={vi.fn()}
        onEliminar={vi.fn()}
      />,
    )

    const fila = screen.getByText('Rosa Vera').closest('tr')
    expect(within(fila).getByRole('button', { name: 'Eliminar' })).not.toBeDisabled()
  })

  it('la tarjeta muestra la cantidad y bloquea Eliminar con el mismo aviso', () => {
    render(<TarjetaPersona persona={PROVEEDOR} onEditar={vi.fn()} onEliminar={vi.fn()} />)

    expect(screen.getByText('Proveedor de')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Eliminar' })).toBeDisabled()
    expect(screen.getByText('Es proveedor de 3 animales')).toBeInTheDocument()
  })

  it('motivosBloqueo combina "proveedor" con los demás motivos, en el orden del backend', () => {
    expect(motivosBloqueo({ ...PROVEEDOR, cantidadAnimales: 1, cantidadPesajes: 2, tieneUsuario: true })).toEqual([
      'es dueña de 1 animales',
      'es proveedor de 3 animales',
      'figura en 2 pesajes',
      'tiene un usuario de acceso',
    ])
  })

  it('motivosBloqueo suma "responsable de N transferencias" después de los pesajes y antes del usuario', () => {
    expect(
      motivosBloqueo({
        ...PROPIETARIO,
        cantidadPesajes: 2,
        cantidadTransferencias: 4,
        tieneUsuario: true,
      }),
    ).toEqual(['figura en 2 pesajes', 'figura como responsable de 4 transferencias', 'tiene un usuario de acceso'])
  })

  it('una persona responsable de transferencias tiene Eliminar deshabilitado con el aviso', () => {
    render(
      <TablaPersonas
        personas={[{ ...PROPIETARIO, cantidadTransferencias: 3 }]}
        orden={ORDEN}
        onOrdenar={vi.fn()}
        onEditar={vi.fn()}
        onEliminar={vi.fn()}
      />,
    )

    const fila = screen.getByText('Juan Pérez').closest('tr')
    expect(within(fila).getByRole('button', { name: 'Eliminar' })).toBeDisabled()
    expect(within(fila).getByText('Figura como responsable de 3 transferencias')).toBeInTheDocument()
  })

  it('el filtro por tipo ofrece "Proveedores" y deja solo a los proveedores', async () => {
    const usuario = userEvent.setup()
    peticionProtegida.mockResolvedValue([PROPIETARIO, PROVEEDOR])

    render(<Personas />)
    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument())

    const filtroTipo = screen.getByLabelText('Tipo')
    expect(within(filtroTipo).getByRole('option', { name: 'Proveedores' })).toBeInTheDocument()

    await usuario.selectOptions(filtroTipo, 'PROVEEDOR')

    expect(screen.getAllByText('Pedro Vera').length).toBeGreaterThan(0)
    expect(screen.queryByText('Juan Pérez')).not.toBeInTheDocument()
  })
})
