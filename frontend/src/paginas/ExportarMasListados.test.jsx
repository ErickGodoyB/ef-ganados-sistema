import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { peticionProtegida } from '../api/cliente'
import { generarExcel } from '../utilidades/exportacion/generarExcel'
import { generarPdf } from '../utilidades/exportacion/generarPdf'
import HistorialPesajesAnimal from './animales/HistorialPesajesAnimal'
import Pesajes from './Pesajes'
import ModalDetalleSesion from './pesajes/ModalDetalleSesion'
import ReporteRendimientoProveedor from './reportes/ReporteRendimientoProveedor'
import Transferencias from './Transferencias'
import ModalDetalleTransferencia from './transferencias/ModalDetalleTransferencia'

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
  useAuth: () => ({ personaId: 5, personaNombre: 'Ana Pérez', cargandoYo: false, errorYo: '' }),
}))

vi.mock('../utilidades/exportacion/generarPdf', () => ({ generarPdf: vi.fn() }))
vi.mock('../utilidades/exportacion/generarExcel', () => ({ generarExcel: vi.fn() }))

const SESIONES = [
  { fecha: '2026-03-10', subGrupoId: 3, subGrupoDescripcion: 'Lote A', grupoDescripcion: 'Cría', cantidad: 12, total: 3600, promedio: 300, minimo: 250, maximo: 350 },
  { fecha: '2026-03-20', subGrupoId: null, subGrupoDescripcion: null, grupoDescripcion: null, cantidad: 8, total: 2000, promedio: 250, minimo: 200, maximo: 300 },
]

const ITEMS = [
  { pesaId: 10, animalId: 1, caravana: 'CAR-001', razaDescripcion: 'Brangus', peso: 260, pesoAnterior: 250, gmd: 1, pesoAnteriorEsIngreso: false, fechaPesoAnterior: '2026-03-01', responsableNombre: 'Ana', observaciones: '' },
  { pesaId: 11, animalId: 2, caravana: 'CAR-002', razaDescripcion: 'Nelore', peso: 300, pesoAnterior: null, gmd: null, pesoAnteriorEsIngreso: false, fechaPesoAnterior: null, responsableNombre: 'Ana', observaciones: '' },
]

const TRANSFERENCIAS = [
  { traId: 2, fecha: '2026-03-10', motivo: 'SELECCION', cantidadAnimales: 5, origenes: ['Lote A'], destinos: ['Lote B'], responsableNombre: 'Ana Pérez', devuelta: false, nota: null },
  { traId: 1, fecha: '2026-02-01', motivo: 'SANITARIO', cantidadAnimales: 1, origenes: ['Lote A'], destinos: ['Lote C'], responsableNombre: 'Juan Gómez', devuelta: false, nota: 'Aislamiento' },
]

const DETALLE_TRANSFERENCIA = {
  ...TRANSFERENCIAS[0],
  nota: null,
  registradaEn: '2026-03-10T10:30:00',
  devuelveA: null,
  animales: [
    { animalId: 1, caravana: 'CAR-001', razaDescripcion: 'Brangus', origen: 'Lote A', destino: 'Lote B', enDestino: true },
    { animalId: 2, caravana: 'CAR-002', razaDescripcion: 'Nelore', origen: 'Lote A', destino: 'Lote B', enDestino: false },
  ],
}

const RANKING = [
  { proveedorId: 5, proveedorNombre: 'Beto Beta', cantidadAnimales: 2, animalesConDatos: 2, gmdPromedio: 3.5, gananciaPromedioKg: 60, mejorAnimalCaravana: 'B2', mejorAnimalGmd: 5 },
  { proveedorId: null, proveedorNombre: 'Sin proveedor', cantidadAnimales: 2, animalesConDatos: 1, gmdPromedio: 2, gananciaPromedioKg: 10, mejorAnimalCaravana: 'S1', mejorAnimalGmd: 2 },
]

