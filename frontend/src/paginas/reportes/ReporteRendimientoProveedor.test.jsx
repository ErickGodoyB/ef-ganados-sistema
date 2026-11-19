import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { peticionProtegida } from '../../api/cliente'
import ReporteRendimientoProveedor from './ReporteRendimientoProveedor'

vi.mock('../../api/cliente', () => ({
  peticionProtegida: vi.fn(),
  ErrorHttp: class ErrorHttp extends Error {},
}))

// Ya vienen en el orden del ranking, como los devuelve el backend.
const FILAS = [
  {
    proveedorId: 5,
    proveedorNombre: 'Beto Beta',
    cantidadAnimales: 2,
    animalesConDatos: 2,
    gmdPromedio: 3.5,
    gananciaPromedioKg: 60,
    mejorAnimalCaravana: 'B2',
    mejorAnimalGmd: 5,
  },
  {
    proveedorId: 4,
    proveedorNombre: 'Ana Alfa',
    cantidadAnimales: 3,
    animalesConDatos: 2,
    gmdPromedio: 1.75,
    gananciaPromedioKg: 35,
    mejorAnimalCaravana: 'A1',
    mejorAnimalGmd: 3,
  },
  {
    proveedorId: 6,
    proveedorNombre: 'Carla Cero',
    cantidadAnimales: 1,
    animalesConDatos: 0,
    gmdPromedio: null,
    gananciaPromedioKg: null,
    mejorAnimalCaravana: null,
    mejorAnimalGmd: null,
  },
  {
    proveedorId: null,
    proveedorNombre: 'Sin proveedor',
    cantidadAnimales: 2,
    animalesConDatos: 1,
    gmdPromedio: 2,
    gananciaPromedioKg: 10,
    mejorAnimalCaravana: 'S1',
    mejorAnimalGmd: 2,
  },
]

const ANIMALES = [
  {
    animalId: 1,
    caravana: 'B2',
    razaDescripcion: 'Brangus',
    loteDescripcion: 'Lote A',
    aniFechaIngreso: '2026-01-01',
    aniPesoInicial: 200,
    pesoActual: 300,
    gananciaKg: 100,
    gmdAcumulado: 5,
    estado: 'MUERTE',
  },
  {
    animalId: 2,
    caravana: 'B1',
    razaDescripcion: 'Nelore',
    loteDescripcion: null,
    aniFechaIngreso: '2026-01-05',
    aniPesoInicial: 180,
    pesoActual: 180,
    gananciaKg: 0,
    gmdAcumulado: null,
    estado: 'Activo',
  },
]

let respuestaReporte
let respuestaAnimales

beforeEach(() => {
  respuestaReporte = async () => FILAS
  respuestaAnimales = async () => ANIMALES
  peticionProtegida.mockImplementation(async (ruta) => {
    if (ruta.startsWith('/api/reportes/proveedores/animales')) return respuestaAnimales(ruta)
    if (ruta.startsWith('/api/reportes/proveedores')) return respuestaReporte(ruta)
    return null
  })
})

afterEach(() => {
  vi.restoreAllMocks()
})

async function renderizar() {
  const resultado = render(<ReporteRendimientoProveedor />)
  await waitFor(() => expect(screen.queryByText('Cargando reporte…')).not.toBeInTheDocument())
  return resultado
}

/** Filas del cuerpo de la tabla del ranking (la tabla y las tarjetas están las dos en el DOM). */
function filasDelRanking() {
  return within(screen.getByRole('table', { name: 'Ranking de rendimiento por proveedor' }))
    .getAllByRole('row')
    .slice(1)
}

