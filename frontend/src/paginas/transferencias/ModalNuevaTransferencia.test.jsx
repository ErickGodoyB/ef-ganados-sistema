import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ErrorHttp, peticionProtegida } from '../../api/cliente'
import { fechaHoyIso } from '../../utilidades/fechas'
import ModalNuevaTransferencia from './ModalNuevaTransferencia'

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
    aniPesoInicial: 200,
    cantidadPesajes: 2,
    gananciaTotal: 50,
    gmdAcumulado: 1,
    proveedorId: null,
    proveedorNombre: null,
    pesoAnterior: null,
    fechaPesoAnterior: null,
    pesoAnteriorEsIngreso: false,
    fechaUltimoPesaje: null,
    gmd: 1,
    aptoVenta: false,
    aniFechaEgreso: null,
    ...extra,
  }
}

const ANIMALES = [
  animal(1, 'CAR-001', {
    gmd: 1.5,
    pesoActual: 300,
    pesoAnterior: 200,
    fechaPesoAnterior: '2026-01-01',
    pesoAnteriorEsIngreso: true,
    fechaUltimoPesaje: '2026-01-31',
  }),
  animal(2, 'CAR-002', {
    gmd: 0.5,
    razaId: 2,
    razaDescripcion: 'Nelore',
    pesoActual: 200,
    pesoAnterior: 190,
    fechaPesoAnterior: '2026-02-01',
    fechaUltimoPesaje: '2026-03-03',
  }),
  animal(3, 'CAR-003', {
    gmd: null,
    subGrupoId: 11,
    subGrupoDescripcion: 'Lote B',
    pesoActual: 220,
    cantidadPesajes: 0,
    gananciaTotal: null,
    gmdAcumulado: null,
  }),
  animal(4, 'CAR-004', {
    gmd: 2.2,
    pesoActual: 350,
    subGrupoId: null,
    subGrupoDescripcion: null,
    grupoDescripcion: null,
  }),
  animal(5, 'CAR-005', { gmd: 3, aniFechaEgreso: '2026-06-01' }),
  animal(6, 'CAR-006', {
    gmd: 1.0,
    razaId: 2,
    razaDescripcion: 'Nelore',
    pesoActual: 260,
    subGrupoId: 11,
    subGrupoDescripcion: 'Lote B',
  }),
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

async function renderizar() {
  const onCerrar = vi.fn()
  const onTransferida = vi.fn()
  render(<ModalNuevaTransferencia onCerrar={onCerrar} onTransferida={onTransferida} refDisparador={{ current: null }} />)
  await screen.findByLabelText('Lote de origen')
  return { onCerrar, onTransferida }
}

async function elegirOrigen(usuario, valor) {
  await usuario.selectOptions(screen.getByLabelText('Lote de origen'), valor)
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

describe('ModalNuevaTransferencia: lote de origen', () => {
  it('sin lote de origen avisa que hay que elegirlo y no muestra la lista ni sus filtros', async () => {
    await renderizar()

    expect(screen.getByText('Elegí un lote de origen para ver los animales disponibles')).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Raza')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Seleccionar todos los filtrados' })).not.toBeInTheDocument()
  })

  it('ofrece "Sin lote" y los lotes que tienen animales activos', async () => {
    await renderizar()

    const opciones = within(screen.getByLabelText('Lote de origen')).getAllByRole('option')
    expect(opciones.map((opcion) => opcion.textContent)).toEqual([
      'Elegí un lote de origen',
      'Sin lote',
      'Lote A — Invernada',
      'Lote B — Invernada',
    ])
  })

  it('al elegirlo se listan solo los animales activos de ese lote, y el aviso desaparece', async () => {
    const usuario = userEvent.setup()
    await renderizar()

    await elegirOrigen(usuario, '10')

    expect(caravanasEnLaTabla()).toEqual(['CAR-001', 'CAR-002'])
    expect(screen.queryByText('Elegí un lote de origen para ver los animales disponibles')).not.toBeInTheDocument()
  })

  it('"Sin lote" lista los animales que no tienen lote', async () => {
    const usuario = userEvent.setup()
    await renderizar()

    await elegirOrigen(usuario, 'sin-lote')

    expect(caravanasEnLaTabla()).toEqual(['CAR-004'])
  })

  it('volver a "Elegí un lote de origen" esconde la lista otra vez', async () => {
    const usuario = userEvent.setup()
    await renderizar()
    await elegirOrigen(usuario, '10')

    await elegirOrigen(usuario, '')

    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    expect(screen.getByText('Elegí un lote de origen para ver los animales disponibles')).toBeInTheDocument()
  })
})

