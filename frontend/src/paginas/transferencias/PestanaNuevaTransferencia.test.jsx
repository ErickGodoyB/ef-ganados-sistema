import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ErrorHttp, peticionProtegida } from '../../api/cliente'
import { fechaHoyIso } from '../../utilidades/fechas'
import PestanaNuevaTransferencia from './PestanaNuevaTransferencia'

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

function animal(aniId, caravana, extra = {}) {
  return {
    aniId,
    aniCaravana: caravana,
    razaId: 1,
    razaDescripcion: 'Brangus',
    subGrupoId: 10,
    subGrupoDescripcion: 'Lote A',
    grupoDescripcion: 'Invernada',
    pesoActual: 250,
    gmd: 1,
    aptoVenta: false,
    aniFechaEgreso: null,
    ...extra,
  }
}

const ANIMALES = [
  animal(1, 'CAR-001', { gmd: 1.5 }),
  animal(2, 'CAR-002', { gmd: 0.5, razaId: 2, razaDescripcion: 'Nelore' }),
  animal(3, 'CAR-003', { gmd: null, subGrupoId: 11, subGrupoDescripcion: 'Lote B' }),
  animal(4, 'CAR-004', { gmd: 2.2, subGrupoId: null, subGrupoDescripcion: null, grupoDescripcion: null }),
  animal(5, 'CAR-005', { gmd: 3, aniFechaEgreso: '2026-06-01' }),
  animal(6, 'CAR-006', { gmd: 1.0, razaId: 2, razaDescripcion: 'Nelore', subGrupoId: 11, subGrupoDescripcion: 'Lote B' }),
]

const GRUPO = { grpId: 1, grpDescripcion: 'Invernada' }

let lotes
let respuestaTransferir

beforeEach(() => {
  lotes = [
    { sbId: 10, sbDescripcion: 'Lote A', grupo: GRUPO },
    { sbId: 11, sbDescripcion: 'Lote B', grupo: GRUPO },
    { sbId: 12, sbDescripcion: 'Lote C', grupo: GRUPO },
  ]
  respuestaTransferir = async () => ({ traId: 1 })
  peticionProtegida.mockImplementation(async (ruta, opciones) => {
    if (ruta === '/api/animales/resumen') {
      return ANIMALES
    }
    if (ruta === '/api/subgrupos' && !opciones) {
      return lotes
    }
    if (ruta === '/api/subgrupos' && opciones?.method === 'POST') {
      const nuevo = { sbId: 13, sbDescripcion: 'Lote Nuevo', grupo: { grpId: 1 } }
      lotes = [...lotes, { ...nuevo, grupo: GRUPO }]
      return nuevo
    }
    if (ruta === '/api/grupos') {
      return [GRUPO]
    }
    if (ruta === '/api/personas') {
      return [{ perId: 5, perNombre: 'Ana', perApellido: 'Pérez', perTipo: 'EMPLEADO' }]
    }
    if (ruta === '/api/transferencias') {
      return respuestaTransferir(opciones)
    }
    return null
  })
})

afterEach(() => {
  vi.restoreAllMocks()
})

async function renderizar(props = {}) {
  const alTransferir = props.onTransferida ?? vi.fn()
  render(<PestanaNuevaTransferencia onTransferida={alTransferir} />)
  await screen.findByText('Animales')
  await waitFor(() => expect(screen.queryByText('Cargando animales y lotes…')).not.toBeInTheDocument())
  return { alTransferir }
}

/** La tabla y las tarjetas están las dos en el DOM: se usa la casilla de la tabla. */
function casilla(caravana) {
  return screen.getAllByRole('checkbox', { name: `Seleccionar ${caravana}` })[0]
}

function caravanasEnLaTabla() {
  const filas = within(screen.getByRole('table')).getAllByRole('row').slice(1)
  return filas.map((fila) => within(fila).getAllByRole('cell')[1].textContent.replace('ya está en el destino', ''))
}

function contador() {
  return screen.getAllByRole('status').find((nodo) => /seleccionad/.test(nodo.textContent))
}

