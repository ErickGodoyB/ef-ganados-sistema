import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { peticionProtegida } from '../api/cliente'
import { fechaHoyIso } from '../utilidades/fechas'
import Transferencias from './Transferencias'

vi.mock('../api/cliente', () => ({
  peticionProtegida: vi.fn(),
  ErrorHttp: class ErrorHttp extends Error {
    constructor(estado, mensaje) {
      super(mensaje)
      this.estado = estado
    }
  },
}))

vi.mock('../auth/useAuth', () => ({
  useAuth: () => ({ personaId: 5, personaNombre: 'Ana Pérez', errorYo: '' }),
}))

function transferencia(traId, extra = {}) {
  return {
    traId,
    fecha: '2026-03-01',
    motivo: 'SELECCION',
    nota: null,
    responsableNombre: 'Ana Pérez',
    registradaEn: '2026-03-01T10:00:00',
    cantidadAnimales: 2,
    origenes: ['Lote A'],
    destinos: ['Lote B'],
    devuelveA: null,
    devuelta: false,
    ...extra,
  }
}

const LISTA = [
  transferencia(3, {
    fecha: '2026-03-10',
    motivo: 'DEVOLUCION',
    origenes: ['Lote B'],
    destinos: ['Lote A'],
    devuelveA: 2,
    responsableNombre: 'Luis Gómez',
  }),
  transferencia(2, { fecha: '2026-03-01', devuelta: true }),
  transferencia(1, {
    fecha: '2026-02-01',
    motivo: 'SANITARIO',
    cantidadAnimales: 1,
    origenes: ['Sin lote'],
    destinos: ['Recría Norte'],
  }),
]

const GRUPO = { grpId: 1, grpDescripcion: 'Invernada' }
const ANIMALES = [
  {
    aniId: 1,
    aniCaravana: 'CAR-001',
    razaId: 1,
    razaDescripcion: 'Brangus',
    subGrupoId: 10,
    subGrupoDescripcion: 'Lote A',
    grupoDescripcion: 'Invernada',
    pesoActual: 250,
    pesoAnterior: null,
    fechaPesoAnterior: null,
    pesoAnteriorEsIngreso: false,
    fechaUltimoPesaje: null,
    gmd: 1.2,
    aniFechaEgreso: null,
  },
]
const LOTES = [
  { sbId: 10, sbDescripcion: 'Lote A', grupo: GRUPO },
  { sbId: 11, sbDescripcion: 'Lote B', grupo: GRUPO },
]

let lista

beforeEach(() => {
  lista = LISTA
  peticionProtegida.mockImplementation(async (ruta, opciones) => {
    if (ruta === '/api/animales/resumen') {
      return ANIMALES
    }
    if (ruta === '/api/subgrupos') {
      return LOTES
    }
    if (ruta === '/api/personas') {
      return [{ perId: 5, perNombre: 'Ana', perApellido: 'Pérez', perTipo: 'EMPLEADO' }]
    }
    if (ruta === '/api/transferencias' && opciones?.method === 'POST') {
      return { traId: 9 }
    }
    const detalle = /^\/api\/transferencias\/(\d+)$/.exec(ruta)
    if (detalle) {
      const base = lista.find((item) => item.traId === Number(detalle[1]))
      return {
        ...base,
        animales: [
          { animalId: 1, caravana: 'CAR-001', razaDescripcion: 'Brangus', origen: 'Lote A', destino: 'Lote B', enDestino: true },
        ],
      }
    }
    if (ruta.startsWith('/api/transferencias')) {
      return lista
    }
    return null
  })
})

afterEach(() => {
  vi.restoreAllMocks()
})

async function renderizar() {
  render(<Transferencias />)
  await waitFor(() => expect(screen.queryByText('Cargando transferencias…')).not.toBeInTheDocument())
}

/** Fecha dd/mm/aaaa de cada fila de la tabla (la tabla y las tarjetas están las dos en el DOM). */
function fechasEnLaTabla() {
  return within(screen.getByRole('table'))
    .getAllByRole('row')
    .slice(1)
    .map((fila) => within(fila).getAllByRole('cell')[0].textContent)
}

function filaDeFecha(fecha) {
  return within(screen.getByRole('table'))
    .getAllByRole('row')
    .find((fila) => within(fila).queryByText(fecha))
}

function vecesPedido(ruta) {
  return peticionProtegida.mock.calls.filter(([r, opciones]) => r === ruta && !opciones).length
}

