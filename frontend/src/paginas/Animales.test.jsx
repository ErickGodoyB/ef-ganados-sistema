import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { peticionProtegida } from '../api/cliente'
import Animales from './Animales'

vi.mock('../api/cliente', () => ({
  peticionProtegida: vi.fn(),
  ErrorHttp: class ErrorHttp extends Error {},
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
    aniPesoInicial: 200,
    pesoActual: 250,
    gmd: 1,
    aptoVenta: false,
    aniFechaIngreso: '2026-01-01',
    aniFechaEgreso: null,
    ...extra,
  }
}

const ANIMALES = [
  animal(1, 'CAR-001', { gmd: 1.5 }),
  animal(2, 'CAR-002', { gmd: 0.5, razaId: 2, razaDescripcion: 'Nelore' }),
  animal(3, 'CAR-003', { gmd: null }),
  animal(4, 'CAR-004', { gmd: 2.2, razaId: 2, razaDescripcion: 'Nelore' }),
]

beforeEach(() => {
  localStorage.clear()
  peticionProtegida.mockImplementation(async (ruta) => (ruta === '/api/animales/resumen' ? ANIMALES : null))
})

afterEach(() => {
  vi.restoreAllMocks()
})

async function renderizar(ruta = '/animales') {
  render(
    <MemoryRouter initialEntries={[ruta]}>
      <Animales />
    </MemoryRouter>,
  )
  await waitFor(() => expect(screen.queryByText('Cargando animales…')).not.toBeInTheDocument())
}

/** Caravanas de la tabla (no de las tarjetas, que están las dos en el DOM), en el orden en que se muestran. */
function caravanasEnLaTabla() {
  return within(screen.getByRole('table'))
    .getAllByRole('row')
    .slice(1)
    .map((fila) => within(fila).getAllByRole('button')[0].textContent)
}

describe('Animales: caravana en la URL', () => {
  it('?caravana= precarga el buscador y filtra el listado', async () => {
    await renderizar('/animales?caravana=CAR-003')

    expect(screen.getByLabelText('Buscar por caravana')).toHaveValue('CAR-003')
    expect(caravanasEnLaTabla()).toEqual(['CAR-003'])
  })

  it('sin el parámetro el buscador arranca vacío', async () => {
    await renderizar()

    expect(screen.getByLabelText('Buscar por caravana')).toHaveValue('')
  })
})

describe('Animales: filtros de raza y GMD', () => {
  it('sin filtros activos no muestra el indicador ni "Limpiar filtros"', async () => {
    await renderizar()

    expect(caravanasEnLaTabla()).toEqual(['CAR-001', 'CAR-002', 'CAR-003', 'CAR-004'])
    expect(screen.queryByText(/filtros? activos?/)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Limpiar filtros' })).not.toBeInTheDocument()
  })

  it('ofrece las razas presentes y filtra por la elegida', async () => {
    const usuario = userEvent.setup()
    await renderizar()

    const filtroRaza = screen.getByLabelText('Raza')
    expect(within(filtroRaza).getAllByRole('option').map((o) => o.textContent)).toEqual([
      'Todas las razas',
      'Brangus',
      'Nelore',
    ])

    await usuario.selectOptions(filtroRaza, '2')

    expect(caravanasEnLaTabla()).toEqual(['CAR-002', 'CAR-004'])
    expect(screen.getByText('1 filtro activo')).toBeInTheDocument()
  })

  it('la GMD mínima deja a los que la alcanzan y saca a los que no tienen GMD', async () => {
    const usuario = userEvent.setup()
    await renderizar()

    await usuario.type(screen.getByLabelText('GMD mínima (kg/día)'), '1')

    expect(caravanasEnLaTabla()).toEqual(['CAR-001', 'CAR-004'])
    expect(screen.getByText('1 filtro activo')).toBeInTheDocument()
  })

  it('la GMD máxima acepta coma decimal y también saca a los que no tienen GMD', async () => {
    const usuario = userEvent.setup()
    await renderizar()

    await usuario.type(screen.getByLabelText('GMD máxima (kg/día)'), '1,5')

    expect(caravanasEnLaTabla()).toEqual(['CAR-001', 'CAR-002'])
  })

  it('mínima y máxima juntas cuentan como dos filtros', async () => {
    const usuario = userEvent.setup()
    await renderizar()

    await usuario.type(screen.getByLabelText('GMD mínima (kg/día)'), '0,5')
    await usuario.type(screen.getByLabelText('GMD máxima (kg/día)'), '1,5')

    expect(caravanasEnLaTabla()).toEqual(['CAR-001', 'CAR-002'])
    expect(screen.getByText('2 filtros activos')).toBeInTheDocument()
  })

  it('un límite a medio escribir ("-" o ",") se ignora: no filtra ni cuenta como filtro', async () => {
    const usuario = userEvent.setup()
    await renderizar()

    await usuario.type(screen.getByLabelText('GMD mínima (kg/día)'), '-')
    await usuario.type(screen.getByLabelText('GMD máxima (kg/día)'), ',')

    expect(caravanasEnLaTabla()).toEqual(['CAR-001', 'CAR-002', 'CAR-003', 'CAR-004'])
    expect(screen.queryByText(/filtros? activos?/)).not.toBeInTheDocument()
  })

  it('combina raza y GMD', async () => {
    const usuario = userEvent.setup()
    await renderizar()

    await usuario.selectOptions(screen.getByLabelText('Raza'), '2')
    await usuario.type(screen.getByLabelText('GMD mínima (kg/día)'), '1')

    expect(caravanasEnLaTabla()).toEqual(['CAR-004'])
    expect(screen.getByText('2 filtros activos')).toBeInTheDocument()
  })
})

describe('Animales: orden por GMD', () => {
  it('"Mayor a menor" ordena por GMD descendente, con los que no tienen GMD al final', async () => {
    const usuario = userEvent.setup()
    await renderizar()

    await usuario.selectOptions(screen.getByLabelText('Ordenar por GMD'), 'desc')

    expect(caravanasEnLaTabla()).toEqual(['CAR-004', 'CAR-001', 'CAR-002', 'CAR-003'])
  })

  it('"Menor a mayor" ordena ascendente, también con los que no tienen GMD al final', async () => {
    const usuario = userEvent.setup()
    await renderizar()

    await usuario.selectOptions(screen.getByLabelText('Ordenar por GMD'), 'asc')

    expect(caravanasEnLaTabla()).toEqual(['CAR-002', 'CAR-001', 'CAR-004', 'CAR-003'])
  })

  it('"Sin orden por GMD" vuelve al orden por caravana', async () => {
    const usuario = userEvent.setup()
    await renderizar()
    await usuario.selectOptions(screen.getByLabelText('Ordenar por GMD'), 'desc')

    await usuario.selectOptions(screen.getByLabelText('Ordenar por GMD'), '')

    expect(caravanasEnLaTabla()).toEqual(['CAR-001', 'CAR-002', 'CAR-003', 'CAR-004'])
  })

  it('es el mismo orden que el selector "Ordenar por" y el encabezado de la tabla: los tres se mantienen sincronizados', async () => {
    const usuario = userEvent.setup()
    await renderizar()

    await usuario.selectOptions(screen.getByLabelText('Ordenar por'), 'gmd:desc')
    expect(screen.getByLabelText('Ordenar por GMD')).toHaveValue('desc')

    await usuario.click(within(screen.getByRole('table')).getByRole('button', { name: 'Caravana' }))
    expect(screen.getByLabelText('Ordenar por GMD')).toHaveValue('')
  })

  it('ordenar no cuenta como filtro activo', async () => {
    const usuario = userEvent.setup()
    await renderizar()

    await usuario.selectOptions(screen.getByLabelText('Ordenar por GMD'), 'desc')

    expect(screen.queryByText(/filtros? activos?/)).not.toBeInTheDocument()
  })
})

describe('Animales: indicador y "Limpiar filtros"', () => {
  it('"Limpiar filtros" restablece raza, GMD y el resto de los filtros, y el indicador desaparece', async () => {
    const usuario = userEvent.setup()
    await renderizar()
    await usuario.selectOptions(screen.getByLabelText('Raza'), '2')
    await usuario.type(screen.getByLabelText('GMD mínima (kg/día)'), '1')
    await usuario.type(screen.getByLabelText('GMD máxima (kg/día)'), '3')
    await usuario.selectOptions(screen.getByLabelText('Estado'), 'no-aptos')
    expect(screen.getByText('4 filtros activos')).toBeInTheDocument()
    expect(caravanasEnLaTabla()).toEqual(['CAR-004'])

    await usuario.click(screen.getByRole('button', { name: 'Limpiar filtros' }))

    expect(screen.getByLabelText('Raza')).toHaveValue('todas')
    expect(screen.getByLabelText('GMD mínima (kg/día)')).toHaveValue('')
    expect(screen.getByLabelText('GMD máxima (kg/día)')).toHaveValue('')
    expect(screen.getByLabelText('Estado')).toHaveValue('todos')
    expect(screen.queryByText(/filtros? activos?/)).not.toBeInTheDocument()
    expect(caravanasEnLaTabla()).toHaveLength(4)
  })

  it('"Limpiar filtros" conserva el orden elegido (no es un filtro)', async () => {
    const usuario = userEvent.setup()
    await renderizar()
    await usuario.selectOptions(screen.getByLabelText('Ordenar por GMD'), 'desc')
    await usuario.selectOptions(screen.getByLabelText('Raza'), '2')

    await usuario.click(screen.getByRole('button', { name: 'Limpiar filtros' }))

    expect(screen.getByLabelText('Ordenar por GMD')).toHaveValue('desc')
    expect(caravanasEnLaTabla()).toEqual(['CAR-004', 'CAR-001', 'CAR-002', 'CAR-003'])
  })

  it('si ningún animal coincide, muestra el aviso y se puede limpiar desde ahí', async () => {
    const usuario = userEvent.setup()
    await renderizar()

    await usuario.type(screen.getByLabelText('GMD mínima (kg/día)'), '9')

    expect(screen.getByText('No hay animales que coincidan')).toBeInTheDocument()
    // Hay dos botones "Limpiar filtros": el del indicador y el del aviso de "sin coincidencias".
    const botones = screen.getAllByRole('button', { name: 'Limpiar filtros' })
    expect(botones).toHaveLength(2)

    await usuario.click(botones[1])
    expect(caravanasEnLaTabla()).toHaveLength(4)
  })
})
