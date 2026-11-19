import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ErrorHttp, peticionProtegida } from '../api/cliente'
import ModalDetalleAnimal from './animales/ModalDetalleAnimal'
import ModalEliminarLote from './grupos/ModalEliminarLote'
import ModalEliminarPersona from './personas/ModalEliminarPersona'

vi.mock('../api/cliente', () => ({
  peticionProtegida: vi.fn(),
  ErrorHttp: class ErrorHttp extends Error {
    constructor(estado, mensaje) {
      super(mensaje)
      this.estado = estado
    }
  },
}))

const MENSAJE_LOTE = 'No se puede eliminar el lote: figura en 2 transferencias entre lotes'
const MENSAJE_ANIMAL = 'No se puede eliminar el animal: figura en transferencias entre lotes'
const MENSAJE_PERSONA = 'No se puede eliminar la persona: figura como responsable de 3 transferencias'

const ANIMAL = {
  aniId: 1,
  aniCaravana: 'CAR-001',
  razaDescripcion: 'Brangus',
  aniFechaIngreso: '2026-01-01',
  aniPesoInicial: 200,
  pesoActual: 220,
  gmd: null,
  aptoVenta: false,
  cantidadPesajes: 0,
  aniFechaEgreso: null,
  aniFechaRegistro: null,
}

beforeEach(() => {
  peticionProtegida.mockImplementation(async (ruta, opciones) => {
    if (opciones?.method === 'DELETE') {
      if (ruta.startsWith('/api/subgrupos')) throw new ErrorHttp(409, MENSAJE_LOTE)
      if (ruta.startsWith('/api/animales')) throw new ErrorHttp(409, MENSAJE_ANIMAL)
      if (ruta.startsWith('/api/personas')) throw new ErrorHttp(409, MENSAJE_PERSONA)
    }
    return []
  })
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('Eliminar con transferencias: el 409 del servidor se muestra tal cual', () => {
  it('lote: muestra el mensaje del servidor en una alerta, sin cerrar el modal ni el error genérico', async () => {
    const usuario = userEvent.setup()
    const onEliminado = vi.fn()
    const onCerrar = vi.fn()
    render(
      <ModalEliminarLote
        lote={{ sbId: 9, sbDescripcion: 'Lote A' }}
        onCerrar={onCerrar}
        onEliminado={onEliminado}
        onYaNoExiste={vi.fn()}
        refDisparador={{ current: null }}
      />,
    )

    await usuario.click(screen.getByRole('button', { name: 'Eliminar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(MENSAJE_LOTE)
    expect(screen.queryByText('No se pudo conectar con el servidor.')).not.toBeInTheDocument()
    expect(onEliminado).not.toHaveBeenCalled()
    expect(onCerrar).not.toHaveBeenCalled()
    // El botón vuelve a quedar usable.
    expect(screen.getByRole('button', { name: 'Eliminar' })).toBeEnabled()
  })

  it('animal: muestra el mensaje del servidor en una alerta dentro de la confirmación', async () => {
    const usuario = userEvent.setup()
    const onEliminado = vi.fn()
    render(
      <MemoryRouter>
        <ModalDetalleAnimal
          animal={ANIMAL}
          onCerrar={vi.fn()}
          onActualizado={vi.fn()}
          onEliminado={onEliminado}
          onYaNoExiste={vi.fn()}
          onSalidaRegistrada={vi.fn()}
          onReactivado={vi.fn()}
          refDisparador={{ current: null }}
        />
      </MemoryRouter>,
    )

    await usuario.click(screen.getByRole('button', { name: 'Eliminar' }))
    await usuario.click(screen.getByRole('button', { name: 'Eliminar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(MENSAJE_ANIMAL)
    expect(screen.queryByText('No se pudo conectar con el servidor.')).not.toBeInTheDocument()
    expect(onEliminado).not.toHaveBeenCalled()
  })

  it('persona: muestra el mensaje del servidor en una alerta', async () => {
    const usuario = userEvent.setup()
    render(
      <ModalEliminarPersona
        persona={{ perId: 5, perNombre: 'Ana', perApellido: 'Gómez' }}
        onCerrar={vi.fn()}
        onEliminado={vi.fn()}
        onYaNoExiste={vi.fn()}
        refDisparador={{ current: null }}
      />,
    )

    await usuario.click(screen.getByRole('button', { name: 'Eliminar' }))

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(MENSAJE_PERSONA))
  })
})