describe('Transferencias: pantalla principal (sin pestañas)', () => {
  it('no tiene pestañas: muestra la lista, el buscador, el Intervalo y el botón "Nueva transferencia"', async () => {
    await renderizar()

    expect(screen.queryByRole('tab')).not.toBeInTheDocument()
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Transferencias' })).toBeInTheDocument()
    expect(screen.getByLabelText('Buscar por lote, responsable o motivo')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Intervalo' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Nueva transferencia' })).toBeInTheDocument()
  })

  it('muestra fecha, motivo, cantidad, origen → destino y responsable de cada transferencia', async () => {
    await renderizar()

    expect(fechasEnLaTabla()).toEqual(['10/03/2026', '01/03/2026', '01/02/2026'])
    const fila = filaDeFecha('01/02/2026')
    expect(within(fila).getByText('Sanitario')).toBeInTheDocument()
    expect(within(fila).getByText('1')).toBeInTheDocument()
    expect(within(fila).getByText('Sin lote → Recría Norte')).toBeInTheDocument()
    expect(within(fila).getByText('Ana Pérez')).toBeInTheDocument()
    expect(within(filaDeFecha('10/03/2026')).getByText('Devolución')).toBeInTheDocument()
  })

  it('la etiqueta "Devuelta" solo aparece en la transferencia ya devuelta', async () => {
    await renderizar()

    expect(within(filaDeFecha('01/03/2026')).getByText('Devuelta')).toBeInTheDocument()
    expect(within(filaDeFecha('01/02/2026')).queryByText('Devuelta')).not.toBeInTheDocument()
    expect(within(filaDeFecha('10/03/2026')).queryByText('Devuelta')).not.toBeInTheDocument()
  })

  it('en celular muestra las mismas transferencias como tarjetas', async () => {
    await renderizar()

    const tarjetas = screen.getAllByRole('article')
    expect(tarjetas).toHaveLength(3)
    expect(within(tarjetas[1]).getByText('01/03/2026')).toBeInTheDocument()
    expect(within(tarjetas[1]).getByText('Lote A → Lote B')).toBeInTheDocument()
    expect(within(tarjetas[1]).getByText('Devuelta')).toBeInTheDocument()
  })

  it('sin transferencias muestra el mensaje de vacío', async () => {
    lista = []
    await renderizar()

    expect(screen.getByText('Todavía no hay transferencias registradas')).toBeInTheDocument()
  })

  it('si falla la petición muestra un error con "Reintentar", que vuelve a pedir la lista', async () => {
    const usuario = userEvent.setup()
    peticionProtegida.mockRejectedValueOnce(new Error('falló'))
    await renderizar()

    expect(screen.getByText('No se pudo cargar el listado de transferencias.')).toBeInTheDocument()
    await usuario.click(screen.getByRole('button', { name: 'Reintentar' }))

    await waitFor(() => expect(fechasEnLaTabla()).toHaveLength(3))
  })
})

