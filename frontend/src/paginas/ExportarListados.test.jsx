import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { peticionProtegida } from '../api/cliente'
import { generarExcel } from '../utilidades/exportacion/generarExcel'
import { generarPdf } from '../utilidades/exportacion/generarPdf'
import Animales from './Animales'
import Personas from './Personas'

vi.mock('../api/cliente', () => ({
  peticionProtegida: vi.fn(),
  ErrorHttp: class ErrorHttp extends Error {},
}))

vi.mock('../utilidades/exportacion/generarPdf', () => ({ generarPdf: vi.fn() }))
vi.mock('../utilidades/exportacion/generarExcel', () => ({ generarExcel: vi.fn() }))

const ANIMALES = [
  {
    aniId: 1,
    aniCaravana: 'CAR-001',
    razaId: 1,
    razaDescripcion: 'Brangus',
    subGrupoId: 10,
    subGrupoDescripcion: 'Lote A',
    grupoDescripcion: 'Cría',
    aniPesoInicial: 200,
    pesoActual: 250,
    gmd: 1.5,
    aptoVenta: false,
    aniFechaIngreso: '2026-01-01',
    aniFechaEgreso: null,
  },
  {
    aniId: 2,
    aniCaravana: 'CAR-002',
    razaId: 2,
    razaDescripcion: 'Nelore',
    subGrupoId: 10,
    subGrupoDescripcion: 'Lote A',
    grupoDescripcion: 'Cría',
    aniPesoInicial: 200,
    pesoActual: 450,
    gmd: 0.5,
    aptoVenta: true,
    aniFechaIngreso: '2026-01-01',
    aniFechaEgreso: null,
  },
]

const PERSONAS = [
  { perId: 1, perNombre: 'Juan', perApellido: 'Pérez', perTipo: 'PROPIETARIO', cantidadAnimales: 0, cantidadPesajes: 0 },
  { perId: 2, perNombre: 'Ana', perApellido: 'Gómez', perTipo: 'PROVEEDOR', cantidadAnimales: 0, cantidadPesajes: 0 },
]

