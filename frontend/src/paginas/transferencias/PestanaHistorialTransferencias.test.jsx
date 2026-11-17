import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ErrorHttp, peticionProtegida } from '../../api/cliente'
import { fechaHoyIso } from '../../utilidades/fechas'
import PestanaHistorialTransferencias from './PestanaHistorialTransferencias'

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
    if (ruta.startsWith('/api/transferencias?') || ruta === '/api/transferencias') {
      return LISTA
    }
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

async function renderizar(onCambio = vi.fn()) {
  render(<PestanaHistorialTransferencias onCambio={onCambio} />)
  await waitFor(() => expect(screen.queryByText('Cargando historial…')).not.toBeInTheDocument())
  return onCambio
}

/** Fila de la tabla (no de las tarjetas) de la transferencia con esa fecha dd/mm/aaaa. */
function filaDeFecha(fecha) {
  return within(screen.getByRole('table'))
    .getAllByRole('row')
    .find((fila) => within(fila).queryByText(fecha))
}

async function abrirDetalle(usuario, fecha) {
  await usuario.click(within(filaDeFecha(fecha)).getByRole('button', { name: /Ver la transferencia/ }))
  return screen.findByRole('dialog', { name: 'Detalle de la transferencia' })
}

describe('PestanaHistorialTransferencias: lista', () => {
  it('muestra fecha, motivo, cantidad, origen → destino y responsable de cada transferencia', async () => {
    await renderizar()

    const fila = filaDeFecha('01/02/2026')
    expect(within(fila).getByText('Sanitario')).toBeInTheDocument()
    expect(within(fila).getByText('2')).toBeInTheDocument()
    expect(within(fila).getByText('Lote A, Sin lote → Lote B')).toBeInTheDocument()
    expect(within(fila).getByText('Ana Pérez')).toBeInTheDocument()
    expect(within(filaDeFecha('10/03/2026')).getByText('Devolución')).toBeInTheDocument()
  })

  it('la etiqueta "Devuelta" solo aparece en la transferencia ya devuelta', async () => {
    await renderizar()

    expect(within(filaDeFecha('01/03/2026')).getByText('Devuelta')).toBeInTheDocument()
    expect(within(filaDeFecha('01/02/2026')).queryByText('Devuelta')).not.toBeInTheDocument()
    expect(within(filaDeFecha('10/03/2026')).queryByText('Devuelta')).not.toBeInTheDocument()
  })

  it('sin transferencias muestra el mensaje de vacío', async () => {
    peticionProtegida.mockResolvedValue([])
    await renderizar()

    expect(screen.getByText('Todavía no hay transferencias registradas')).toBeInTheDocument()
  })

  it('si falla la petición muestra un error con "Reintentar"', async () => {
    peticionProtegida.mockRejectedValue(new Error('falló'))
    await renderizar()

    expect(screen.getByText('No se pudo cargar el historial de transferencias.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
  })

  it('el filtro de Intervalo vuelve a pedir la lista con desde y hasta', async () => {
    const usuario = userEvent.setup()
    await renderizar()

    await usuario.click(screen.getByRole('button', { name: 'Intervalo' }))
    await usuario.click(screen.getByRole('button', { name: 'Hoy' }))
    await usuario.click(screen.getByRole('button', { name: 'Aplicar' }))

    const hoy = fechaHoyIso()
    await waitFor(() =>
      expect(peticionProtegida).toHaveBeenCalledWith(`/api/transferencias?desde=${hoy}&hasta=${hoy}`),
    )
  })
})

describe('PestanaHistorialTransferencias: detalle', () => {
  it('abre el detalle con los datos y la tabla de animales (origen, destino y si sigue en destino)', async () => {
    const usuario = userEvent.setup()
    await renderizar()

    const dialogo = await abrirDetalle(usuario, '01/02/2026')

    expect(within(dialogo).getByText('Aislamiento')).toBeInTheDocument()
    expect(within(dialogo).getByText('Sanitario')).toBeInTheDocument()
    const filas = within(dialogo).getAllByRole('row').slice(1)
    expect(filas).toHaveLength(2)
    expect(within(filas[0]).getByText('CAR-001')).toBeInTheDocument()
    expect(within(filas[0]).getByText('Lote A')).toBeInTheDocument()
    expect(within(filas[0]).getByText(/Sí/)).toBeInTheDocument()
    expect(within(filas[1]).getByText('Sin lote')).toBeInTheDocument()
    expect(within(filas[1]).getByText(/No/)).toBeInTheDocument()
  })

  it('"Devolver" se ofrece en una transferencia común', async () => {
    const usuario = userEvent.setup()
    await renderizar()

    const dialogo = await abrirDetalle(usuario, '01/02/2026')

    expect(within(dialogo).getByRole('button', { name: /Devolver/ })).toBeInTheDocument()
  })

  it('"Devolver" no aparece si la transferencia ya fue devuelta', async () => {
    const usuario = userEvent.setup()
    await renderizar()

    const dialogo = await abrirDetalle(usuario, '01/03/2026')

    await within(dialogo).findByText('CAR-001')
    expect(within(dialogo).queryByRole('button', { name: /Devolver/ })).not.toBeInTheDocument()
  })

  it('"Devolver" no aparece si la transferencia es una devolución', async () => {
    const usuario = userEvent.setup()
    await renderizar()

    const dialogo = await abrirDetalle(usuario, '10/03/2026')

    await within(dialogo).findByText('CAR-001')
    expect(within(dialogo).queryByRole('button', { name: /Devolver/ })).not.toBeInTheDocument()
  })
})

describe('PestanaHistorialTransferencias: devolución', () => {
  async function abrirFormularioDeDevolucion(usuario) {
    const dialogo = await abrirDetalle(usuario, '01/02/2026')
    await usuario.click(await within(dialogo).findByRole('button', { name: /Devolver/ }))
    return screen.getByRole('dialog', { name: 'Devolver transferencia' })
  }

  it('envía la devolución con fecha, nota y responsable, y muestra cuántos se devolvieron y omitieron', async () => {
    const usuario = userEvent.setup()
    const onCambio = await renderizar()
    const dialogo = await abrirFormularioDeDevolucion(usuario)

    fireEvent.change(within(dialogo).getByLabelText('Fecha'), { target: { value: '2026-03-15' } })
    await usuario.type(within(dialogo).getByLabelText(/Nota/), '  Volvieron al lote  ')
    await usuario.click(within(dialogo).getByRole('button', { name: 'Devolver transferencia' }))

    expect(await screen.findByText('2 devueltos, 1 omitido')).toBeInTheDocument()
    const [ruta, opciones] = peticionProtegida.mock.calls.find(([r]) => r === '/api/transferencias/1/devolver')
    expect(ruta).toBe('/api/transferencias/1/devolver')
    expect(opciones.method).toBe('POST')
    expect(JSON.parse(opciones.body)).toEqual({ fecha: '2026-03-15', nota: 'Volvieron al lote', responsableId: 5 })
    // Avisa hacia arriba y recarga el listado de fondo.
    expect(onCambio).toHaveBeenCalledTimes(1)
    const cargasDelListado = peticionProtegida.mock.calls.filter(([r]) => r === '/api/transferencias').length
    expect(cargasDelListado).toBeGreaterThanOrEqual(2)
  })

  it('el resultado usa el singular cuando es uno y uno', async () => {
    const usuario = userEvent.setup()
    respuestaDevolver = async () => ({ ...DEVOLUCION, cantidadDevuelta: 1, cantidadOmitida: 1 })
    await renderizar()
    const dialogo = await abrirFormularioDeDevolucion(usuario)

    await usuario.click(within(dialogo).getByRole('button', { name: 'Devolver transferencia' }))

    expect(await screen.findByText('1 devuelto, 1 omitido')).toBeInTheDocument()
  })

  it('una fecha anterior a la de la transferencia original se rechaza en el cliente, indicando esa fecha', async () => {
    const usuario = userEvent.setup()
    await renderizar()
    const dialogo = await abrirFormularioDeDevolucion(usuario)

    fireEvent.change(within(dialogo).getByLabelText('Fecha'), { target: { value: '2026-01-15' } })
    await usuario.click(within(dialogo).getByRole('button', { name: 'Devolver transferencia' }))

    expect(
      within(dialogo).getByText('La fecha no puede ser anterior a la de la transferencia original (01/02/2026)'),
    ).toBeInTheDocument()
    expect(peticionProtegida).not.toHaveBeenCalledWith(expect.stringMatching(/devolver$/), expect.anything())
  })

  it('el campo de fecha no deja elegir una fecha anterior a la original ni futura', async () => {
    const usuario = userEvent.setup()
    await renderizar()
    const dialogo = await abrirFormularioDeDevolucion(usuario)

    const campoFecha = within(dialogo).getByLabelText('Fecha')
    expect(campoFecha).toHaveAttribute('min', '2026-02-01')
    expect(campoFecha).toHaveAttribute('max', fechaHoyIso())
  })

  it('un error del backend se muestra en español dentro del formulario', async () => {
    const usuario = userEvent.setup()
    respuestaDevolver = async () => {
      throw new ErrorHttp(409, 'No se puede devolver la transferencia 1: ningún animal sigue en el lote de destino')
    }
    const onCambio = await renderizar()
    const dialogo = await abrirFormularioDeDevolucion(usuario)

    await usuario.click(within(dialogo).getByRole('button', { name: 'Devolver transferencia' }))

    expect(
      await within(dialogo).findByText(
        'No se puede devolver la transferencia 1: ningún animal sigue en el lote de destino',
      ),
    ).toBeInTheDocument()
    expect(onCambio).not.toHaveBeenCalled()
  })

  it('"Cancelar" vuelve al detalle sin enviar nada', async () => {
    const usuario = userEvent.setup()
    await renderizar()
    const dialogo = await abrirFormularioDeDevolucion(usuario)

    await usuario.click(within(dialogo).getByRole('button', { name: 'Cancelar' }))

    expect(await screen.findByRole('dialog', { name: 'Detalle de la transferencia' })).toBeInTheDocument()
    expect(peticionProtegida).not.toHaveBeenCalledWith(expect.stringMatching(/devolver$/), expect.anything())
  })
})