describe('Reporte de rendimiento por proveedor: ranking', () => {
  it('explica cómo se calcula el GMD acumulado, de forma visible', async () => {
    await renderizar()

    expect(
      screen.getByText(
        'GMD acumulado = (peso actual − peso inicial) ÷ días entre el ingreso y el último pesaje. El promedio incluye solo los animales con pesajes.',
      ),
    ).toBeInTheDocument()
  })

  it('pide el reporte con soloActivos=false y la casilla arranca desmarcada', async () => {
    await renderizar()

    expect(peticionProtegida).toHaveBeenCalledWith('/api/reportes/proveedores?soloActivos=false')
    expect(screen.getByRole('checkbox', { name: 'Solo animales activos' })).not.toBeChecked()
  })

  it('muestra los proveedores en el orden recibido, con posición y "Sin proveedor" al final sin posición', async () => {
    await renderizar()

    const filas = filasDelRanking()
    expect(filas).toHaveLength(4)
    const celdas = filas.map((fila) => within(fila).getAllByRole('cell').map((celda) => celda.textContent))
    expect(celdas.map((c) => c[0])).toEqual(['1', '2', '3', '—'])
    expect(filas.map((fila) => within(fila).getByRole('rowheader').textContent)).toEqual([
      expect.stringContaining('Beto Beta'),
      expect.stringContaining('Ana Alfa'),
      expect.stringContaining('Carla Cero'),
      expect.stringContaining('Sin proveedor'),
    ])
  })

  it('cada fila trae animales, animales con datos, GMD promedio, ganancia y mejor animal', async () => {
    await renderizar()

    const primera = filasDelRanking()[0]
    expect(within(primera).getByText('3,50 kg/día')).toBeInTheDocument()
    expect(within(primera).getByText('60,0 kg')).toBeInTheDocument()
    expect(within(primera).getByText('B2 · 5,00 kg/día')).toBeInTheDocument()
    const numeros = within(primera)
      .getAllByRole('cell')
      .map((celda) => celda.textContent)
    expect(numeros[1]).toBe('2') // animales
    expect(numeros[2]).toBe('2') // con datos
  })

  it('solo el primero lleva la etiqueta "Mejor rendimiento" (con ícono y texto)', async () => {
    await renderizar()

    const filas = filasDelRanking()
    expect(within(filas[0]).getByText('Mejor rendimiento')).toBeInTheDocument()
    expect(within(filas[1]).queryByText('Mejor rendimiento')).not.toBeInTheDocument()
    expect(within(filas[3]).queryByText('Mejor rendimiento')).not.toBeInTheDocument()
  })

  it('la barra es proporcional al mayor GMD promedio y el número siempre está escrito', async () => {
    const { container } = await renderizar()

    const tabla = container.querySelector('.reporte-tabla')
    const anchos = [...tabla.querySelectorAll('.barra-gmd-relleno')].map((barra) => barra.style.width)
    // 3,5 es el mayor (100 %); 1,75 es la mitad; sin dato, 0; 2,0 sobre 3,5.
    expect(anchos[0]).toBe('100%')
    expect(anchos[1]).toBe('50%')
    expect(anchos[2]).toBe('0%')
    expect(parseFloat(anchos[3])).toBeCloseTo((2 / 3.5) * 100)
    // La barra es solo ayuda visual: no se anuncia.
    expect(tabla.querySelector('.barra-gmd-pista')).toHaveAttribute('aria-hidden', 'true')
  })

  it('sin datos (GMD null) muestra "—" en GMD, ganancia y mejor animal', async () => {
    await renderizar()

    const carla = filasDelRanking()[2]
    const celdas = within(carla)
      .getAllByRole('cell')
      .map((celda) => celda.textContent)
    // posición, animales, con datos, GMD, ganancia, mejor animal, acciones
    expect(celdas[1]).toBe('1')
    expect(celdas[2]).toBe('0')
    expect(celdas[3]).toBe('—')
    expect(celdas[4]).toBe('—')
    expect(celdas[5]).toBe('—')
  })

  it('"Sin proveedor" lleva la nota para asignar el proveedor', async () => {
    await renderizar()

    const ultima = filasDelRanking()[3]
    expect(
      within(ultima).getByText('Asigná el proveedor editando los animales para incluirlos en la comparación'),
    ).toBeInTheDocument()
    expect(within(filasDelRanking()[0]).queryByText(/Asigná el proveedor/)).not.toBeInTheDocument()
  })

  it('las tarjetas de celular traen los mismos datos', async () => {
    const { container } = await renderizar()

    const tarjetas = container.querySelectorAll('.reporte-tarjeta')
    expect(tarjetas).toHaveLength(4)
    expect(within(tarjetas[0]).getByText('Beto Beta')).toBeInTheDocument()
    expect(within(tarjetas[0]).getByText('Mejor rendimiento')).toBeInTheDocument()
    expect(within(tarjetas[0]).getByText('3,50 kg/día')).toBeInTheDocument()
    expect(within(tarjetas[0]).getByText('B2 · 5,00 kg/día')).toBeInTheDocument()
    expect(within(tarjetas[3]).getByText(/Asigná el proveedor/)).toBeInTheDocument()
  })
})

describe('Reporte de rendimiento por proveedor: solo activos', () => {
  it('marcar la casilla vuelve a pedir el reporte con soloActivos=true', async () => {
    const usuario = userEvent.setup()
    await renderizar()

    await usuario.click(screen.getByRole('checkbox', { name: 'Solo animales activos' }))

    await waitFor(() =>
      expect(peticionProtegida).toHaveBeenCalledWith('/api/reportes/proveedores?soloActivos=true'),
    )
    expect(screen.getByRole('checkbox', { name: 'Solo animales activos' })).toBeChecked()
  })
})