describe('PestanaNuevaTransferencia: lista y filtros', () => {
  it('muestra solo los animales activos, ordenados de mayor a menor ganancia (sin GMD al final)', async () => {
    await renderizar()

    expect(caravanasEnLaTabla()).toEqual(['CAR-004', 'CAR-001', 'CAR-006', 'CAR-002', 'CAR-003'])
    expect(contador()).toHaveTextContent('0 seleccionados')
    expect(contador()).toHaveTextContent('GMD promedio: —')
  })

  it('el orden se puede invertir (menor a mayor)', async () => {
    const usuario = userEvent.setup()
    await renderizar()

    await usuario.selectOptions(screen.getByLabelText('Ordenar por ganancia'), 'asc')

    expect(caravanasEnLaTabla()).toEqual(['CAR-002', 'CAR-006', 'CAR-001', 'CAR-004', 'CAR-003'])
  })

  it('filtra por lote de origen y por "Sin lote"', async () => {
    const usuario = userEvent.setup()
    await renderizar()

    await usuario.selectOptions(screen.getByLabelText('Lote de origen'), '11')
    expect(caravanasEnLaTabla()).toEqual(['CAR-006', 'CAR-003'])

    await usuario.selectOptions(screen.getByLabelText('Lote de origen'), 'sin-lote')
    expect(caravanasEnLaTabla()).toEqual(['CAR-004'])
  })

  it('filtra por raza', async () => {
    const usuario = userEvent.setup()
    await renderizar()

    await usuario.selectOptions(screen.getByLabelText('Raza'), '2')

    expect(caravanasEnLaTabla()).toEqual(['CAR-006', 'CAR-002'])
  })

  it('filtra por GMD mínima y máxima, y los animales sin GMD quedan fuera', async () => {
    const usuario = userEvent.setup()
    await renderizar()

    await usuario.type(screen.getByLabelText('GMD mínima (kg/día)'), '1')
    expect(caravanasEnLaTabla()).toEqual(['CAR-004', 'CAR-001', 'CAR-006'])

    await usuario.type(screen.getByLabelText('GMD máxima (kg/día)'), '1,5')
    expect(caravanasEnLaTabla()).toEqual(['CAR-001', 'CAR-006'])
  })

  it('sin coincidencias muestra el mensaje y "Limpiar filtros" los restablece', async () => {
    const usuario = userEvent.setup()
    await renderizar()

    await usuario.type(screen.getByLabelText('GMD mínima (kg/día)'), '9')
    expect(screen.getByText('No hay animales que coincidan con los filtros')).toBeInTheDocument()

    await usuario.click(screen.getByRole('button', { name: 'Limpiar filtros' }))
    expect(caravanasEnLaTabla()).toHaveLength(5)
  })
})

describe('PestanaNuevaTransferencia: selección', () => {
  it('"Seleccionar todos los filtrados" marca solo los que cumplen el filtro y el contador muestra el promedio', async () => {
    const usuario = userEvent.setup()
    await renderizar()

    await usuario.selectOptions(screen.getByLabelText('Lote de origen'), '10')
    await usuario.click(screen.getByRole('button', { name: 'Seleccionar todos los filtrados' }))

    expect(contador()).toHaveTextContent('2 seleccionados')
    expect(contador()).toHaveTextContent('GMD promedio: 1,00 kg/día')
    expect(casilla('CAR-001')).toBeChecked()
    expect(casilla('CAR-002')).toBeChecked()

    // Los que no cumplían el filtro (Lote B) no se marcaron.
    await usuario.selectOptions(screen.getByLabelText('Lote de origen'), 'todos')
    expect(casilla('CAR-003')).not.toBeChecked()
    expect(casilla('CAR-006')).not.toBeChecked()
  })

  it('"Seleccionar los N de mayor ganancia" marca los N con más GMD, ignorando a los que no tienen', async () => {
    const usuario = userEvent.setup()
    await renderizar()

    await usuario.type(screen.getByLabelText('Cantidad de mayor ganancia'), '2')
    await usuario.click(screen.getByRole('button', { name: 'Seleccionar los N de mayor ganancia' }))

    expect(contador()).toHaveTextContent('2 seleccionados')
    expect(contador()).toHaveTextContent('GMD promedio: 1,85 kg/día')
    expect(casilla('CAR-004')).toBeChecked()
    expect(casilla('CAR-001')).toBeChecked()
    expect(casilla('CAR-006')).not.toBeChecked()
  })

  it('el N de mayor ganancia se calcula sobre los animales filtrados', async () => {
    const usuario = userEvent.setup()
    await renderizar()

    await usuario.selectOptions(screen.getByLabelText('Raza'), '2')
    await usuario.type(screen.getByLabelText('Cantidad de mayor ganancia'), '1')
    await usuario.click(screen.getByRole('button', { name: 'Seleccionar los N de mayor ganancia' }))

    expect(contador()).toHaveTextContent('1 seleccionado')
    expect(casilla('CAR-006')).toBeChecked()
  })

  it('con un N inválido no selecciona nada y lo avisa', async () => {
    const usuario = userEvent.setup()
    await renderizar()

    await usuario.click(screen.getByRole('button', { name: 'Seleccionar los N de mayor ganancia' }))

    expect(contador()).toHaveTextContent('0 seleccionados')
    expect(screen.getByText(/Ingresá un número entero mayor a 0/)).toBeInTheDocument()
  })

  it('la selección se mantiene al cambiar los filtros', async () => {
    const usuario = userEvent.setup()
    await renderizar()

    await usuario.click(casilla('CAR-001'))
    expect(contador()).toHaveTextContent('1 seleccionado')

    await usuario.selectOptions(screen.getByLabelText('Raza'), '2')
    expect(screen.queryByRole('checkbox', { name: 'Seleccionar CAR-001' })).not.toBeInTheDocument()
    expect(contador()).toHaveTextContent('1 seleccionado')

    await usuario.click(casilla('CAR-002'))
    expect(contador()).toHaveTextContent('2 seleccionados')

    await usuario.selectOptions(screen.getByLabelText('Raza'), 'todas')
    expect(casilla('CAR-001')).toBeChecked()
    expect(casilla('CAR-002')).toBeChecked()
  })

  it('"Limpiar selección" la vacía', async () => {
    const usuario = userEvent.setup()
    await renderizar()

    await usuario.click(casilla('CAR-001'))
    await usuario.click(screen.getByRole('button', { name: 'Limpiar selección' }))

    expect(contador()).toHaveTextContent('0 seleccionados')
    expect(casilla('CAR-001')).not.toBeChecked()
  })

  it('el promedio de la selección ignora a los animales sin GMD', async () => {
    const usuario = userEvent.setup()
    await renderizar()

    await usuario.click(casilla('CAR-001'))
    await usuario.click(casilla('CAR-003')) // sin GMD

    expect(contador()).toHaveTextContent('2 seleccionados')
    expect(contador()).toHaveTextContent('GMD promedio: 1,50 kg/día')
  })
})