describe('ModalNuevaTransferencia: columnas', () => {
  it('muestra el peso anterior con su fecha y los días hasta el último pesaje, y "ingreso" si el anterior es el ingreso', async () => {
    const usuario = userEvent.setup()
    await renderizar()
    await elegirOrigen(usuario, '10')

    const [fila1, fila2] = within(screen.getByRole('table')).getAllByRole('row').slice(1)
    expect(within(fila1).getByText('300,0 kg')).toBeInTheDocument()
    // 200 kg es el peso de ingreso (columna propia) y también el anterior, porque el anterior es el ingreso.
    expect(within(fila1).getAllByText('200,0 kg')).toHaveLength(2)
    expect(within(fila1).getByText('ingreso')).toBeInTheDocument()
    expect(within(fila1).getByText('01/01/2026 · hace 30 días')).toBeInTheDocument()
    expect(within(fila2).getByText('190,0 kg')).toBeInTheDocument()
    expect(within(fila2).getByText('01/02/2026 · hace 30 días')).toBeInTheDocument()
    expect(within(fila2).queryByText('ingreso')).not.toBeInTheDocument()
  })

  it('un animal sin pesajes muestra "Sin pesajes" y "—" en la ganancia total, el peso anterior y la GMD', async () => {
    const usuario = userEvent.setup()
    await renderizar()
    await elegirOrigen(usuario, '11')

    const fila = within(screen.getByRole('table')).getAllByRole('row').find((f) => within(f).queryByText('CAR-003'))
    expect(within(fila).getAllByText('—')).toHaveLength(3)
    expect(within(fila).getByText('Sin pesajes')).toBeInTheDocument()
  })

  it('las columnas son casilla, caravana, raza, proveedor, pesajes, peso de ingreso, peso actual, ganancia total, peso anterior y GMD', async () => {
    const usuario = userEvent.setup()
    await renderizar()
    await elegirOrigen(usuario, '10')

    const encabezados = within(screen.getByRole('table')).getAllByRole('columnheader')
    expect(encabezados.map((encabezado) => encabezado.textContent)).toEqual([
      'Selección',
      'Caravana',
      'Raza',
      'Proveedor',
      'Pesajes',
      'Peso de ingreso',
      'Peso actual',
      'Ganancia total',
      'Peso anterior',
      'GMD',
    ])
  })

  it('las tarjetas (celular) muestran los mismos datos', async () => {
    const usuario = userEvent.setup()
    await renderizar()
    await elegirOrigen(usuario, '10')

    // La tarjeta es el <article>; el mismo animal está también en la tabla.
    const tarjeta = screen.getAllByRole('article')[0]
    expect(within(tarjeta).getByText('CAR-001')).toBeInTheDocument()
    expect(within(tarjeta).getByText('300,0 kg')).toBeInTheDocument()
    expect(within(tarjeta).getByText('Brangus')).toBeInTheDocument()
    expect(within(tarjeta).getByText('01/01/2026 · hace 30 días')).toBeInTheDocument()
    expect(within(tarjeta).getByText('ingreso')).toBeInTheDocument()
  })
})

