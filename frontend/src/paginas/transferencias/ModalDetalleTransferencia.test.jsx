import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ErrorHttp, peticionProtegida } from '../../api/cliente'
import { fechaHoyIso } from '../../utilidades/fechas'
import ModalDetalleTransferencia from './ModalDetalleTransferencia'

vi.mock('../../api/cliente', () => ({
  peticionProtegida: vi.fn(),
  ErrorHttp: class ErrorHttp extends Error {
    constructor(estado, mensaje) {
      super(mensaje)
      this.estado = estado
    }
  },
}))

vi.mock('../../auth/useAuth', () => ({
  useAuth: () => ({ personaId: 5, personaNombre: 'Ana Pérez', errorYo: '' }),
}))

const BASE = {
  nota: null,
  responsableNombre: 'Ana Pérez',
  registradaEn: '2026-03-10T10:30:00',
  devuelveA: null,
  devuelta: false,
}

const DEVOLUCION = {
  ...BASE,
  traId: 3,
  fecha: '2026-03-10',
  motivo: 'DEVOLUCION',
  cantidadAnimales: 2,
  origenes: ['Lote B'],
  destinos: ['Lote A'],
  devuelveA: 2,
}
const YA_DEVUELTA = {
  ...BASE,
  traId: 2,
  fecha: '2026-03-01',
  motivo: 'SELECCION',
  cantidadAnimales: 2,
  origenes: ['Lote A'],
  destinos: ['Lote B'],
  devuelta: true,
}
const DEVOLVIBLE = {
  ...BASE,
  traId: 1,
  fecha: '2026-02-01',
  motivo: 'SANITARIO',
  nota: 'Aislamiento',
  cantidadAnimales: 2,
  origenes: ['Lote A', 'Sin lote'],
  destinos: ['Lote B'],
}
const LISTA = [DEVOLUCION, YA_DEVUELTA, DEVOLVIBLE]

const ANIMALES_DETALLE = [
  { animalId: 1, caravana: 'CAR-001', razaDescripcion: 'Brangus', origen: 'Lote A', destino: 'Lote B', enDestino: true },
  { animalId: 4, caravana: 'CAR-004', razaDescripcion: 'Nelore', origen: 'Sin lote', destino: 'Lote B', enDestino: false },
]

let respuestaDevolver

beforeEach(() => {
  respuestaDevolver = async () => ({ ...DEVOLUCION, cantidadDevuelta: 2, cantidadOmitida: 1 })
  peticionProtegida.mockImplementation(async (ruta, opciones) => {
    const detalle = /^\/api\/transferencias\/(\d+)$/.exec(ruta)
    if (detalle) {
      const base = LISTA.find((transferencia) => transferencia.traId === Number(detalle[1]))
      return { ...base, animales: ANIMALES_DETALLE }
    }
    if (/\/devolver$/.test(ruta)) {
      return respuestaDevolver(opciones)
    }
    if (ruta === '/api/personas') {
      return [{ perId: 5, perNombre: 'Ana', perApellido: 'Pérez', perTipo: 'EMPLEADO' }]
    }
    return null
  })
})

afterEach(() => {
  vi.restoreAllMocks()
})

async function renderizar(traId) {
  const onCerrar = vi.fn()
  const onDevuelta = vi.fn()
  render(
    <ModalDetalleTransferencia
      transferenciaId={traId}
      onCerrar={onCerrar}
      onDevuelta={onDevuelta}
      refDisparador={{ current: null }}
    />,
  )
  await screen.findByText('CAR-001')
  return { onCerrar, onDevuelta }
}