const ANIMALES_PROVEEDOR = [
  { animalId: 1, caravana: 'B2', razaDescripcion: 'Brangus', loteDescripcion: 'Lote A', aniFechaIngreso: '2026-01-01', aniPesoInicial: 200, pesoActual: 300, gananciaKg: 100, gmdAcumulado: 5, estado: 'MUERTE' },
]

const ANIMAL = { aniId: 1, aniCaravana: 'CAR-001', razaDescripcion: 'Brangus', subGrupoId: 3, aniFechaIngreso: '2026-01-01', aniPesoInicial: 200 }
const PESAJES_ANIMAL = [
  { pesaId: 1, fecha: '2026-01-11', peso: 220, pesoAnterior: 200, pesoAnteriorEsIngreso: true, fechaPesoAnterior: '2026-01-01', gmd: 2, responsableNombre: 'Ana', observaciones: null },
]

let peticiones

beforeEach(() => {
  localStorage.clear()
  generarPdf.mockResolvedValue('archivo.pdf')
  generarExcel.mockResolvedValue('archivo.xlsx')
  peticiones = []
  peticionProtegida.mockImplementation(async (ruta) => {
    peticiones.push(ruta)
    if (ruta === '/api/pesajes/sesiones') return SESIONES
    if (ruta.startsWith('/api/pesajes/sesiones/detalle')) return ITEMS
    if (ruta.startsWith('/api/transferencias?') || ruta === '/api/transferencias') return TRANSFERENCIAS
    if (ruta === '/api/transferencias/2') return DETALLE_TRANSFERENCIA
    if (ruta.startsWith('/api/reportes/proveedores/animales')) return ANIMALES_PROVEEDOR
    if (ruta.startsWith('/api/reportes/proveedores')) return RANKING
    if (ruta === '/api/animales/1/pesajes') return PESAJES_ANIMAL
    return []
  })
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('Pesajes (listado de sesiones): exportar', () => {
  async function abrirModal(usuario, ruta = '/pesajes') {
    render(
      <MemoryRouter initialEntries={[ruta]}>
        <Pesajes />
      </MemoryRouter>,
    )
    await waitFor(() => expect(screen.queryByText('Cargando pesajes…')).not.toBeInTheDocument())
    await usuario.click(screen.getByRole('button', { name: 'Exportar' }))
    return screen.getByRole('dialog', { name: 'Exportar sesiones de pesaje' })
  }

  it('el botón abre el modal con búsqueda, lote e intervalo, y el conteo de sesiones', async () => {
    const dialogo = await abrirModal(userEvent.setup())

    expect(within(dialogo).getByLabelText('Buscar por lote, grupo o código de sesión')).toBeInTheDocument()
    expect(within(dialogo).getByLabelText('Lote', { selector: 'select' })).toBeInTheDocument()
    expect(within(dialogo).getByLabelText('Desde')).toBeInTheDocument()
    expect(within(dialogo).getByLabelText('Hasta')).toBeInTheDocument()
    expect(within(dialogo).getByRole('status')).toHaveTextContent('Se exportarán 2 registros')
  })

  it('arranca con el intervalo de la pantalla (?fecha=) y genera con el resumen de sesiones y animales', async () => {
    const usuario = userEvent.setup()
    const dialogo = await abrirModal(usuario, '/pesajes?fecha=2026-03-10')

    expect(within(dialogo).getByLabelText('Desde')).toHaveValue('2026-03-10')
    expect(within(dialogo).getByRole('status')).toHaveTextContent('Se exportarán 1 registro')

    await usuario.click(within(dialogo).getByRole('button', { name: 'Generar' }))

    await waitFor(() => expect(generarPdf).toHaveBeenCalledTimes(1))
    const datos = generarPdf.mock.calls[0][0]
    expect(datos.listado).toBe('sesiones-de-pesaje')
    expect(datos.filas.map((fila) => fila.codigo)).toEqual(['S-260310-3'])
    expect(datos.filtros).toEqual([
      { etiqueta: 'Desde', valor: '10/03/2026' },
      { etiqueta: 'Hasta', valor: '10/03/2026' },
    ])
    expect(datos.resumen).toEqual([
      { etiqueta: 'Sesiones', valor: '1' },
      { etiqueta: 'Animales pesados', valor: '12' },
    ])
  })
})

describe('Detalle de sesión: exportar', () => {
  async function abrirDetalle() {
    const onCerrar = vi.fn()
    render(
      <MemoryRouter>
        <ModalDetalleSesion
          sesion={{ fecha: '2026-03-11', subGrupoId: 3, subGrupoDescripcion: 'Lote A', grupoDescripcion: 'Cría' }}
          onCerrar={onCerrar}
          onCambiada={vi.fn()}
          onQuedoSinAnimales={vi.fn()}
          refDisparador={{ current: null }}
        />
      </MemoryRouter>,
    )
    await screen.findAllByText('CAR-001')
    return { onCerrar }
  }

  it('el botón "Exportar" abre un modal SIN sección de filtros y genera con el contexto de la sesión', async () => {
    const usuario = userEvent.setup()
    await abrirDetalle()

    await usuario.click(screen.getByRole('button', { name: 'Exportar' }))

    const dialogo = screen.getByRole('dialog', { name: 'Exportar animales de la sesión' })
    expect(within(dialogo).queryByRole('group', { name: 'Filtros' })).not.toBeInTheDocument()
    expect(within(dialogo).getByRole('status')).toHaveTextContent('Se exportarán 2 registros')
    expect(within(dialogo).getByRole('checkbox', { name: 'Fecha del peso anterior' })).toBeChecked()

    await usuario.click(within(dialogo).getByRole('button', { name: 'Generar' }))

    await waitFor(() => expect(generarPdf).toHaveBeenCalledTimes(1))
    const datos = generarPdf.mock.calls[0][0]
    expect(datos.filtros).toEqual([
      { etiqueta: 'Sesión', valor: 'S-260311-3' },
      { etiqueta: 'Lote', valor: 'Lote A — Cría' },
      { etiqueta: 'Fecha', valor: '11/03/2026' },
    ])
    expect(datos.filas[0]).toMatchObject({ caravana: 'CAR-001', dias: 10, diferencia: 10 })
    expect(datos.resumen.map((dato) => dato.etiqueta)).toEqual([
      'Animales',
      'Peso promedio',
      'Mínimo',
      'Máximo',
      'GMD promedio',
    ])
  })

  it('Escape cierra solo el modal de exportación, no el detalle de la sesión', async () => {
    const usuario = userEvent.setup()
    const { onCerrar } = await abrirDetalle()
    await usuario.click(screen.getByRole('button', { name: 'Exportar' }))
    expect(screen.getAllByRole('dialog')).toHaveLength(2)

    await usuario.keyboard('{Escape}')

    expect(screen.getAllByRole('dialog')).toHaveLength(1)
    expect(onCerrar).not.toHaveBeenCalled()
  })
})

describe('Transferencias (listado): exportar', () => {
  async function abrirModal(usuario) {
    render(
      <MemoryRouter>
        <Transferencias />
      </MemoryRouter>,
    )
    await waitFor(() => expect(screen.queryByText('Cargando transferencias…')).not.toBeInTheDocument())
    await usuario.click(screen.getByRole('button', { name: 'Exportar' }))
    return screen.findByRole('dialog', { name: 'Exportar transferencias' })
  }

  it('pide la lista completa (sin fechas), ofrece búsqueda, intervalo y motivo, y cuenta', async () => {
    const usuario = userEvent.setup()
    const dialogo = await abrirModal(usuario)

    expect(await within(dialogo).findByLabelText('Motivo', { selector: 'select' })).toBeInTheDocument()
    expect(within(dialogo).getByLabelText('Buscar por lote, responsable o motivo')).toBeInTheDocument()
    expect(within(dialogo).getByLabelText('Desde')).toBeInTheDocument()
    expect(peticiones).toContain('/api/transferencias')
    expect(within(dialogo).getByRole('status')).toHaveTextContent('Se exportarán 2 registros')
  })

  it('filtrar por motivo cambia el conteo, y genera con las filas y los filtros', async () => {
    const usuario = userEvent.setup()
    const dialogo = await abrirModal(usuario)

    await usuario.selectOptions(await within(dialogo).findByLabelText('Motivo', { selector: 'select' }), 'SANITARIO')
    expect(within(dialogo).getByRole('status')).toHaveTextContent('Se exportarán 1 registro')
    await usuario.click(within(dialogo).getByRole('button', { name: 'Generar' }))

    await waitFor(() => expect(generarPdf).toHaveBeenCalledTimes(1))
    const datos = generarPdf.mock.calls[0][0]
    expect(datos.listado).toBe('transferencias')
    expect(datos.filas).toHaveLength(1)
    expect(datos.filas[0]).toMatchObject({ motivo: 'Sanitario', animales: 1, nota: 'Aislamiento' })
    expect(datos.filtros).toEqual([{ etiqueta: 'Motivo', valor: 'Sanitario' }])
  })

  it('si falla la carga, muestra el error con "Reintentar"', async () => {
    const usuario = userEvent.setup()
    render(
      <MemoryRouter>
        <Transferencias />
      </MemoryRouter>,
    )
    await waitFor(() => expect(screen.queryByText('Cargando transferencias…')).not.toBeInTheDocument())
    peticionProtegida.mockImplementation(async () => {
      throw new Error('falló')
    })

    await usuario.click(screen.getByRole('button', { name: 'Exportar' }))

    expect(await screen.findByText('No se pudo cargar el listado de transferencias.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
  })
})

describe('Detalle de transferencia: exportar', () => {
  it('exporta los animales de la transferencia, sin filtros, con el contexto en la línea de filtros', async () => {
    const usuario = userEvent.setup()
    render(
      <ModalDetalleTransferencia transferenciaId={2} onCerrar={vi.fn()} onDevuelta={vi.fn()} refDisparador={{ current: null }} />,
    )
    await screen.findByText('CAR-001')

    await usuario.click(screen.getByRole('button', { name: 'Exportar' }))

    const dialogo = screen.getByRole('dialog', { name: 'Exportar animales de la transferencia' })
    expect(within(dialogo).queryByRole('group', { name: 'Filtros' })).not.toBeInTheDocument()
    await usuario.click(within(dialogo).getByRole('button', { name: 'Generar' }))

    await waitFor(() => expect(generarPdf).toHaveBeenCalledTimes(1))
    const datos = generarPdf.mock.calls[0][0]
    expect(datos.listado).toBe('transferencia-2')
    expect(datos.filas.map((fila) => [fila.caravana, fila.sigueEnDestino])).toEqual([
      ['CAR-001', true],
      ['CAR-002', false],
    ])
    expect(datos.filtros[0]).toEqual({ etiqueta: 'Transferencia', valor: 'n.º 2' })
    expect(datos.filtros.map((filtro) => filtro.etiqueta)).toEqual(['Transferencia', 'Fecha', 'Motivo', 'Responsable'])
    expect(datos.resumen).toBeUndefined()
  })
})

describe('Reporte de proveedores: exportar', () => {
  async function renderizar() {
    render(<ReporteRendimientoProveedor />)
    await waitFor(() => expect(screen.queryByText('Cargando reporte…')).not.toBeInTheDocument())
  }

  it('exporta el ranking con "Solo animales activos" como filtro aplicado', async () => {
    const usuario = userEvent.setup()
    await renderizar()
    await usuario.click(screen.getByRole('checkbox', { name: 'Solo animales activos' }))
    await waitFor(() => expect(peticionProtegida).toHaveBeenCalledWith('/api/reportes/proveedores?soloActivos=true'))

    await usuario.click(screen.getByRole('button', { name: 'Exportar' }))
    const dialogo = screen.getByRole('dialog', { name: 'Exportar rendimiento por proveedor' })
    expect(within(dialogo).queryByRole('group', { name: 'Filtros' })).not.toBeInTheDocument()
    await usuario.click(within(dialogo).getByRole('button', { name: 'Generar' }))

    await waitFor(() => expect(generarPdf).toHaveBeenCalledTimes(1))
    const datos = generarPdf.mock.calls[0][0]
    expect(datos.filtros).toEqual([{ etiqueta: 'Solo animales activos', valor: 'Sí' }])
    expect(datos.filas.map((fila) => fila.posicion)).toEqual([1, null])
    expect(datos.columnas.map((columna) => columna.clave)).toContain('mejorAnimalGmd')
  })

  it('dentro de "Ver animales", exporta la lista del proveedor con el proveedor como contexto', async () => {
    const usuario = userEvent.setup()
    await renderizar()
    await usuario.click(screen.getAllByRole('button', { name: 'Ver animales de Beto Beta' })[0])
    const lista = await screen.findByRole('dialog', { name: 'Animales de Beto Beta' })
    await within(lista).findAllByText('B2')

    await usuario.click(within(lista).getByRole('button', { name: 'Exportar' }))

    const exportacion = screen.getByRole('dialog', { name: 'Exportar animales del proveedor' })
    await usuario.click(within(exportacion).getByRole('button', { name: 'Generar' }))

    await waitFor(() => expect(generarExcel).not.toHaveBeenCalled())
    await waitFor(() => expect(generarPdf).toHaveBeenCalledTimes(1))
    const datos = generarPdf.mock.calls[0][0]
    expect(datos.filtros).toEqual([
      { etiqueta: 'Proveedor', valor: 'Beto Beta' },
      { etiqueta: 'Solo animales activos', valor: 'No' },
    ])
    expect(datos.filas[0]).toMatchObject({ caravana: 'B2', estado: 'Muerte', lote: 'Lote A' })
  })
})

describe('Historial de pesajes del animal: exportar', () => {
  it('exporta el historial (ingreso primero) con la caravana como contexto', async () => {
    const usuario = userEvent.setup()
    render(
      <MemoryRouter>
        <HistorialPesajesAnimal animal={ANIMAL} />
      </MemoryRouter>,
    )
    await screen.findAllByText('S-260111-3')

    await usuario.click(screen.getByRole('button', { name: 'Exportar' }))

    const dialogo = screen.getByRole('dialog', { name: 'Exportar historial de pesajes' })
    expect(within(dialogo).queryByRole('group', { name: 'Filtros' })).not.toBeInTheDocument()
    await usuario.click(within(dialogo).getByRole('radio', { name: 'Excel' }))
    await usuario.click(within(dialogo).getByRole('button', { name: 'Generar' }))

    await waitFor(() => expect(generarExcel).toHaveBeenCalledTimes(1))
    const datos = generarExcel.mock.calls[0][0]
    expect(datos.filtros).toEqual([
      { etiqueta: 'Animal', valor: 'CAR-001' },
      { etiqueta: 'Raza', valor: 'Brangus' },
    ])
    expect(datos.filas.map((fila) => fila.sesion)).toEqual(['Ingreso', 'S-260111-3'])
  })

  it('sin pesajes no ofrece exportar', async () => {
    peticionProtegida.mockResolvedValue([])
    render(
      <MemoryRouter>
        <HistorialPesajesAnimal animal={ANIMAL} />
      </MemoryRouter>,
    )
    await screen.findByText('Este animal todavía no tiene pesajes')

    expect(screen.queryByRole('button', { name: 'Exportar' })).not.toBeInTheDocument()
  })
})
