import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { peticionProtegida } from '../../api/cliente'
import FormularioSalidaAnimal from './FormularioSalidaAnimal'

vi.mock('../../api/cliente', () => ({
  peticionProtegida: vi.fn(),
  ErrorHttp: class ErrorHttp extends Error {
    constructor(estado, mensaje) {
      super(mensaje)
      this.estado = estado
    }
  },
}))

const ANIMAL = {
  aniId: 7,
  aniCaravana: 'CAR-007',
  aniFechaIngreso: '2026-01-01',
  fechaUltimoPesaje: null,
}

async function esperarPersonasCargadas() {
  await waitFor(() => expect(screen.queryByText('Cargando personas…')).not.toBeInTheDocument())
}

describe('FormularioSalidaAnimal', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('registra la salida con motivo Muerte, sin comprador', async () => {
    const usuario = userEvent.setup()
    const alGuardar = vi.fn()
    peticionProtegida.mockImplementation(async (ruta) => {
      if (ruta === '/api/personas') {
        return []
      }
      return { aniId: 7, aniCaravana: 'CAR-007', aniFechaEgreso: '2026-06-01', aniMotivoSalida: 'MUERTE' }
    })

    render(<FormularioSalidaAnimal animal={ANIMAL} alGuardar={alGuardar} alCancelar={vi.fn()} />)
    await esperarPersonasCargadas()

    await usuario.selectOptions(screen.getByLabelText('Motivo'), 'MUERTE')
    await usuario.click(screen.getByRole('button', { name: 'Registrar salida' }))

    expect(peticionProtegida).toHaveBeenCalledWith(
      '/api/animales/7/salida',
      expect.objectContaining({ method: 'PUT' }),
    )
    const [, opciones] = peticionProtegida.mock.calls.find(([ruta]) => ruta === '/api/animales/7/salida')
    expect(JSON.parse(opciones.body)).toEqual({ fecha: expect.any(String), motivo: 'MUERTE', nota: null, compradorId: null })
    expect(alGuardar).toHaveBeenCalledWith(
      expect.objectContaining({ aniCaravana: 'CAR-007', aniMotivoSalida: 'MUERTE' }),
    )
  })

  it('valida en el cliente: sin motivo no llama al servidor', async () => {
    const usuario = userEvent.setup()
    peticionProtegida.mockResolvedValue([])

    render(<FormularioSalidaAnimal animal={ANIMAL} alGuardar={vi.fn()} alCancelar={vi.fn()} />)
    await esperarPersonasCargadas()

    await usuario.click(screen.getByRole('button', { name: 'Registrar salida' }))

    expect(screen.getByText('Elegí un motivo')).toBeInTheDocument()
    expect(peticionProtegida).not.toHaveBeenCalledWith('/api/animales/7/salida', expect.anything())
  })

  it('el selector de comprador solo aparece con motivo Venta', async () => {
    const usuario = userEvent.setup()
    peticionProtegida.mockResolvedValue([])

    render(<FormularioSalidaAnimal animal={ANIMAL} alGuardar={vi.fn()} alCancelar={vi.fn()} />)
    await esperarPersonasCargadas()

    expect(screen.queryByLabelText('Comprador (opcional)')).not.toBeInTheDocument()

    await usuario.selectOptions(screen.getByLabelText('Motivo'), 'VENTA')
    expect(screen.getByLabelText('Comprador (opcional)')).toBeInTheDocument()

    await usuario.selectOptions(screen.getByLabelText('Motivo'), 'MUERTE')
    expect(screen.queryByLabelText('Comprador (opcional)')).not.toBeInTheDocument()
  })

  it('manda el compradorId solo cuando el motivo es Venta', async () => {
    const usuario = userEvent.setup()
    const alGuardar = vi.fn()
    peticionProtegida.mockImplementation(async (ruta) => {
      if (ruta === '/api/personas') {
        return [{ perId: 5, perNombre: 'Carlos', perApellido: 'Díaz' }]
      }
      return { aniId: 7, aniCaravana: 'CAR-007', aniMotivoSalida: 'VENTA' }
    })

    render(<FormularioSalidaAnimal animal={ANIMAL} alGuardar={alGuardar} alCancelar={vi.fn()} />)
    await esperarPersonasCargadas()

    await usuario.selectOptions(screen.getByLabelText('Motivo'), 'VENTA')
    await usuario.selectOptions(screen.getByLabelText('Comprador (opcional)'), '5')
    await usuario.click(screen.getByRole('button', { name: 'Registrar salida' }))

    const [, opciones] = peticionProtegida.mock.calls.find(([ruta]) => ruta === '/api/animales/7/salida')
    expect(JSON.parse(opciones.body)).toEqual({ fecha: expect.any(String), motivo: 'VENTA', nota: null, compradorId: 5 })
    expect(alGuardar).toHaveBeenCalled()
  })

  it('valida en el cliente: motivo Otro sin nota no llama al servidor', async () => {
    const usuario = userEvent.setup()
    peticionProtegida.mockResolvedValue([])

    render(<FormularioSalidaAnimal animal={ANIMAL} alGuardar={vi.fn()} alCancelar={vi.fn()} />)
    await esperarPersonasCargadas()

    await usuario.selectOptions(screen.getByLabelText('Motivo'), 'OTRO')
    await usuario.click(screen.getByRole('button', { name: 'Registrar salida' }))

    expect(screen.getByText('Ingresá la nota')).toBeInTheDocument()
    expect(peticionProtegida).not.toHaveBeenCalledWith('/api/animales/7/salida', expect.anything())
  })

  it('motivo Otro con nota sí llama al servidor', async () => {
    const usuario = userEvent.setup()
    const alGuardar = vi.fn()
    peticionProtegida.mockImplementation(async (ruta) => {
      if (ruta === '/api/personas') {
        return []
      }
      return { aniId: 7, aniCaravana: 'CAR-007', aniMotivoSalida: 'OTRO' }
    })

    render(<FormularioSalidaAnimal animal={ANIMAL} alGuardar={alGuardar} alCancelar={vi.fn()} />)
    await esperarPersonasCargadas()

    await usuario.selectOptions(screen.getByLabelText('Motivo'), 'OTRO')
    await usuario.type(screen.getByLabelText('Nota'), 'Se perdió en el monte')
    await usuario.click(screen.getByRole('button', { name: 'Registrar salida' }))

    expect(alGuardar).toHaveBeenCalled()
  })

  it('valida en el cliente: una fecha futura no llama al servidor', async () => {
    const usuario = userEvent.setup()
    peticionProtegida.mockResolvedValue([])

    render(<FormularioSalidaAnimal animal={ANIMAL} alGuardar={vi.fn()} alCancelar={vi.fn()} />)
    await esperarPersonasCargadas()

    const campoFecha = screen.getByLabelText('Fecha')
    const fechaFutura = new Date(Date.now() + 86400000).toISOString().slice(0, 10)
    await usuario.clear(campoFecha)
    await usuario.type(campoFecha, fechaFutura.replaceAll('-', ''))
    await usuario.selectOptions(screen.getByLabelText('Motivo'), 'MUERTE')
    await usuario.click(screen.getByRole('button', { name: 'Registrar salida' }))

    expect(screen.getByText('La fecha de salida no puede ser futura')).toBeInTheDocument()
    expect(peticionProtegida).not.toHaveBeenCalledWith('/api/animales/7/salida', expect.anything())
  })

  it('un 409 del servidor se muestra como error bajo el campo correspondiente', async () => {
    const usuario = userEvent.setup()
    const { ErrorHttp } = await import('../../api/cliente')
    peticionProtegida.mockImplementation(async (ruta) => {
      if (ruta === '/api/personas') {
        return []
      }
      throw new ErrorHttp(409, 'El animal CAR-007 ya tiene una salida registrada')
    })

    render(<FormularioSalidaAnimal animal={ANIMAL} alGuardar={vi.fn()} alCancelar={vi.fn()} />)
    await esperarPersonasCargadas()

    await usuario.selectOptions(screen.getByLabelText('Motivo'), 'MUERTE')
    await usuario.click(screen.getByRole('button', { name: 'Registrar salida' }))

    expect(await screen.findByText('El animal CAR-007 ya tiene una salida registrada')).toBeInTheDocument()
  })

  it('un 400 del servidor sobre el motivo se muestra bajo el campo Motivo', async () => {
    const usuario = userEvent.setup()
    const { ErrorHttp } = await import('../../api/cliente')
    peticionProtegida.mockImplementation(async (ruta) => {
      if (ruta === '/api/personas') {
        return []
      }
      throw new ErrorHttp(400, 'El motivo debe ser VENTA, MUERTE, OTRO')
    })

    render(<FormularioSalidaAnimal animal={ANIMAL} alGuardar={vi.fn()} alCancelar={vi.fn()} />)
    await esperarPersonasCargadas()

    await usuario.selectOptions(screen.getByLabelText('Motivo'), 'MUERTE')
    await usuario.click(screen.getByRole('button', { name: 'Registrar salida' }))

    expect(await screen.findByText('El motivo debe ser VENTA, MUERTE, OTRO')).toBeInTheDocument()
    expect(screen.getByLabelText('Motivo')).toHaveAttribute('aria-invalid', 'true')
  })
})
