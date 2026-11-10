import { render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import TablaPersonas from './TablaPersonas'

const PERSONA_LIBRE = {
  perId: 1,
  perNombre: 'Ana',
  perApellido: 'Gómez',
  perTipo: 'EMPLEADO',
  perCi: '1111111',
  perTelefono: '0981111111',
  cantidadAnimales: 0,
  cantidadPesajes: 0,
  tieneUsuario: false,
}

const PERSONA_DUENIA = {
  perId: 2,
  perNombre: 'Juan',
  perApellido: 'Pérez',
  perTipo: 'PROPIETARIO',
  perCi: '2222222',
  perTelefono: '0982222222',
  cantidadAnimales: 2,
  cantidadPesajes: 0,
  tieneUsuario: false,
}

const PERSONA_CON_TODO = {
  perId: 3,
  perNombre: 'Carlos',
  perApellido: 'Díaz',
  perTipo: 'EMPLEADO',
  perCi: '3333333',
  perTelefono: '0983333333',
  cantidadAnimales: 1,
  cantidadPesajes: 5,
  tieneUsuario: true,
}

const ORDEN = { campo: 'nombreCompleto', direccion: 'asc' }

function renderTabla(personas) {
  return render(
    <TablaPersonas personas={personas} orden={ORDEN} onOrdenar={vi.fn()} onEditar={vi.fn()} onEliminar={vi.fn()} />,
  )
}

describe('TablaPersonas: eliminar deshabilitado', () => {
  it('una persona libre (sin animales, pesajes ni usuario) tiene Eliminar habilitado y sin aviso', () => {
    renderTabla([PERSONA_LIBRE])

    const fila = screen.getByText('Ana Gómez').closest('tr')
    const botonEliminar = within(fila).getByRole('button', { name: 'Eliminar' })
    expect(botonEliminar).not.toBeDisabled()
    expect(within(fila).queryByText(/animales|pesajes|usuario/)).not.toBeInTheDocument()
  })

  it('una persona dueña de animales tiene Eliminar deshabilitado con una explicación visible', () => {
    renderTabla([PERSONA_DUENIA])

    const fila = screen.getByText('Juan Pérez').closest('tr')
    const botonEliminar = within(fila).getByRole('button', { name: 'Eliminar' })
    expect(botonEliminar).toBeDisabled()
    expect(within(fila).getByText('Es dueña de 2 animales')).toBeInTheDocument()
    expect(botonEliminar).toHaveAttribute('aria-describedby')
  })

  it('una persona con varios motivos de bloqueo los combina en un solo mensaje', () => {
    renderTabla([PERSONA_CON_TODO])

    const fila = screen.getByText('Carlos Díaz').closest('tr')
    const botonEliminar = within(fila).getByRole('button', { name: 'Eliminar' })
    expect(botonEliminar).toBeDisabled()
    expect(
      within(fila).getByText('Es dueña de 1 animales, figura en 5 pesajes y tiene un usuario de acceso'),
    ).toBeInTheDocument()
  })

  it('muestra la etiqueta "Con acceso" solo para quien tiene usuario', () => {
    renderTabla([PERSONA_LIBRE, PERSONA_CON_TODO])

    expect(screen.getByText('Con acceso')).toBeInTheDocument()
    expect(screen.getAllByText('Con acceso')).toHaveLength(1)
  })
})