describe('Transferencias: búsqueda e intervalo', () => {
  it('busca por lote (origen o destino)', async () => {
    const usuario = userEvent.setup()
    await renderizar()

    await usuario.type(screen.getByLabelText('Buscar por lote, responsable o motivo'), 'recria')

    expect(fechasEnLaTabla()).toEqual(['01/02/2026'])
  })

  it('busca por responsable', async () => {
    const usuario = userEvent.setup()
    await renderizar()

    await usuario.type(screen.getByLabelText('Buscar por lote, responsable o motivo'), 'gomez')

    expect(fechasEnLaTabla()).toEqual(['10/03/2026'])
  })

  it('busca por motivo', async () => {
    const usuario = userEvent.setup()
    await renderizar()

    await usuario.type(screen.getByLabelText('Buscar por lote, responsable o motivo'), 'sanitario')

    expect(fechasEnLaTabla()).toEqual(['01/02/2026'])
  })

  it('sin coincidencias muestra el aviso y "Limpiar filtros" restablece la lista', async () => {
    const usuario = userEvent.setup()
    await renderizar()

    await usuario.type(screen.getByLabelText('Buscar por lote, responsable o motivo'), 'zzz')
    expect(screen.getByText('No hay transferencias que coincidan')).toBeInTheDocument()

    await usuario.click(screen.getByRole('button', { name: 'Limpiar filtros' }))

    expect(fechasEnLaTabla()).toHaveLength(3)
    expect(screen.getByLabelText('Buscar por lote, responsable o motivo')).toHaveValue('')
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

  it('con un intervalo sin transferencias lo dice', async () => {
    const usuario = userEvent.setup()
    await renderizar()
    lista = []

    await usuario.click(screen.getByRole('button', { name: 'Intervalo' }))
    await usuario.click(screen.getByRole('button', { name: 'Hoy' }))
    await usuario.click(screen.getByRole('button', { name: 'Aplicar' }))

    expect(await screen.findByText('No hay transferencias en ese intervalo')).toBeInTheDocument()
  })
})

describe('Transferencias: paginación', () => {
  it('pagina de a 10 y permite pasar a la página siguiente', async () => {
    const usuario = userEvent.setup()
    lista = Array.from({ length: 12 }, (_, i) =>
      transferencia(100 - i, { fecha: `2026-03-${String(20 - i).padStart(2, '0')}` }),
    )
    await renderizar()

    expect(fechasEnLaTabla()).toHaveLength(10)
    expect(screen.getByText(/Mostrando 1–10 de 12/)).toBeInTheDocument()

    await usuario.click(screen.getByRole('button', { name: /Siguiente/ }))

    expect(fechasEnLaTabla()).toHaveLength(2)
    expect(screen.getByText(/Mostrando 11–12 de 12/)).toBeInTheDocument()
  })
})

describe('Transferencias: detalle y devolución', () => {
  it('abrir una fila muestra el detalle con la tabla de animales', async () => {
    const usuario = userEvent.setup()
    await renderizar()

    await usuario.click(within(filaDeFecha('01/02/2026')).getByRole('button', { name: /Ver la transferencia/ }))

    const dialogo = await screen.findByRole('dialog', { name: 'Detalle de la transferencia' })
    expect(await within(dialogo).findByText('CAR-001')).toBeInTheDocument()
    expect(peticionProtegida).toHaveBeenCalledWith('/api/transferencias/1')
  })

  it('tocar cualquier parte de la fila también abre el detalle', async () => {
    const usuario = userEvent.setup()
    await renderizar()

    await usuario.click(within(filaDeFecha('01/03/2026')).getByText('Lote A → Lote B'))

    expect(await screen.findByRole('dialog', { name: 'Detalle de la transferencia' })).toBeInTheDocument()
  })

  it('"Devolver" no se ofrece en una transferencia ya devuelta ni en una devolución', async () => {
    const usuario = userEvent.setup()
    await renderizar()

    // Ya devuelta.
    await usuario.click(within(filaDeFecha('01/03/2026')).getByRole('button', { name: /Ver la transferencia/ }))
    await screen.findByText('CAR-001')
    expect(screen.queryByRole('button', { name: /Devolver/ })).not.toBeInTheDocument()
    await usuario.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    // Una devolución.
    await usuario.click(within(filaDeFecha('10/03/2026')).getByRole('button', { name: /Ver la transferencia/ }))
    await screen.findByText('CAR-001')
    expect(screen.queryByRole('button', { name: /Devolver/ })).not.toBeInTheDocument()
  })

  it('al devolver una transferencia, la lista se recarga y el modal muestra "X devueltos, Y omitidos"', async () => {
    const usuario = userEvent.setup()
    peticionProtegida.mockImplementation(async (ruta, opciones) => {
      if (/\/devolver$/.test(ruta)) {
        return { ...LISTA[0], cantidadDevuelta: 1, cantidadOmitida: 0 }
      }
      if (ruta === '/api/personas') {
        return [{ perId: 5, perNombre: 'Ana', perApellido: 'Pérez', perTipo: 'EMPLEADO' }]
      }
      const detalle = /^\/api\/transferencias\/(\d+)$/.exec(ruta)
      if (detalle) {
        return {
          ...LISTA[2],
          animales: [
            { animalId: 1, caravana: 'CAR-001', razaDescripcion: 'Brangus', origen: 'Lote A', destino: 'Lote B', enDestino: true },
          ],
        }
      }
      return opciones ? null : lista
    })
    await renderizar()
    const cargasAntes = vecesPedido('/api/transferencias')

    await usuario.click(within(filaDeFecha('01/02/2026')).getByRole('button', { name: /Ver la transferencia/ }))
    await usuario.click(await screen.findByRole('button', { name: /Devolver/ }))
    await usuario.click(screen.getByRole('button', { name: 'Devolver transferencia' }))

    expect(await screen.findByText('1 devuelto, 0 omitidos')).toBeInTheDocument()
    await waitFor(() => expect(vecesPedido('/api/transferencias')).toBeGreaterThan(cargasAntes))
  })
})

describe('Transferencias: nueva transferencia', () => {
  it('"Nueva transferencia" abre el modal', async () => {
    const usuario = userEvent.setup()
    await renderizar()

    await usuario.click(screen.getByRole('button', { name: 'Nueva transferencia' }))

    expect(await screen.findByRole('dialog', { name: 'Nueva transferencia' })).toBeInTheDocument()
    expect(await screen.findByText('Elegí un lote de origen para ver los animales disponibles')).toBeInTheDocument()
  })

  it('"Cancelar" cierra el modal y no registra nada', async () => {
    const usuario = userEvent.setup()
    await renderizar()
    await usuario.click(screen.getByRole('button', { name: 'Nueva transferencia' }))
    await screen.findByLabelText('Lote de origen')

    await usuario.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(peticionProtegida).not.toHaveBeenCalledWith('/api/transferencias', expect.anything())
  })

  it('al transferir con éxito cierra el modal, muestra el aviso y recarga la lista', async () => {
    const usuario = userEvent.setup()
    await renderizar()
    const cargasAntes = vecesPedido('/api/transferencias')

    await usuario.click(screen.getByRole('button', { name: 'Nueva transferencia' }))
    await usuario.selectOptions(await screen.findByLabelText('Lote de origen'), '10')
    await usuario.click(screen.getAllByRole('checkbox', { name: 'Seleccionar CAR-001' })[0])
    await usuario.selectOptions(screen.getByLabelText('Lote de destino'), '11')
    await usuario.click(screen.getByRole('button', { name: 'Transferir' }))
    await usuario.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(await screen.findByText('1 animal transferido a Lote B')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await waitFor(() => expect(vecesPedido('/api/transferencias')).toBeGreaterThan(cargasAntes))
  })
})
