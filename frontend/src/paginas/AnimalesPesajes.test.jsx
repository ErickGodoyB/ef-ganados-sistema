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
    gananciaTotal: 50,
    gmdAcumulado: 1.25,
    cantidadPesajes: 2,
    gmd: 1,
    aptoVenta: false,
    aniFechaIngreso: '2026-01-01',
    aniFechaEgreso: null,
    ...extra,
  }
}

const ANIMALES = [
  animal(1, 'CAR-001', { pesoActual: 300, gananciaTotal: 100, cantidadPesajes: 3 }),
  animal(2, 'CAR-002', { pesoActual: 200, gananciaTotal: 10, cantidadPesajes: 1, aniPesoInicial: 190 }),
  animal(3, 'CAR-003', { pesoActual: 220, gananciaTotal: null, gmdAcumulado: null, gmd: null, cantidadPesajes: 0, aniPesoInicial: 220 }),
  animal(4, 'CAR-004', { pesoActual: 350, gananciaTotal: 150, cantidadPesajes: 5 }),
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

function encabezados() {
  return within(screen.getByRole('table'))
    .getAllByRole('columnheader')
    .map((encabezado) => encabezado.textContent)
}

describe('Animales: columnas de pesajes, ganancia total y GMD acumulado', () => {
  it('"Pesajes" y "Ganancia total (kg)" están visibles por defecto; "Peso de ingreso" y "GMD acumulado", ocultas', async () => {
    await renderizar()

    expect(encabezados()).toContain('Pesajes')
    expect(encabezados()).toContain('Ganancia total (kg)')
    expect(encabezados()).not.toContain('Peso de ingreso')
    expect(encabezados()).not.toContain('GMD acumulado')
  })

  it('con 0 pesajes se ve "Sin pesajes", y la ganancia total sin dato, "—"', async () => {
    await renderizar()

    const fila = within(screen.getByRole('table')).getAllByRole('row').find((f) => within(f).queryByText('CAR-003'))
    expect(within(fila).getByText('Sin pesajes')).toBeInTheDocument()
    expect(within(fila).getAllByText('—').length).toBeGreaterThan(0)
    const otra = within(screen.getByRole('table')).getAllByRole('row').find((f) => within(f).queryByText('CAR-001'))
    expect(within(otra).getByText('100,0 kg')).toBeInTheDocument()
  })

  it('las otras dos aparecen al activarlas en el panel de columnas', async () => {
    const usuario = userEvent.setup()
    await renderizar()

    await usuario.click(screen.getByRole('button', { name: 'Opciones del listado' }))
    await usuario.click(screen.getByRole('checkbox', { name: 'Peso de ingreso' }))
    await usuario.click(screen.getByRole('checkbox', { name: 'GMD acumulado' }))

    expect(encabezados()).toContain('Peso de ingreso')
    expect(encabezados()).toContain('GMD acumulado')
    const fila = within(screen.getByRole('table')).getAllByRole('row').find((f) => within(f).queryByText('CAR-002'))
    expect(within(fila).getByText('190,0 kg')).toBeInTheDocument()
    expect(within(fila).getByText('1,25 kg/día')).toBeInTheDocument()
  })

  it('se puede ordenar por ganancia total y por pesajes (encabezado y selector de celular)', async () => {
    const usuario = userEvent.setup()
    await renderizar()

    await usuario.click(within(screen.getByRole('table')).getByRole('button', { name: 'Ganancia total (kg)' }))
    expect(caravanasEnLaTabla()).toEqual(['CAR-002', 'CAR-001', 'CAR-004', 'CAR-003'])

    await usuario.click(within(screen.getByRole('table')).getByRole('button', { name: 'Pesajes' }))
    expect(caravanasEnLaTabla()).toEqual(['CAR-003', 'CAR-002', 'CAR-001', 'CAR-004'])

    const orden = screen.getByLabelText('Ordenar por', { selector: '#animales-orden-movil' })
    expect(within(orden).getByRole('option', { name: 'Ganancia total (kg) (descendente)' })).toBeInTheDocument()
    expect(within(orden).getByRole('option', { name: 'Pesajes (ascendente)' })).toBeInTheDocument()
  })
})

describe('Animales: filtros de pesajes y peso actual', () => {
  it('filtra por con/sin pesajes y suma al indicador', async () => {
    const usuario = userEvent.setup()
    await renderizar()

    await usuario.selectOptions(screen.getByLabelText('Pesajes', { selector: 'select' }), 'sin')

    expect(caravanasEnLaTabla()).toEqual(['CAR-003'])
    expect(screen.getByText('1 filtro activo')).toBeInTheDocument()
  })

  it('filtra por peso actual mínimo y máximo, y cada límite suma al indicador', async () => {
    const usuario = userEvent.setup()
    await renderizar()

    await usuario.type(screen.getByLabelText('Peso actual mínimo (kg)'), '210')
    await usuario.type(screen.getByLabelText('Peso actual máximo (kg)'), '310')

    expect(caravanasEnLaTabla()).toEqual(['CAR-001', 'CAR-003'])
    expect(screen.getByText('2 filtros activos')).toBeInTheDocument()
  })

  it('"Limpiar filtros" deja los tres nuevos en su valor por defecto', async () => {
    const usuario = userEvent.setup()
    await renderizar()
    await usuario.selectOptions(screen.getByLabelText('Pesajes', { selector: 'select' }), 'con')
    await usuario.type(screen.getByLabelText('Peso actual mínimo (kg)'), '250')
    expect(screen.getByText('2 filtros activos')).toBeInTheDocument()

    await usuario.click(screen.getByRole('button', { name: 'Limpiar filtros' }))

    expect(screen.getByLabelText('Pesajes', { selector: 'select' })).toHaveValue('todos')
    expect(screen.getByLabelText('Peso actual mínimo (kg)')).toHaveValue('')
    expect(caravanasEnLaTabla()).toHaveLength(4)
    expect(screen.queryByText(/filtros? activos?/)).not.toBeInTheDocument()
  })
})

describe('Detalle del animal: bloque "Desde el ingreso"', () => {
  function abrir(animalDetalle) {
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

  it('junta peso de ingreso, peso actual, ganancia total y GMD acumulado', () => {
    const dialogo = abrir(ANIMALES[0])

    const bloque = within(dialogo).getByText('Desde el ingreso').closest('div')
    expect(within(bloque).getByText('Peso de ingreso')).toBeInTheDocument()
    expect(within(bloque).getByText('200,0 kg')).toBeInTheDocument()
    expect(within(bloque).getByText('Peso actual')).toBeInTheDocument()
    expect(within(bloque).getByText('300,0 kg')).toBeInTheDocument()
    expect(within(bloque).getByText('Ganancia total')).toBeInTheDocument()
    expect(within(bloque).getByText('100,0 kg')).toBeInTheDocument()
    expect(within(bloque).getByText('GMD acumulado')).toBeInTheDocument()
    expect(within(bloque).getByText('1,25 kg/día')).toBeInTheDocument()
  })

  it('un animal sin pesajes muestra "—" en la ganancia y la GMD acumulada', () => {
    const dialogo = abrir(ANIMALES[2])

    const bloque = within(dialogo).getByText('Desde el ingreso').closest('div')
    expect(within(bloque).getAllByText('—')).toHaveLength(2)
    // Sin pesajes, el peso actual es el de ingreso: aparece dos veces.
    expect(within(bloque).getAllByText('220,0 kg', { selector: 'dd' })).toHaveLength(2)
  })
})