describe('ModalDetalleTransferencia: detalle', () => {
  it('muestra los datos y la tabla de animales (origen, destino y si sigue en destino)', async () => {
    await renderizar(1)
    const dialogo = screen.getByRole('dialog', { name: 'Detalle de la transferencia' })

    expect(within(dialogo).getByText('Aislamiento')).toBeInTheDocument()
    expect(within(dialogo).getByText('Sanitario')).toBeInTheDocument()
    expect(within(dialogo).getByText('01/02/2026')).toBeInTheDocument()
    const filas = within(dialogo).getAllByRole('row').slice(1)
    expect(filas).toHaveLength(2)
    expect(within(filas[0]).getByText('CAR-001')).toBeInTheDocument()
    expect(within(filas[0]).getByText('Brangus')).toBeInTheDocument()
    expect(within(filas[0]).getByText('Lote A')).toBeInTheDocument()
    expect(within(filas[0]).getByText(/Sí/)).toBeInTheDocument()
    expect(within(filas[1]).getByText('Sin lote')).toBeInTheDocument()
    expect(within(filas[1]).getByText(/No/)).toBeInTheDocument()
  })

  it('si falla la carga muestra un error con "Reintentar"', async () => {
    peticionProtegida.mockRejectedValue(new Error('falló'))
    render(
      <ModalDetalleTransferencia
        transferenciaId={1}
        onCerrar={vi.fn()}
        onDevuelta={vi.fn()}
        refDisparador={{ current: null }}
      />,
    )

    expect(await screen.findByText('No se pudo cargar el detalle de la transferencia.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
  })

  it('"Devolver" se ofrece en una transferencia común', async () => {
    await renderizar(1)

    expect(screen.getByRole('button', { name: /Devolver/ })).toBeInTheDocument()
  })

  it('"Devolver" no aparece si la transferencia ya fue devuelta (y se ve la etiqueta "Devuelta")', async () => {
    await renderizar(2)

    expect(screen.queryByRole('button', { name: /Devolver/ })).not.toBeInTheDocument()
    expect(screen.getByText('Devuelta')).toBeInTheDocument()
  })

  it('"Devolver" no aparece si la transferencia es una devolución (y dice a cuál devuelve)', async () => {
    await renderizar(3)

    expect(screen.queryByRole('button', { name: /Devolver/ })).not.toBeInTheDocument()
    expect(screen.getByText('Transferencia n.º 2')).toBeInTheDocument()
  })
})

describe('ModalDetalleTransferencia: devolución', () => {
  async function abrirFormularioDeDevolucion(usuario) {
    const funciones = await renderizar(1)
    await usuario.click(screen.getByRole('button', { name: /Devolver/ }))
    return { ...funciones, dialogo: screen.getByRole('dialog', { name: 'Devolver transferencia' }) }
  }

  it('envía la devolución con fecha, nota y responsable, y muestra cuántos se devolvieron y omitieron', async () => {
    const usuario = userEvent.setup()
    const { dialogo, onDevuelta } = await abrirFormularioDeDevolucion(usuario)

    fireEvent.change(within(dialogo).getByLabelText('Fecha'), { target: { value: '2026-03-15' } })
    await usuario.type(within(dialogo).getByLabelText(/Nota/), '  Volvieron al lote  ')
    await usuario.click(within(dialogo).getByRole('button', { name: 'Devolver transferencia' }))

    expect(await screen.findByText('2 devueltos, 1 omitido')).toBeInTheDocument()
    const [ruta, opciones] = peticionProtegida.mock.calls.find(([r]) => r === '/api/transferencias/1/devolver')
    expect(ruta).toBe('/api/transferencias/1/devolver')
    expect(opciones.method).toBe('POST')
    expect(JSON.parse(opciones.body)).toEqual({ fecha: '2026-03-15', nota: 'Volvieron al lote', responsableId: 5 })
    // Avisa hacia arriba, para que la pantalla recargue su lista.
    expect(onDevuelta).toHaveBeenCalledTimes(1)
  })

  it('el resultado usa el singular cuando es uno y uno', async () => {
    const usuario = userEvent.setup()
    respuestaDevolver = async () => ({ ...DEVOLUCION, cantidadDevuelta: 1, cantidadOmitida: 1 })
    const { dialogo } = await abrirFormularioDeDevolucion(usuario)

    await usuario.click(within(dialogo).getByRole('button', { name: 'Devolver transferencia' }))

    expect(await screen.findByText('1 devuelto, 1 omitido')).toBeInTheDocument()
  })

  it('una fecha anterior a la de la transferencia original se rechaza en el cliente, indicando esa fecha', async () => {
    const usuario = userEvent.setup()
    const { dialogo, onDevuelta } = await abrirFormularioDeDevolucion(usuario)

    fireEvent.change(within(dialogo).getByLabelText('Fecha'), { target: { value: '2026-01-15' } })
    await usuario.click(within(dialogo).getByRole('button', { name: 'Devolver transferencia' }))

    expect(
      within(dialogo).getByText('La fecha no puede ser anterior a la de la transferencia original (01/02/2026)'),
    ).toBeInTheDocument()
    expect(peticionProtegida).not.toHaveBeenCalledWith(expect.stringMatching(/devolver$/), expect.anything())
    expect(onDevuelta).not.toHaveBeenCalled()
  })

  it('el campo de fecha no deja elegir una fecha anterior a la original ni futura', async () => {
    const usuario = userEvent.setup()
    const { dialogo } = await abrirFormularioDeDevolucion(usuario)

    const campoFecha = within(dialogo).getByLabelText('Fecha')
    expect(campoFecha).toHaveAttribute('min', '2026-02-01')
    expect(campoFecha).toHaveAttribute('max', fechaHoyIso())
  })

  it('un error del backend se muestra en español dentro del formulario', async () => {
    const usuario = userEvent.setup()
    respuestaDevolver = async () => {
      throw new ErrorHttp(409, 'No se puede devolver la transferencia 1: ningún animal sigue en el lote de destino')
    }
    const { dialogo, onDevuelta } = await abrirFormularioDeDevolucion(usuario)

    await usuario.click(within(dialogo).getByRole('button', { name: 'Devolver transferencia' }))

    expect(
      await within(dialogo).findByText(
        'No se puede devolver la transferencia 1: ningún animal sigue en el lote de destino',
      ),
    ).toBeInTheDocument()
    expect(onDevuelta).not.toHaveBeenCalled()
  })

  it('"Cancelar" vuelve al detalle sin enviar nada', async () => {
    const usuario = userEvent.setup()
    const { dialogo } = await abrirFormularioDeDevolucion(usuario)

    await usuario.click(within(dialogo).getByRole('button', { name: 'Cancelar' }))

    await waitFor(() => expect(screen.getByRole('dialog', { name: 'Detalle de la transferencia' })).toBeInTheDocument())
    expect(peticionProtegida).not.toHaveBeenCalledWith(expect.stringMatching(/devolver$/), expect.anything())
  })
})