describe('ModalNuevaTransferencia: filtros y orden', () => {
  it('ordena por GMD de mayor a menor por defecto, con los que no tienen GMD al final', async () => {
    const usuario = userEvent.setup()
    await renderizar()

    await elegirOrigen(usuario, '11')

    expect(caravanasEnLaTabla()).toEqual(['CAR-006', 'CAR-003'])
    expect(screen.getByLabelText('Ordenar por')).toHaveValue('gmd:desc')
  })

  it('ordena por peso actual en las dos direcciones', async () => {
    const usuario = userEvent.setup()
    await renderizar()
    await elegirOrigen(usuario, '11')

    await usuario.selectOptions(screen.getByLabelText('Ordenar por'), 'pesoActual:asc')
    expect(caravanasEnLaTabla()).toEqual(['CAR-003', 'CAR-006'])

    await usuario.selectOptions(screen.getByLabelText('Ordenar por'), 'pesoActual:desc')
    expect(caravanasEnLaTabla()).toEqual(['CAR-006', 'CAR-003'])
  })

  it('ordena por GMD de menor a mayor', async () => {
    const usuario = userEvent.setup()
    await renderizar()
    await elegirOrigen(usuario, '10')

    await usuario.selectOptions(screen.getByLabelText('Ordenar por'), 'gmd:asc')

    expect(caravanasEnLaTabla()).toEqual(['CAR-002', 'CAR-001'])
  })

  it('filtra por raza', async () => {
    const usuario = userEvent.setup()
    await renderizar()
    await elegirOrigen(usuario, '10')

    await usuario.selectOptions(screen.getByLabelText('Raza'), '2')

    expect(caravanasEnLaTabla()).toEqual(['CAR-002'])
  })

  it('filtra por GMD mínima y máxima, y los animales sin GMD quedan fuera', async () => {
    const usuario = userEvent.setup()
    await renderizar()
    await elegirOrigen(usuario, '11')

    await usuario.type(screen.getByLabelText('GMD mínima (kg/día)'), '0,5')
    expect(caravanasEnLaTabla()).toEqual(['CAR-006'])

    await usuario.type(screen.getByLabelText('GMD máxima (kg/día)'), '0,9')
    expect(screen.getByText('No hay animales que coincidan con los filtros')).toBeInTheDocument()
  })

  it('un límite a medio escribir se ignora, y "Limpiar filtros" restablece todo', async () => {
    const usuario = userEvent.setup()
    await renderizar()
    await elegirOrigen(usuario, '11')

    await usuario.type(screen.getByLabelText('GMD mínima (kg/día)'), '-')
    expect(caravanasEnLaTabla()).toEqual(['CAR-006', 'CAR-003'])

    await usuario.clear(screen.getByLabelText('GMD mínima (kg/día)'))
    await usuario.type(screen.getByLabelText('GMD mínima (kg/día)'), '9')
    await usuario.click(screen.getByRole('button', { name: 'Limpiar filtros' }))

    expect(caravanasEnLaTabla()).toEqual(['CAR-006', 'CAR-003'])
  })
})

