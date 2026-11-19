import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { peticionProtegida } from '../api/cliente'
import ModalDetalleAnimal from './animales/ModalDetalleAnimal'
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
    cantidadPesajes: 0,
    proveedorId: null,
    proveedorNombre: null,
    ...extra,
  }
}

const ANIMALES = [
  animal(1, 'CAR-001', { proveedorId: 4, proveedorNombre: 'Pedro Vera' }),
  animal(2, 'CAR-002', { proveedorId: 5, proveedorNombre: 'Rosa Núñez' }),
  animal(3, 'CAR-003'),
  animal(4, 'CAR-004', { proveedorId: 4, proveedorNombre: 'Pedro Vera' }),
]

beforeEach(() => {
  localStorage.clear()
  peticionProtegida.mockImplementation(async (ruta) => (ruta === '/api/animales/resumen' ? ANIMALES : null))
})

afterEach(() => {
  vi.restoreAllMocks()
})

async function renderizar() {
  render(
    <MemoryRouter>
      <Animales />
    </MemoryRouter>,
  )
  await waitFor(() => expect(screen.queryByText('Cargando animales…')).not.toBeInTheDocument())
}

function caravanasEnLaTabla() {
  return within(screen.getByRole('table'))
    .getAllByRole('row')
    .slice(1)
    .map((fila) => within(fila).getAllByRole('button')[0].textContent)
}

describe('Animales: filtro por proveedor', () => {
  it('ofrece "Todos", "Sin proveedor" y los proveedores presentes, y arranca en todos', async () => {
    await renderizar()

    const filtro = screen.getByLabelText('Proveedor')
    expect(within(filtro).getAllByRole('option').map((o) => o.textContent)).toEqual([
      'Todos los proveedores',
      'Sin proveedor',
      'Pedro Vera',
      'Rosa Núñez',
    ])
    expect(caravanasEnLaTabla()).toEqual(['CAR-001', 'CAR-002', 'CAR-003', 'CAR-004'])
    expect(screen.queryByText(/filtros? activos?/)).not.toBeInTheDocument()
  })

  it('filtra por un proveedor y cuenta como filtro activo', async () => {
    const usuario = userEvent.setup()
    await renderizar()

    await usuario.selectOptions(screen.getByLabelText('Proveedor'), '4')

    expect(caravanasEnLaTabla()).toEqual(['CAR-001', 'CAR-004'])
    expect(screen.getByText('1 filtro activo')).toBeInTheDocument()
  })

  it('"Sin proveedor" deja solo a los animales sin proveedor', async () => {
    const usuario = userEvent.setup()
    await renderizar()

    await usuario.selectOptions(screen.getByLabelText('Proveedor'), 'sin-proveedor')

    expect(caravanasEnLaTabla()).toEqual(['CAR-003'])
  })

  it('suma al indicador junto con otros filtros y "Limpiar filtros" lo deja en "todos"', async () => {
    const usuario = userEvent.setup()
    await renderizar()

    await usuario.selectOptions(screen.getByLabelText('Proveedor'), '4')
    await usuario.type(screen.getByLabelText('GMD mínima (kg/día)'), '0,5')
    expect(screen.getByText('2 filtros activos')).toBeInTheDocument()

    await usuario.click(screen.getByRole('button', { name: 'Limpiar filtros' }))

    expect(screen.getByLabelText('Proveedor')).toHaveValue('todos')
    expect(caravanasEnLaTabla()).toHaveLength(4)
    expect(screen.queryByText(/filtros? activos?/)).not.toBeInTheDocument()
  })
})

describe('Animales: columna Proveedor', () => {
  it('está oculta por defecto', async () => {
    await renderizar()

    expect(within(screen.getByRole('table')).queryByRole('columnheader', { name: /Proveedor/ })).not.toBeInTheDocument()
  })

  it('aparece al activarla en el panel de columnas, con "Sin proveedor" donde no hay', async () => {
    const usuario = userEvent.setup()
    await renderizar()

    await usuario.click(screen.getByRole('button', { name: 'Opciones del listado' }))
    await usuario.click(screen.getByRole('checkbox', { name: 'Proveedor' }))

    const tabla = screen.getByRole('table')
    expect(within(tabla).getByRole('columnheader', { name: /Proveedor/ })).toBeInTheDocument()
    const filas = within(tabla).getAllByRole('row').slice(1)
    expect(within(filas[0]).getByText('Pedro Vera')).toBeInTheDocument()
    expect(within(filas[2]).getByText('Sin proveedor')).toBeInTheDocument()
  })
})

describe('Detalle del animal: proveedor', () => {
  function abrirDetalle(animalDetalle) {
    render(
      <MemoryRouter>
        <ModalDetalleAnimal
          animal={animalDetalle}
          onCerrar={vi.fn()}
          onActualizado={vi.fn()}
          onEliminado={vi.fn()}
          onYaNoExiste={vi.fn()}
          onSalidaRegistrada={vi.fn()}
          onReactivado={vi.fn()}
          refDisparador={{ current: null }}
        />
      </MemoryRouter>,
    )
    return screen.getByRole('dialog')
  }

  it('muestra el nombre del proveedor', () => {
    const dialogo = abrirDetalle(ANIMALES[0])

    expect(within(dialogo).getByText('Proveedor')).toBeInTheDocument()
    expect(within(dialogo).getByText('Pedro Vera')).toBeInTheDocument()
  })

  it('muestra "Sin proveedor" si no tiene', () => {
    const dialogo = abrirDetalle(ANIMALES[2])

    expect(within(dialogo).getByText('Sin proveedor')).toBeInTheDocument()
  })
})