describe('PestanaNuevaTransferencia: lote de destino', () => {
  it('los animales que ya están en el destino quedan deshabilitados con su etiqueta', async () => {
    const usuario = userEvent.setup()
    await renderizar()

    await usuario.selectOptions(screen.getByLabelText('Lote de destino'), '10')

    expect(casilla('CAR-001')).toBeDisabled()
    expect(casilla('CAR-002')).toBeDisabled()
    expect(casilla('CAR-003')).toBeEnabled()
    // Dos animales, cada uno en la tabla y en las tarjetas.
    expect(screen.getAllByText('ya está en el destino')).toHaveLength(4)
  })

  it('"Seleccionar todos los filtrados" no marca a los que ya están en el destino', async () => {
    const usuario = userEvent.setup()
    await renderizar()

    await usuario.selectOptions(screen.getByLabelText('Lote de destino'), '10')
    await usuario.click(screen.getByRole('button', { name: 'Seleccionar todos los filtrados' }))

    expect(contador()).toHaveTextContent('3 seleccionados')
    expect(casilla('CAR-001')).not.toBeChecked()
  })

  it('si un animal ya marcado queda en el destino al elegirlo, deja de contar en la selección', async () => {
    const usuario = userEvent.setup()
    await renderizar()

    await usuario.click(casilla('CAR-001'))
    await usuario.click(casilla('CAR-003'))
    expect(contador()).toHaveTextContent('2 seleccionados')

    await usuario.selectOptions(screen.getByLabelText('Lote de destino'), '10')
    expect(contador()).toHaveTextContent('1 seleccionado')
  })

  it('ofrece los lotes agrupados por grupo', async () => {
    await renderizar()

    const grupo = screen.getByRole('group', { name: 'Invernada' })
    expect(within(grupo).getAllByRole('option').map((opcion) => opcion.textContent)).toEqual([
      'Lote A',
      'Lote B',
      'Lote C',
    ])
  })

  it('crear un lote con "+" lo deja elegido como destino', async () => {
    const usuario = userEvent.setup()
    await renderizar()

    await usuario.click(screen.getByRole('button', { name: 'Agregar lote nuevo' }))
    await usuario.type(await screen.findByLabelText('Nombre del lote'), 'Lote Nuevo')
    await waitFor(() => expect(screen.getByLabelText('Grupo')).toBeEnabled())
    await usuario.selectOptions(screen.getByLabelText('Grupo'), '1')
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))

    await waitFor(() => expect(screen.getByLabelText('Lote de destino')).toHaveValue('13'))
    expect(within(screen.getByLabelText('Lote de destino')).getByRole('option', { name: 'Lote Nuevo' })).toBeInTheDocument()
  })
})