beforeEach(() => {
  localStorage.clear()
  generarPdf.mockResolvedValue('animales_2026-11-18.pdf')
  generarExcel.mockResolvedValue('personas_2026-11-18.xlsx')
  peticionProtegida.mockImplementation(async (ruta) => {
    if (ruta === '/api/animales/resumen') return ANIMALES
    if (ruta === '/api/personas/resumen') return PERSONAS
    return null
  })
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('Animales: exportar', () => {
  async function renderizar() {
    render(
      <MemoryRouter>
        <Animales />
      </MemoryRouter>,
    )
    await waitFor(() => expect(screen.queryByText('Cargando animales…')).not.toBeInTheDocument())
  }

  it('el botón "Exportar" abre el modal con los filtros de la pantalla y las columnas visibles marcadas', async () => {
    const usuario = userEvent.setup()
    await renderizar()
    await usuario.selectOptions(screen.getByLabelText('Raza'), '2')

    await usuario.click(screen.getByRole('button', { name: 'Exportar' }))

    const dialogo = screen.getByRole('dialog', { name: 'Exportar animales' })
    expect(within(dialogo).getByLabelText('Raza', { selector: 'select' })).toHaveValue('2')
    expect(within(dialogo).getByLabelText('Estado de salida')).toHaveValue('activos')
    expect(within(dialogo).getByRole('status')).toHaveTextContent('Se exportarán 1 registro')
    expect(within(dialogo).getByRole('checkbox', { name: 'Caravana' })).toBeChecked()
    expect(within(dialogo).getByRole('checkbox', { name: 'GMD (kg/día)' })).toBeChecked()
    // El proveedor y el ingreso están ocultos en el listado: arrancan sin marcar.
    expect(within(dialogo).getByRole('checkbox', { name: 'Proveedor' })).not.toBeChecked()
    expect(within(dialogo).getByRole('checkbox', { name: 'Dueño' })).not.toBeChecked()
  })

  it('cambiar un filtro del modal no cambia el listado de la pantalla', async () => {
    const usuario = userEvent.setup()
    await renderizar()
    await usuario.click(screen.getByRole('button', { name: 'Exportar' }))
    const dialogo = screen.getByRole('dialog')

    await usuario.selectOptions(within(dialogo).getByLabelText('Raza', { selector: 'select' }), '1')

    expect(within(dialogo).getByRole('status')).toHaveTextContent('Se exportarán 1 registro')
    expect(screen.getByLabelText('Raza', { selector: '#animales-filtro-raza' })).toHaveValue('todas')
  })

  it('"Generar" manda a generarPdf el título, las filas y la línea de filtros del modal', async () => {
    const usuario = userEvent.setup()
    await renderizar()
    await usuario.click(screen.getByRole('button', { name: 'Exportar' }))
    const dialogo = screen.getByRole('dialog')
    await usuario.selectOptions(within(dialogo).getByLabelText('Aptitud para venta'), 'aptos')

    await usuario.click(within(dialogo).getByRole('button', { name: 'Generar' }))

    await waitFor(() => expect(generarPdf).toHaveBeenCalledTimes(1))
    const datos = generarPdf.mock.calls[0][0]
    expect(datos.listado).toBe('animales')
    expect(datos.filas.map((fila) => fila.caravana)).toEqual(['CAR-002'])
    expect(datos.filtros).toEqual([
      { etiqueta: 'Estado de salida', valor: 'Activos' },
      { etiqueta: 'Aptitud', valor: 'Aptos para venta' },
    ])
    expect(await screen.findByText('Archivo animales_2026-11-18.pdf generado')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('con filtros que no dejan ningún animal, "Generar" queda deshabilitado', async () => {
    const usuario = userEvent.setup()
    await renderizar()
    await usuario.click(screen.getByRole('button', { name: 'Exportar' }))
    const dialogo = screen.getByRole('dialog')

    await usuario.type(within(dialogo).getByLabelText('Buscar por caravana'), 'zzz')

    expect(within(dialogo).getByRole('button', { name: 'Generar' })).toBeDisabled()
  })
})

describe('Personas: exportar', () => {
  async function renderizar() {
    render(<Personas />)
    await waitFor(() => expect(screen.queryByText('Cargando personas…')).not.toBeInTheDocument())
  }

  it('el modal avisa que el archivo contiene datos personales y trae sus filtros y columnas', async () => {
    const usuario = userEvent.setup()
    await renderizar()

    await usuario.click(screen.getByRole('button', { name: 'Exportar' }))

    const dialogo = screen.getByRole('dialog', { name: 'Exportar personas' })
    expect(within(dialogo).getByRole('note')).toHaveTextContent('El archivo contiene datos personales')
    expect(within(dialogo).getByLabelText('Buscar por nombre, apellido, CI o RUC')).toBeInTheDocument()
    expect(within(dialogo).getByLabelText('Tipo', { selector: 'select' })).toBeInTheDocument()
    expect(within(dialogo).getByRole('checkbox', { name: 'Correo' })).not.toBeChecked()
    expect(within(dialogo).getByRole('status')).toHaveTextContent('Se exportarán 2 registros')
  })

  it('arranca con el filtro de tipo de la pantalla y se puede cambiar el formato a Excel', async () => {
    const usuario = userEvent.setup()
    await renderizar()
    await usuario.selectOptions(screen.getByLabelText('Tipo'), 'PROVEEDOR')
    await usuario.click(screen.getByRole('button', { name: 'Exportar' }))
    const dialogo = screen.getByRole('dialog')

    expect(within(dialogo).getByLabelText('Tipo', { selector: 'select' })).toHaveValue('PROVEEDOR')
    expect(within(dialogo).getByRole('status')).toHaveTextContent('Se exportarán 1 registro')

    await usuario.click(within(dialogo).getByRole('radio', { name: 'Excel' }))
    await usuario.click(within(dialogo).getByRole('button', { name: 'Generar' }))

    await waitFor(() => expect(generarExcel).toHaveBeenCalledTimes(1))
    const datos = generarExcel.mock.calls[0][0]
    expect(datos.listado).toBe('personas')
    expect(datos.filtros).toEqual([{ etiqueta: 'Tipo', valor: 'Proveedor' }])
    expect(datos.filas.map((fila) => fila.nombre)).toEqual(['Ana'])
  })
})