describe('ModalNuevaTransferencia: selección', () => {
  it('"Seleccionar todos los filtrados" marca los del lote de origen que se ven, y el contador muestra el promedio', async () => {
    const usuario = userEvent.setup()
    await renderizar()
    await elegirOrigen(usuario, '10')

    await usuario.click(screen.getByRole('button', { name: 'Seleccionar todos los filtrados' }))

    expect(contador()).toHaveTextContent('2 seleccionados')
    expect(contador()).toHaveTextContent('GMD promedio: 1,00 kg/día')
    expect(casilla('CAR-001')).toBeChecked()
    expect(casilla('CAR-002')).toBeChecked()
  })

  it('"Seleccionar todos los filtrados" respeta los filtros', async () => {
    const usuario = userEvent.setup()
    await renderizar()
    await elegirOrigen(usuario, '10')
    await usuario.selectOptions(screen.getByLabelText('Raza'), '2')

    await usuario.click(screen.getByRole('button', { name: 'Seleccionar todos los filtrados' }))

    expect(contador()).toHaveTextContent('1 seleccionado')
    await usuario.selectOptions(screen.getByLabelText('Raza'), 'todas')
    expect(casilla('CAR-001')).not.toBeChecked()
  })

  it('"Seleccionar los N de mayor ganancia" marca los N con más GMD del lote de origen', async () => {
    const usuario = userEvent.setup()
    await renderizar()
    await elegirOrigen(usuario, '10')

    await usuario.type(screen.getByLabelText('Cantidad de mayor ganancia'), '1')
    await usuario.click(screen.getByRole('button', { name: 'Seleccionar los N de mayor ganancia' }))

    expect(contador()).toHaveTextContent('1 seleccionado')
    expect(contador()).toHaveTextContent('GMD promedio: 1,50 kg/día')
    expect(casilla('CAR-001')).toBeChecked()
    expect(casilla('CAR-002')).not.toBeChecked()
  })

  it('con un N inválido no selecciona nada y lo avisa', async () => {
    const usuario = userEvent.setup()
    await renderizar()
    await elegirOrigen(usuario, '10')

    await usuario.click(screen.getByRole('button', { name: 'Seleccionar los N de mayor ganancia' }))

    expect(contador()).toHaveTextContent('0 seleccionados')
    expect(screen.getByText(/Ingresá un número entero mayor a 0/)).toBeInTheDocument()
  })

  it('la selección se mantiene al cambiar de lote de origen: se pueden combinar animales de varios lotes', async () => {
    const usuario = userEvent.setup()
    await renderizar()
    await elegirOrigen(usuario, '10')
    await usuario.click(casilla('CAR-001'))

    await elegirOrigen(usuario, '11')
    expect(screen.queryByRole('checkbox', { name: 'Seleccionar CAR-001' })).not.toBeInTheDocument()
    expect(contador()).toHaveTextContent('1 seleccionado')
    await usuario.click(casilla('CAR-006'))
    expect(contador()).toHaveTextContent('2 seleccionados')
    expect(contador()).toHaveTextContent('GMD promedio: 1,25 kg/día')

    await elegirOrigen(usuario, '10')
    expect(casilla('CAR-001')).toBeChecked()
  })

  it('la selección también se mantiene al cambiar los filtros', async () => {
    const usuario = userEvent.setup()
    await renderizar()
    await elegirOrigen(usuario, '10')
    await usuario.click(casilla('CAR-001'))

    await usuario.selectOptions(screen.getByLabelText('Raza'), '2')
    expect(contador()).toHaveTextContent('1 seleccionado')
    await usuario.selectOptions(screen.getByLabelText('Raza'), 'todas')
    expect(casilla('CAR-001')).toBeChecked()
  })

  it('"Limpiar selección" la vacía', async () => {
    const usuario = userEvent.setup()
    await renderizar()
    await elegirOrigen(usuario, '10')
    await usuario.click(casilla('CAR-001'))

    await usuario.click(screen.getByRole('button', { name: 'Limpiar selección' }))

    expect(contador()).toHaveTextContent('0 seleccionados')
    expect(casilla('CAR-001')).not.toBeChecked()
  })

  it('el promedio de la selección ignora a los animales sin GMD', async () => {
    const usuario = userEvent.setup()
    await renderizar()
    await elegirOrigen(usuario, '11')

    await usuario.click(casilla('CAR-006'))
    await usuario.click(casilla('CAR-003')) // sin GMD

    expect(contador()).toHaveTextContent('2 seleccionados')
    expect(contador()).toHaveTextContent('GMD promedio: 1,00 kg/día')
  })

  it('sin selección el contador dice 0 seleccionados y GMD promedio "—"', async () => {
    await renderizar()

    expect(contador()).toHaveTextContent('0 seleccionados')
    expect(contador()).toHaveTextContent('GMD promedio: —')
  })
})

