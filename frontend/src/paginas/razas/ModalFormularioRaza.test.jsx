import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { peticionProtegida } from '../../api/cliente'
import ModalFormularioRaza from './ModalFormularioRaza'

vi.mock('../../api/cliente', () => ({
  peticionProtegida: vi.fn(),
  ErrorHttp: class ErrorHttp extends Error {
    constructor(estado, mensaje) {
      super(mensaje)
      this.estado = estado
    }
  },
}))

const RAZA_CON_ANIMALES = { rzId: 1, rzDescripcion: 'Brangus', rzPesoObjetivoVenta: 450, cantidadAnimales: 3 }
const RAZA_SIN_ANIMALES = { rzId: 2, rzDescripcion: 'Angus', rzPesoObjetivoVenta: 400, cantidadAnimales: 0 }

describe('ModalFormularioRaza', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('crea una raza nueva con los datos ingresados', async () => {
    const usuario = userEvent.setup()
    const onGuardado = vi.fn()
    peticionProtegida.mockResolvedValue({ rzId: 9, rzDescripcion: 'Nelore', rzPesoObjetivoVenta: 420 })

    render(<ModalFormularioRaza raza={null} onCerrar={vi.fn()} onGuardado={onGuardado} />)

    await usuario.type(screen.getByLabelText('Descripción'), 'Nelore')
    await usuario.type(screen.getByLabelText('Peso objetivo de venta (kg)'), '420')
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(peticionProtegida).toHaveBeenCalledWith('/api/razas', {
      method: 'POST',
      body: JSON.stringify({ rzDescripcion: 'Nelore', rzPesoObjetivoVenta: 420 }),
    })
    expect(onGuardado).toHaveBeenCalledWith({ rzId: 9, rzDescripcion: 'Nelore', rzPesoObjetivoVenta: 420 }, false)
  })

  it('valida en el cliente: campos vacíos no llaman al servidor', async () => {
    const usuario = userEvent.setup()
    render(<ModalFormularioRaza raza={null} onCerrar={vi.fn()} onGuardado={vi.fn()} />)

    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(screen.getByText('Ingresá la descripción de la raza')).toBeInTheDocument()
    expect(screen.getByText('Ingresá el peso objetivo de venta')).toBeInTheDocument()
    expect(peticionProtegida).not.toHaveBeenCalled()
  })

  it('valida en el cliente: peso fuera de rango no llama al servidor', async () => {
    const usuario = userEvent.setup()
    render(<ModalFormularioRaza raza={null} onCerrar={vi.fn()} onGuardado={vi.fn()} />)

    await usuario.type(screen.getByLabelText('Descripción'), 'Holando')
    await usuario.type(screen.getByLabelText('Peso objetivo de venta (kg)'), '2001')
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(screen.getByText('El peso debe ser mayor a 0 y hasta 2000 kg')).toBeInTheDocument()
    expect(peticionProtegida).not.toHaveBeenCalled()
  })

  it('edita una raza sin cambiar el peso objetivo: guarda directo, sin paso de confirmación', async () => {
    const usuario = userEvent.setup()
    const onGuardado = vi.fn()
    peticionProtegida.mockResolvedValue({ ...RAZA_CON_ANIMALES, rzDescripcion: 'Brangus rojo' })

    render(<ModalFormularioRaza raza={RAZA_CON_ANIMALES} onCerrar={vi.fn()} onGuardado={onGuardado} />)

    const campoDescripcion = screen.getByLabelText('Descripción')
    await usuario.clear(campoDescripcion)
    await usuario.type(campoDescripcion, 'Brangus rojo')
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(peticionProtegida).toHaveBeenCalledWith('/api/razas/1', {
      method: 'PUT',
      body: JSON.stringify({ rzDescripcion: 'Brangus rojo', rzPesoObjetivoVenta: 450 }),
    })
    expect(onGuardado).toHaveBeenCalledWith({ ...RAZA_CON_ANIMALES, rzDescripcion: 'Brangus rojo' }, true)
  })

  it('edita el peso objetivo de una raza sin animales: guarda directo, sin paso de confirmación', async () => {
    const usuario = userEvent.setup()
    peticionProtegida.mockResolvedValue({ ...RAZA_SIN_ANIMALES, rzPesoObjetivoVenta: 500 })

    render(<ModalFormularioRaza raza={RAZA_SIN_ANIMALES} onCerrar={vi.fn()} onGuardado={vi.fn()} />)

    const campoPeso = screen.getByLabelText('Peso objetivo de venta (kg)')
    await usuario.clear(campoPeso)
    await usuario.type(campoPeso, '500')
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(peticionProtegida).toHaveBeenCalledWith('/api/razas/2', {
      method: 'PUT',
      body: JSON.stringify({ rzDescripcion: 'Angus', rzPesoObjetivoVenta: 500 }),
    })
  })

  it('edita el peso objetivo de una raza con animales: muestra el paso de confirmación antes de guardar', async () => {
    const usuario = userEvent.setup()
    render(<ModalFormularioRaza raza={RAZA_CON_ANIMALES} onCerrar={vi.fn()} onGuardado={vi.fn()} />)

    const campoPeso = screen.getByLabelText('Peso objetivo de venta (kg)')
    await usuario.clear(campoPeso)
    await usuario.type(campoPeso, '480')
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(
      screen.getByText(/Este cambio afecta a 3 animales: su estado de apto para venta se recalculará/),
    ).toBeInTheDocument()
    expect(peticionProtegida).not.toHaveBeenCalled()
  })

  it('"Volver" en el paso de confirmación no guarda y deja ver el formulario de nuevo', async () => {
    const usuario = userEvent.setup()
    render(<ModalFormularioRaza raza={RAZA_CON_ANIMALES} onCerrar={vi.fn()} onGuardado={vi.fn()} />)

    const campoPeso = screen.getByLabelText('Peso objetivo de venta (kg)')
    await usuario.clear(campoPeso)
    await usuario.type(campoPeso, '480')
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))
    await usuario.click(screen.getByRole('button', { name: 'Volver' }))

    expect(screen.getByLabelText('Peso objetivo de venta (kg)')).toHaveValue('480')
    expect(peticionProtegida).not.toHaveBeenCalled()
  })

  it('"Confirmar" en el paso de confirmación guarda el cambio', async () => {
    const usuario = userEvent.setup()
    const onGuardado = vi.fn()
    peticionProtegida.mockResolvedValue({ ...RAZA_CON_ANIMALES, rzPesoObjetivoVenta: 480 })

    render(<ModalFormularioRaza raza={RAZA_CON_ANIMALES} onCerrar={vi.fn()} onGuardado={onGuardado} />)

    const campoPeso = screen.getByLabelText('Peso objetivo de venta (kg)')
    await usuario.clear(campoPeso)
    await usuario.type(campoPeso, '480')
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))
    await usuario.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(peticionProtegida).toHaveBeenCalledWith('/api/razas/1', {
      method: 'PUT',
      body: JSON.stringify({ rzDescripcion: 'Brangus', rzPesoObjetivoVenta: 480 }),
    })
    expect(onGuardado).toHaveBeenCalledWith({ ...RAZA_CON_ANIMALES, rzPesoObjetivoVenta: 480 }, true)
  })

  it('un 409 del servidor se muestra bajo el campo Descripción', async () => {
    const usuario = userEvent.setup()
    const { ErrorHttp } = await import('../../api/cliente')
    peticionProtegida.mockRejectedValue(new ErrorHttp(409, 'Ya existe una raza con la descripción Brangus'))

    render(<ModalFormularioRaza raza={null} onCerrar={vi.fn()} onGuardado={vi.fn()} />)

    await usuario.type(screen.getByLabelText('Descripción'), 'Brangus')
    await usuario.type(screen.getByLabelText('Peso objetivo de venta (kg)'), '450')
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(await screen.findByText('Ya existe una raza con la descripción Brangus')).toBeInTheDocument()
  })

  it('un 400 genérico del servidor se muestra como error general', async () => {
    const usuario = userEvent.setup()
    const { ErrorHttp } = await import('../../api/cliente')
    peticionProtegida.mockRejectedValue(new ErrorHttp(400, 'Falta el campo rzDescripcion'))

    render(<ModalFormularioRaza raza={null} onCerrar={vi.fn()} onGuardado={vi.fn()} />)

    await usuario.type(screen.getByLabelText('Descripción'), 'Brangus')
    await usuario.type(screen.getByLabelText('Peso objetivo de venta (kg)'), '450')
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(await screen.findByText('Falta el campo rzDescripcion')).toBeInTheDocument()
  })
})