describe('PestanaNuevaTransferencia: validación y envío', () => {
  async function prepararEnvio(usuario) {
    const { alTransferir } = await renderizar()
    await usuario.click(casilla('CAR-004')) // sin lote, GMD 2,2
    await usuario.selectOptions(screen.getByLabelText('Lote de destino'), '11')
    return alTransferir
  }

  it('sin animales seleccionados avisa y no abre la confirmación', async () => {
    const usuario = userEvent.setup()
    await renderizar()
    await usuario.selectOptions(screen.getByLabelText('Lote de destino'), '11')

    await usuario.click(screen.getByRole('button', { name: 'Transferir' }))

    expect(screen.getByText('Seleccioná al menos un animal')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('sin lote de destino avisa y no abre la confirmación', async () => {
    const usuario = userEvent.setup()
    await renderizar()
    await usuario.click(casilla('CAR-004'))

    await usuario.click(screen.getByRole('button', { name: 'Transferir' }))

    expect(screen.getByText('Elegí el lote de destino')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('con motivo Otro la nota es obligatoria', async () => {
    const usuario = userEvent.setup()
    await prepararEnvio(usuario)
    await usuario.selectOptions(screen.getByLabelText('Motivo'), 'OTRO')

    await usuario.click(screen.getByRole('button', { name: 'Transferir' }))

    expect(screen.getByText('Ingresá la nota: es obligatoria con el motivo Otro')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByLabelText(/Nota/)).toHaveFocus()
  })

  it('con motivo Otro y una nota sí abre la confirmación', async () => {
    const usuario = userEvent.setup()
    await prepararEnvio(usuario)
    await usuario.selectOptions(screen.getByLabelText('Motivo'), 'OTRO')
    await usuario.type(screen.getByLabelText(/Nota/), 'Mejor pastura')

    await usuario.click(screen.getByRole('button', { name: 'Transferir' }))

    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('la nota tiene un máximo de 255 caracteres', async () => {
    await renderizar()
    expect(screen.getByLabelText(/Nota/)).toHaveAttribute('maxlength', '255')
  })

  it('no permite una fecha futura', async () => {
    const usuario = userEvent.setup()
    await prepararEnvio(usuario)
    expect(screen.getByLabelText('Fecha')).toHaveAttribute('max', fechaHoyIso())
  })

  it('"Transferir" abre la confirmación con la cantidad, los lotes de origen y el destino', async () => {
    const usuario = userEvent.setup()
    await prepararEnvio(usuario)
    await usuario.click(casilla('CAR-001')) // Lote A

    await usuario.click(screen.getByRole('button', { name: 'Transferir' }))

    const dialogo = screen.getByRole('dialog', { name: 'Confirmar transferencia' })
    expect(within(dialogo).getByText('Vas a mover 2 animales de Lote A, Sin lote a Lote B.')).toBeInTheDocument()
  })

  it('al confirmar envía el POST con los datos, avisa y no se queda en "transfiriendo"', async () => {
    const usuario = userEvent.setup()
    const alTransferir = await prepararEnvio(usuario)
    await usuario.type(screen.getByLabelText(/Nota/), '  Aislamiento  ')

    await usuario.click(screen.getByRole('button', { name: 'Transferir' }))
    await usuario.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Confirmar' }))

    await waitFor(() => expect(alTransferir).toHaveBeenCalledWith('1 animal transferido a Lote B'))
    const [, opciones] = peticionProtegida.mock.calls.find(([ruta]) => ruta === '/api/transferencias')
    expect(opciones.method).toBe('POST')
    expect(JSON.parse(opciones.body)).toEqual({
      fecha: fechaHoyIso(),
      motivo: 'SELECCION',
      nota: 'Aislamiento',
      destinoId: 11,
      responsableId: 5,
      animalIds: [4],
    })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('con varios animales el aviso va en plural', async () => {
    const usuario = userEvent.setup()
    const alTransferir = await prepararEnvio(usuario)
    await usuario.click(casilla('CAR-001'))

    await usuario.click(screen.getByRole('button', { name: 'Transferir' }))
    await usuario.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Confirmar' }))

    await waitFor(() => expect(alTransferir).toHaveBeenCalledWith('2 animales transferidos a Lote B'))
  })

  it('un error del backend se muestra en español dentro de la confirmación, sin cerrarla', async () => {
    const usuario = userEvent.setup()
    respuestaTransferir = async () => {
      throw new ErrorHttp(409, 'El animal CAR-004 tiene una salida registrada: no se puede transferir')
    }
    const alTransferir = await prepararEnvio(usuario)

    await usuario.click(screen.getByRole('button', { name: 'Transferir' }))
    await usuario.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Confirmar' }))

    expect(
      await within(screen.getByRole('dialog')).findByText(
        'El animal CAR-004 tiene una salida registrada: no se puede transferir',
      ),
    ).toBeInTheDocument()
    expect(alTransferir).not.toHaveBeenCalled()
    expect(within(screen.getByRole('dialog')).getByRole('button', { name: 'Confirmar' })).toBeEnabled()
  })

  it('"Cancelar" en la confirmación vuelve al formulario sin enviar nada', async () => {
    const usuario = userEvent.setup()
    await prepararEnvio(usuario)

    await usuario.click(screen.getByRole('button', { name: 'Transferir' }))
    await usuario.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancelar' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(peticionProtegida).not.toHaveBeenCalledWith('/api/transferencias', expect.anything())
  })
})