describe('ModalNuevaTransferencia: lote de destino', () => {
  it('los animales que ya están en el destino quedan deshabilitados con su etiqueta', async () => {
    const usuario = userEvent.setup()
    await renderizar()
    await elegirOrigen(usuario, '10')

    await usuario.selectOptions(screen.getByLabelText('Lote de destino'), '10')

    expect(casilla('CAR-001')).toBeDisabled()
    expect(casilla('CAR-002')).toBeDisabled()
    // Dos animales, cada uno en la tabla y en las tarjetas.
    expect(screen.getAllByText('ya está en el destino')).toHaveLength(4)
  })

  it('"Seleccionar todos los filtrados" no marca a los que ya están en el destino', async () => {
    const usuario = userEvent.setup()
    await renderizar()
    await usuario.selectOptions(screen.getByLabelText('Lote de destino'), '10')
    await elegirOrigen(usuario, '10')

    await usuario.click(screen.getByRole('button', { name: 'Seleccionar todos los filtrados' }))

    expect(contador()).toHaveTextContent('0 seleccionados')
    expect(screen.getByText('No hay animales nuevos para agregar a la selección')).toBeInTheDocument()
  })

  it('si un animal ya marcado queda en el destino al elegirlo, deja de contar en la selección', async () => {
    const usuario = userEvent.setup()
    await renderizar()
    await elegirOrigen(usuario, '10')
    await usuario.click(casilla('CAR-001'))
    await elegirOrigen(usuario, '11')
    await usuario.click(casilla('CAR-006'))
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

describe('ModalNuevaTransferencia: validación, confirmación y envío', () => {
  /** Marca CAR-004 (sin lote, GMD 2,2) y elige como destino el lote B. */
  async function prepararEnvio(usuario) {
    const funciones = await renderizar()
    await elegirOrigen(usuario, 'sin-lote')
    await usuario.click(casilla('CAR-004'))
    await usuario.selectOptions(screen.getByLabelText('Lote de destino'), '11')
    return funciones
  }

  it('sin animales seleccionados avisa y no abre la confirmación', async () => {
    const usuario = userEvent.setup()
    await renderizar()
    await usuario.selectOptions(screen.getByLabelText('Lote de destino'), '11')

    await usuario.click(screen.getByRole('button', { name: 'Transferir' }))

    expect(screen.getByText('Seleccioná al menos un animal')).toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: 'Nueva transferencia' })).toBeInTheDocument()
  })

  it('sin lote de destino avisa y no abre la confirmación', async () => {
    const usuario = userEvent.setup()
    await renderizar()
    await elegirOrigen(usuario, 'sin-lote')
    await usuario.click(casilla('CAR-004'))

    await usuario.click(screen.getByRole('button', { name: 'Transferir' }))

    expect(screen.getByText('Elegí el lote de destino')).toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: 'Nueva transferencia' })).toBeInTheDocument()
  })

  it('con motivo Otro la nota es obligatoria', async () => {
    const usuario = userEvent.setup()
    await prepararEnvio(usuario)
    await usuario.selectOptions(screen.getByLabelText('Motivo'), 'OTRO')

    await usuario.click(screen.getByRole('button', { name: 'Transferir' }))

    expect(screen.getByText('Ingresá la nota: es obligatoria con el motivo Otro')).toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: 'Nueva transferencia' })).toBeInTheDocument()
    expect(screen.getByLabelText(/Nota/)).toHaveFocus()
  })

  it('con motivo Otro y una nota sí pasa a la confirmación', async () => {
    const usuario = userEvent.setup()
    await prepararEnvio(usuario)
    await usuario.selectOptions(screen.getByLabelText('Motivo'), 'OTRO')
    await usuario.type(screen.getByLabelText(/Nota/), 'Mejor pastura')

    await usuario.click(screen.getByRole('button', { name: 'Transferir' }))

    expect(screen.getByRole('dialog', { name: 'Confirmar transferencia' })).toBeInTheDocument()
  })

  it('la nota tiene un máximo de 255 caracteres y la fecha no puede ser futura', async () => {
    await renderizar()

    expect(screen.getByLabelText(/Nota/)).toHaveAttribute('maxlength', '255')
    expect(screen.getByLabelText('Fecha')).toHaveAttribute('max', fechaHoyIso())
    expect(screen.getByLabelText('Fecha')).toHaveValue(fechaHoyIso())
  })

  it('"Transferir" muestra la confirmación con la cantidad, los lotes de origen (de varios lotes) y el destino', async () => {
    const usuario = userEvent.setup()
    await prepararEnvio(usuario)
    await elegirOrigen(usuario, '10')
    await usuario.click(casilla('CAR-001')) // Lote A

    await usuario.click(screen.getByRole('button', { name: 'Transferir' }))

    const dialogo = screen.getByRole('dialog', { name: 'Confirmar transferencia' })
    expect(within(dialogo).getByText('Vas a mover 2 animales de Lote A, Sin lote a Lote B.')).toBeInTheDocument()
  })

  it('"Volver" regresa al formulario con todo como estaba', async () => {
    const usuario = userEvent.setup()
    const { onCerrar } = await prepararEnvio(usuario)
    await usuario.click(screen.getByRole('button', { name: 'Transferir' }))

    await usuario.click(screen.getByRole('button', { name: 'Volver' }))

    expect(screen.getByRole('dialog', { name: 'Nueva transferencia' })).toBeInTheDocument()
    expect(contador()).toHaveTextContent('1 seleccionado')
    expect(screen.getByLabelText('Lote de destino')).toHaveValue('11')
    expect(onCerrar).not.toHaveBeenCalled()
    expect(peticionProtegida).not.toHaveBeenCalledWith('/api/transferencias', expect.anything())
  })

  it('Escape en la confirmación vuelve al formulario en vez de cerrar el modal', async () => {
    const usuario = userEvent.setup()
    const { onCerrar } = await prepararEnvio(usuario)
    await usuario.click(screen.getByRole('button', { name: 'Transferir' }))

    await usuario.keyboard('{Escape}')

    expect(screen.getByRole('dialog', { name: 'Nueva transferencia' })).toBeInTheDocument()
    expect(onCerrar).not.toHaveBeenCalled()
  })

  it('"Cancelar" cierra el modal sin enviar nada', async () => {
    const usuario = userEvent.setup()
    const { onCerrar } = await prepararEnvio(usuario)

    await usuario.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(onCerrar).toHaveBeenCalledTimes(1)
    expect(peticionProtegida).not.toHaveBeenCalledWith('/api/transferencias', expect.anything())
  })

  it('al confirmar envía el POST con los datos y avisa a la pantalla', async () => {
    const usuario = userEvent.setup()
    const { onTransferida } = await prepararEnvio(usuario)
    await usuario.type(screen.getByLabelText(/Nota/), '  Aislamiento  ')

    await usuario.click(screen.getByRole('button', { name: 'Transferir' }))
    await usuario.click(screen.getByRole('button', { name: 'Confirmar' }))

    await waitFor(() => expect(onTransferida).toHaveBeenCalledWith('1 animal transferido a Lote B'))
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
  })

  it('con varios animales de distintos lotes envía todos los ids y el aviso va en plural', async () => {
    const usuario = userEvent.setup()
    const { onTransferida } = await prepararEnvio(usuario)
    await elegirOrigen(usuario, '10')
    await usuario.click(casilla('CAR-001'))

    await usuario.click(screen.getByRole('button', { name: 'Transferir' }))
    await usuario.click(screen.getByRole('button', { name: 'Confirmar' }))

    await waitFor(() => expect(onTransferida).toHaveBeenCalledWith('2 animales transferidos a Lote B'))
    const [, opciones] = peticionProtegida.mock.calls.find(([ruta]) => ruta === '/api/transferencias')
    expect(JSON.parse(opciones.body).animalIds.sort()).toEqual([1, 4])
  })

  it('un error del backend se muestra en español en la confirmación, sin cerrar ni avisar éxito', async () => {
    const usuario = userEvent.setup()
    respuestaTransferir = async () => {
      throw new ErrorHttp(409, 'El animal CAR-004 tiene una salida registrada: no se puede transferir')
    }
    const { onTransferida } = await prepararEnvio(usuario)

    await usuario.click(screen.getByRole('button', { name: 'Transferir' }))
    await usuario.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(
      await screen.findByText('El animal CAR-004 tiene una salida registrada: no se puede transferir'),
    ).toBeInTheDocument()
    expect(onTransferida).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Confirmar' })).toBeEnabled()
  })
})