describe('Reporte de rendimiento por proveedor: estados', () => {
  it('muestra "Cargando reporte…" mientras espera', () => {
    respuestaReporte = () => new Promise(() => {})
    render(<ReporteRendimientoProveedor />)

    expect(screen.getByText('Cargando reporte…')).toBeInTheDocument()
  })

  it('sin filas muestra un mensaje de vacío', async () => {
    respuestaReporte = async () => []
    await renderizar()

    expect(screen.getByText('Todavía no hay animales registrados para comparar.')).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('sin filas y con "solo activos" el mensaje lo dice', async () => {
    const usuario = userEvent.setup()
    respuestaReporte = async () => []
    await renderizar()

    await usuario.click(screen.getByRole('checkbox', { name: 'Solo animales activos' }))

    expect(await screen.findByText('No hay animales activos para comparar.')).toBeInTheDocument()
  })

  it('si falla muestra el error con "Reintentar", que vuelve a pedir', async () => {
    const usuario = userEvent.setup()
    respuestaReporte = async () => {
      throw new Error('falló')
    }
    await renderizar()

    expect(screen.getByText('No se pudo cargar el reporte de rendimiento por proveedor.')).toBeInTheDocument()

    respuestaReporte = async () => FILAS
    await usuario.click(screen.getByRole('button', { name: 'Reintentar' }))

    expect(await screen.findByRole('table', { name: 'Ranking de rendimiento por proveedor' })).toBeInTheDocument()
  })
})

describe('Reporte de rendimiento por proveedor: "Ver animales"', () => {
  it('abre un modal con los animales del proveedor, pidiendo su proveedorId y soloActivos', async () => {
    const usuario = userEvent.setup()
    await renderizar()

    await usuario.click(screen.getAllByRole('button', { name: 'Ver animales de Beto Beta' })[0])

    const dialogo = await screen.findByRole('dialog', { name: 'Animales de Beto Beta' })
    expect(peticionProtegida).toHaveBeenCalledWith('/api/reportes/proveedores/animales?proveedorId=5&soloActivos=false')
    const filas = within(dialogo).getAllByRole('row').slice(1)
    expect(filas).toHaveLength(2)
    expect(within(filas[0]).getByText('B2')).toBeInTheDocument()
    expect(within(filas[0]).getByText('Brangus')).toBeInTheDocument()
    expect(within(filas[0]).getByText('Lote A')).toBeInTheDocument()
    expect(within(filas[0]).getByText('01/01/2026')).toBeInTheDocument()
    expect(within(filas[0]).getByText('200,0 kg')).toBeInTheDocument()
    expect(within(filas[0]).getByText('300,0 kg')).toBeInTheDocument()
    expect(within(filas[0]).getByText('100,0 kg')).toBeInTheDocument()
    expect(within(filas[0]).getByText('5,00 kg/día')).toBeInTheDocument()
    expect(within(filas[0]).getByText('Muerte')).toBeInTheDocument()
    // Sin lote, sin GMD y activo en la segunda.
    expect(within(filas[1]).getByText('Sin lote')).toBeInTheDocument()
    expect(within(filas[1]).getByText('—')).toBeInTheDocument()
    expect(within(filas[1]).getByText('Activo')).toBeInTheDocument()
  })

  it('respeta la casilla "Solo animales activos" al pedir los animales', async () => {
    const usuario = userEvent.setup()
    await renderizar()
    await usuario.click(screen.getByRole('checkbox', { name: 'Solo animales activos' }))
    await waitFor(() => expect(screen.getAllByRole('button', { name: /Ver animales de Ana Alfa/ })[0]).toBeEnabled())

    await usuario.click(screen.getAllByRole('button', { name: 'Ver animales de Ana Alfa' })[0])

    await screen.findByRole('dialog', { name: 'Animales de Ana Alfa' })
    expect(peticionProtegida).toHaveBeenCalledWith('/api/reportes/proveedores/animales?proveedorId=4&soloActivos=true')
  })

  it('"Sin proveedor" consulta sin proveedorId', async () => {
    const usuario = userEvent.setup()
    await renderizar()

    await usuario.click(screen.getAllByRole('button', { name: 'Ver animales de Sin proveedor' })[0])

    await screen.findByRole('dialog', { name: 'Animales de Sin proveedor' })
    expect(peticionProtegida).toHaveBeenCalledWith('/api/reportes/proveedores/animales?soloActivos=false')
  })

  it('sin animales muestra un mensaje de vacío', async () => {
    const usuario = userEvent.setup()
    respuestaAnimales = async () => []
    await renderizar()

    await usuario.click(screen.getAllByRole('button', { name: 'Ver animales de Beto Beta' })[0])

    expect(await screen.findByText('No hay animales para este proveedor.')).toBeInTheDocument()
  })

  it('si falla muestra el error con "Reintentar"', async () => {
    const usuario = userEvent.setup()
    respuestaAnimales = async () => {
      throw new Error('falló')
    }
    await renderizar()

    await usuario.click(screen.getAllByRole('button', { name: 'Ver animales de Beto Beta' })[0])

    const dialogo = await screen.findByRole('dialog', { name: 'Animales de Beto Beta' })
    expect(await within(dialogo).findByText('No se pudieron cargar los animales de este proveedor.')).toBeInTheDocument()

    respuestaAnimales = async () => ANIMALES
    await usuario.click(within(dialogo).getByRole('button', { name: 'Reintentar' }))
    expect((await within(dialogo).findAllByText('B2')).length).toBeGreaterThan(0)
  })

  it('Escape cierra el modal', async () => {
    const usuario = userEvent.setup()
    await renderizar()
    await usuario.click(screen.getAllByRole('button', { name: 'Ver animales de Beto Beta' })[0])
    await screen.findByRole('dialog')

    await usuario.keyboard('{Escape}')

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
