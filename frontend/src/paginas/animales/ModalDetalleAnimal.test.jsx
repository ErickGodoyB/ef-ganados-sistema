import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { peticionProtegida } from '../../api/cliente'
import ModalDetalleAnimal from './ModalDetalleAnimal'

vi.mock('../../api/cliente', () => ({
  peticionProtegida: vi.fn(),
  ErrorHttp: class ErrorHttp extends Error {
    constructor(estado, mensaje) {
      super(mensaje)
      this.estado = estado
    }
  },
}))

const ANIMAL_ACTIVO = {
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

const ANIMAL_SALIDO = {
  ...ANIMAL_ACTIVO,
  aniId: 2,
  aniCaravana: 'CAR-002',
  aniFechaEgreso: '2026-06-01',
  aniMotivoSalida: 'MUERTE',
  aniNotaSalida: null,
  compradorNombre: null,
}

function manejadores() {
  return {
    onCerrar: vi.fn(),
    onActualizado: vi.fn(),
    onEliminado: vi.fn(),
    onYaNoExiste: vi.fn(),
    onSalidaRegistrada: vi.fn(),
    onReactivado: vi.fn(),
  }
}

describe('ModalDetalleAnimal: salida y reactivar', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('un animal activo muestra "Registrar salida" y no "Reactivar"', async () => {
    peticionProtegida.mockResolvedValue([])
    render(<ModalDetalleAnimal animal={ANIMAL_ACTIVO} {...manejadores()} />)

    expect(await screen.findByRole('button', { name: /Registrar salida/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Reactivar/ })).not.toBeInTheDocument()
  })

  it('un animal con salida muestra "Reactivar", no "Registrar salida", y los datos de la salida', async () => {
    peticionProtegida.mockResolvedValue([])
    render(<ModalDetalleAnimal animal={ANIMAL_SALIDO} {...manejadores()} />)

    expect(await screen.findByRole('button', { name: /Reactivar/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Registrar salida/ })).not.toBeInTheDocument()
    expect(screen.getByText(/Muerte el 01\/06\/2026/)).toBeInTheDocument()
  })

  it('reactivar con éxito avisa al padre y vuelve al detalle', async () => {
    const usuario = userEvent.setup()
    const funciones = manejadores()
    const animalReactivado = { ...ANIMAL_SALIDO, aniFechaEgreso: null, aniMotivoSalida: null }
    peticionProtegida.mockImplementation(async (ruta, opciones) => {
      if (ruta === '/api/animales/2/pesajes') {
        return []
      }
      if (ruta === '/api/animales/2/reactivar' && opciones?.method === 'PUT') {
        return animalReactivado
      }
      throw new Error(`ruta inesperada: ${ruta}`)
    })

    render(<ModalDetalleAnimal animal={ANIMAL_SALIDO} {...funciones} />)

    const botonReactivar = await screen.findByRole('button', { name: /Reactivar/ })
    await usuario.click(botonReactivar)

    expect(screen.getByText(/¿Reactivar el animal CAR-002\?/)).toBeInTheDocument()

    await usuario.click(screen.getByRole('button', { name: 'Reactivar' }))

    await waitFor(() => expect(funciones.onReactivado).toHaveBeenCalledWith(animalReactivado))
    expect(peticionProtegida).toHaveBeenCalledWith('/api/animales/2/reactivar', { method: 'PUT' })
  })

  it('un 409 del servidor al reactivar se muestra dentro del modal, sin cerrar', async () => {
    const usuario = userEvent.setup()
    const funciones = manejadores()
    const { ErrorHttp } = await import('../../api/cliente')
    peticionProtegida.mockImplementation(async (ruta) => {
      if (ruta === '/api/animales/2/pesajes') {
        return []
      }
      throw new ErrorHttp(409, 'No se puede reactivar el animal CAR-002: tiene un pesaje activo posterior a su salida')
    })

    render(<ModalDetalleAnimal animal={ANIMAL_SALIDO} {...funciones} />)

    const botonReactivar = await screen.findByRole('button', { name: /Reactivar/ })
    await usuario.click(botonReactivar)
    await usuario.click(screen.getByRole('button', { name: 'Reactivar' }))

    expect(
      await screen.findByText('No se puede reactivar el animal CAR-002: tiene un pesaje activo posterior a su salida'),
    ).toBeInTheDocument()
    expect(funciones.onReactivado).not.toHaveBeenCalled()
  })

  it('"Cancelar" en la confirmación de reactivar vuelve al detalle sin llamar al servidor', async () => {
    const usuario = userEvent.setup()
    const funciones = manejadores()
    peticionProtegida.mockResolvedValue([])

    render(<ModalDetalleAnimal animal={ANIMAL_SALIDO} {...funciones} />)

    const botonReactivar = await screen.findByRole('button', { name: /Reactivar/ })
    await usuario.click(botonReactivar)
    await usuario.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(screen.getByRole('button', { name: /Reactivar/ })).toBeInTheDocument()
    expect(peticionProtegida).not.toHaveBeenCalledWith('/api/animales/2/reactivar', expect.anything())
  })
})
