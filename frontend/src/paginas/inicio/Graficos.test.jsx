import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { peticionProtegida } from '../../api/cliente'
import AnilloAptos from './AnilloAptos'
import AnimalesPorCategoria from './AnimalesPorCategoria'
import { RESUMEN } from './datosDePrueba'
import EvolucionPeso from './EvolucionPeso'
import MejorProveedor from './MejorProveedor'

vi.mock('../../api/cliente', () => ({
  peticionProtegida: vi.fn(),
  ErrorHttp: class ErrorHttp extends Error {},
}))

let respuestas

beforeEach(() => {
  respuestas = {
    sesiones: async () => SESIONES,
    proveedores: async () => PROVEEDORES,
    animales: async () => ANIMALES,
  }
  peticionProtegida.mockImplementation(async (ruta) => {
    if (ruta.startsWith('/api/pesajes/sesiones')) return respuestas.sesiones()
    if (ruta.startsWith('/api/reportes/proveedores')) return respuestas.proveedores()
    if (ruta.startsWith('/api/animales/resumen')) return respuestas.animales()
    return null
  })
})

afterEach(() => {
  vi.restoreAllMocks()
})

const SESIONES = [
  { fecha: '2026-03-01', subGrupoId: 1, subGrupoDescripcion: 'Lote A', grupoDescripcion: 'Cría', promedio: 300 },
  { fecha: '2026-03-11', subGrupoId: 1, subGrupoDescripcion: 'Lote A', grupoDescripcion: 'Cría', promedio: 320 },
  { fecha: '2026-03-20', subGrupoId: 2, subGrupoDescripcion: 'Lote B', grupoDescripcion: 'Cría', promedio: 250 },
  { fecha: '2026-02-10', subGrupoId: null, subGrupoDescripcion: null, grupoDescripcion: null, promedio: 200 },
]

const PROVEEDORES = [
  {
    proveedorId: 5,
    proveedorNombre: 'Beto Beta',
    cantidadAnimales: 7,
    animalesConDatos: 6,
    gmdPromedio: 1.25,
    gananciaPromedioKg: 40,
    mejorAnimalCaravana: 'B2',
    mejorAnimalGmd: 2.1,
  },
  { proveedorId: null, proveedorNombre: 'Sin proveedor', cantidadAnimales: 3, gmdPromedio: 3, mejorAnimalCaravana: 'S1', mejorAnimalGmd: 3 },
]

const ANIMALES = [
  { aniId: 1, razaDescripcion: 'Brangus', aniFechaEgreso: null },
  { aniId: 2, razaDescripcion: 'Brangus', aniFechaEgreso: null },
  { aniId: 3, razaDescripcion: 'Nelore', aniFechaEgreso: null },
  { aniId: 4, razaDescripcion: 'Nelore', aniFechaEgreso: '2026-02-01' },
]

describe('Anillo "Aptos para venta"', () => {
  it('muestra aptos frente a no aptos con su porcentaje y el total de activos en el centro', () => {
    const { container } = render(<AnilloAptos resumen={{ ...RESUMEN, animalesActivos: 12, aptosVenta: 3 }} />)

    expect(screen.getByRole('heading', { level: 3, name: 'Aptos para venta' })).toBeInTheDocument()
    expect(screen.getByText('3 (25 %)')).toBeInTheDocument()
    expect(screen.getByText('9 (75 %)')).toBeInTheDocument()
    expect(container.querySelector('.grafico-anillo-total')).toHaveTextContent('12')
  })

  it('sin aptos igual los lista, con 0 (0 %), y el anillo es del resto', () => {
    render(<AnilloAptos resumen={{ ...RESUMEN, animalesActivos: 12, aptosVenta: 0 }} />)

    expect(screen.getByText('0 (0 %)')).toBeInTheDocument()
    expect(screen.getByText('12 (100 %)')).toBeInTheDocument()
  })

  it('sin animales activos muestra el mensaje de vacío', () => {
    render(<AnilloAptos resumen={{ ...RESUMEN, animalesActivos: 0, aptosVenta: 0 }} />)

    expect(screen.getByText('No hay animales activos para mostrar.')).toBeInTheDocument()
  })
})

describe('Anillo "Animales por…"', () => {
  it('arranca en Lotes, con el grupo en la etiqueta, número y porcentaje, y el total en el centro', () => {
    const { container } = render(<AnimalesPorCategoria resumen={RESUMEN} />)

    expect(screen.getByRole('heading', { level: 3, name: 'Animales por lote' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Lotes' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('Lote B (Cría)')).toBeInTheDocument()
    expect(screen.getByText('5 (42 %)')).toBeInTheDocument()
    expect(screen.getByText('4 (33 %)')).toBeInTheDocument()
    expect(screen.getByText('3 (25 %)')).toBeInTheDocument()
    expect(container.querySelector('.grafico-anillo-total')).toHaveTextContent('12')
  })

  it('el selector pasa a Grupos, con lo que dice el resumen', async () => {
    const usuario = userEvent.setup()
    render(<AnimalesPorCategoria resumen={RESUMEN} />)

    await usuario.click(screen.getByRole('button', { name: 'Grupos' }))

    expect(screen.getByRole('heading', { level: 3, name: 'Animales por grupo' })).toBeInTheDocument()
    expect(screen.getByText('9 (75 %)')).toBeInTheDocument()
    expect(screen.getByText('Sin lote')).toBeInTheDocument()
    expect(peticionProtegida).not.toHaveBeenCalled()
  })

  it('"Razas" pide el resumen de animales, cuenta solo los activos y no lo pide antes', async () => {
    const usuario = userEvent.setup()
    render(<AnimalesPorCategoria resumen={RESUMEN} />)
    expect(peticionProtegida).not.toHaveBeenCalled()

    await usuario.click(screen.getByRole('button', { name: 'Razas' }))

    expect(await screen.findByText('Brangus')).toBeInTheDocument()
    expect(peticionProtegida).toHaveBeenCalledWith('/api/animales/resumen')
    expect(screen.getByText('2 (67 %)')).toBeInTheDocument()
    expect(screen.getByText('1 (33 %)')).toBeInTheDocument()
  })

  it('mientras carga las razas muestra "Cargando razas…" (sin destello de vacío)', async () => {
    const usuario = userEvent.setup()
    respuestas.animales = () => new Promise(() => {})
    render(<AnimalesPorCategoria resumen={RESUMEN} />)

    await usuario.click(screen.getByRole('button', { name: 'Razas' }))

    expect(screen.getByText('Cargando razas…')).toBeInTheDocument()
    expect(screen.queryByText('No hay animales activos para mostrar.')).not.toBeInTheDocument()
  })

  it('si falla la consulta de razas muestra el error con "Reintentar" y los otros selectores siguen andando', async () => {
    const usuario = userEvent.setup()
    respuestas.animales = async () => {
      throw new Error('falló')
    }
    render(<AnimalesPorCategoria resumen={RESUMEN} />)

    await usuario.click(screen.getByRole('button', { name: 'Razas' }))
    expect(await screen.findByText('No se pudo cargar la distribución por raza.')).toBeInTheDocument()

    respuestas.animales = async () => ANIMALES
    await usuario.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByText('Brangus')).toBeInTheDocument()

    await usuario.click(screen.getByRole('button', { name: 'Lotes' }))
    expect(screen.getByText('Lote B (Cría)')).toBeInTheDocument()
  })

  it('con más de 6 porciones, las más chicas se agrupan en "Otros" (máximo 6 en la leyenda)', () => {
    const lotes = Array.from({ length: 8 }, (_, i) => ({
      loteId: i + 1,
      loteDescripcion: `Lote ${i + 1}`,
      grupoDescripcion: null,
      animalesActivos: 10 - i,
      pesoPromedio: 300,
      gmdPromedio: 1,
    }))
    render(<AnimalesPorCategoria resumen={{ ...RESUMEN, lotes }} />)

    const entradas = within(screen.getByRole('list')).getAllByRole('listitem')
    expect(entradas).toHaveLength(6)
    expect(entradas[5]).toHaveTextContent('Otros')
    // Los tres lotes más chicos (5 + 4 + 3 = 12 animales... 10-5, 10-6, 10-7): Lote 6, 7 y 8 = 5 + 4 + 3.
    expect(entradas[5]).toHaveTextContent('12')
  })

  it('sin animales activos muestra el mensaje de vacío', () => {
    render(<AnimalesPorCategoria resumen={{ ...RESUMEN, lotes: [], grupos: [] }} />)

    expect(screen.getByText('No hay animales activos para mostrar.')).toBeInTheDocument()
  })
})

describe('Línea "Evolución del peso promedio"', () => {
  async function renderizar() {
    const resultado = render(<EvolucionPeso />)
    await waitFor(() => expect(screen.queryByText('Cargando evolución del peso…')).not.toBeInTheDocument())
    return resultado
  }

  it('ofrece los lotes con sesiones (con "Sin lote" al final) y arranca en el de la sesión más reciente', async () => {
    await renderizar()

    const selector = screen.getByLabelText('Lote')
    expect(within(selector).getAllByRole('option').map((o) => o.textContent)).toEqual([
      'Lote A — Cría',
      'Lote B — Cría',
      'Sin lote',
    ])
    // La sesión más reciente (20/03) es de Lote B.
    expect(selector).toHaveValue('2')
  })

  it('dibuja los puntos del lote por fecha, con el aria-label de resumen y la nota "N sesiones"', async () => {
    const usuario = userEvent.setup()
    const { container } = await renderizar()

    await usuario.selectOptions(screen.getByLabelText('Lote'), '1')

    expect(container.querySelectorAll('.evolucion-punto')).toHaveLength(2)
    expect(container.querySelector('polyline')).toBeInTheDocument()
    expect(
      screen.getByRole('img', {
        name: 'Evolución del peso promedio de Lote A — Cría: de 300,0 kg el 01/03 a 320,0 kg el 11/03, 2 sesiones.',
      }),
    ).toBeInTheDocument()
    expect(screen.getByText('2 sesiones')).toBeInTheDocument()
  })

  it('el eje X lleva fechas dd/mm y el Y, kg', async () => {
    const usuario = userEvent.setup()
    const { container } = await renderizar()
    await usuario.selectOptions(screen.getByLabelText('Lote'), '1')

    const ejes = [...container.querySelectorAll('.evolucion-eje')].map((texto) => texto.textContent)
    expect(ejes).toContain('01/03')
    expect(ejes).toContain('11/03')
    expect(ejes.some((texto) => /^\d+ kg$/.test(texto))).toBe(true)
  })

  it('trae una tabla oculta con los mismos datos para lectores de pantalla', async () => {
    const usuario = userEvent.setup()
    await renderizar()
    await usuario.selectOptions(screen.getByLabelText('Lote'), '1')

    const tabla = screen.getByRole('table', { name: 'Evolución del peso promedio de Lote A — Cría' })
    const filas = within(tabla).getAllByRole('row').slice(1)
    expect(filas.map((fila) => fila.textContent)).toEqual(['01/03300,0 kg', '11/03320,0 kg'])
    expect(tabla).toHaveClass('visualmente-oculto')
  })

  it('al enfocar o tocar un punto aparece su valor en una etiqueta visible, y se va al salir', async () => {
    const usuario = userEvent.setup()
    const { container } = await renderizar()
    await usuario.selectOptions(screen.getByLabelText('Lote'), '1')
    const puntos = container.querySelectorAll('.evolucion-punto')
    expect(container.querySelector('.evolucion-etiqueta')).not.toBeInTheDocument()

    fireEvent.focus(puntos[1])
    expect(container.querySelector('.evolucion-etiqueta')).toHaveTextContent('11/03 · 320,0 kg')

    fireEvent.blur(puntos[1])
    expect(container.querySelector('.evolucion-etiqueta')).not.toBeInTheDocument()

    fireEvent.click(puntos[0])
    expect(container.querySelector('.evolucion-etiqueta')).toHaveTextContent('01/03 · 300,0 kg')
  })

  it('cada punto tiene aria-label y title con su fecha y peso', async () => {
    const usuario = userEvent.setup()
    await renderizar()
    await usuario.selectOptions(screen.getByLabelText('Lote'), '1')

    const punto = document.querySelector('.evolucion-punto')
    expect(punto).toHaveAttribute('aria-label', '01/03: 300,0 kg')
    expect(punto.querySelector('title')).toHaveTextContent('01/03: 300,0 kg')
    expect(punto).toHaveAttribute('tabindex', '0')
  })

  it('con un solo punto lo muestra con su valor y avisa que hace falta otra sesión', async () => {
    const { container } = await renderizar()

    // Lote B (el elegido de entrada) tiene una sola sesión.
    expect(container.querySelectorAll('.evolucion-punto')).toHaveLength(1)
    expect(container.querySelector('polyline')).not.toBeInTheDocument()
    expect(container.querySelector('.evolucion-etiqueta')).toHaveTextContent('20/03 · 250,0 kg')
    expect(screen.getByText('Hace falta otra sesión de este lote para ver la línea.')).toBeInTheDocument()
    expect(screen.getByText('1 sesión')).toBeInTheDocument()
  })

  it('"Sin lote" se puede elegir', async () => {
    const usuario = userEvent.setup()
    const { container } = await renderizar()

    await usuario.selectOptions(screen.getByLabelText('Lote'), 'sin-lote')

    expect(container.querySelector('.evolucion-etiqueta')).toHaveTextContent('10/02 · 200,0 kg')
  })

  it('sin sesiones muestra el estado vacío', async () => {
    respuestas.sesiones = async () => []
    await renderizar()

    expect(screen.getByText('Todavía no hay sesiones de pesaje.')).toBeInTheDocument()
    expect(screen.queryByLabelText('Lote')).not.toBeInTheDocument()
  })

  it('muestra "Cargando evolución del peso…" mientras espera', () => {
    respuestas.sesiones = () => new Promise(() => {})
    render(<EvolucionPeso />)

    expect(screen.getByText('Cargando evolución del peso…')).toBeInTheDocument()
  })

  it('si falla muestra el error con "Reintentar"', async () => {
    const usuario = userEvent.setup()
    respuestas.sesiones = async () => {
      throw new Error('falló')
    }
    await renderizar()
    expect(screen.getByText('No se pudo cargar la evolución del peso.')).toBeInTheDocument()

    respuestas.sesiones = async () => SESIONES
    await usuario.click(screen.getByRole('button', { name: 'Reintentar' }))

    expect(await screen.findByLabelText('Lote')).toBeInTheDocument()
  })
})

describe('Tarjeta "Mejor proveedor"', () => {
  async function renderizar() {
    render(
      <MemoryRouter>
        <MejorProveedor />
      </MemoryRouter>,
    )
    await waitFor(() => expect(screen.queryByText('Cargando proveedores…')).not.toBeInTheDocument())
  }

  it('muestra nombre, GMD promedio, animales y mejor animal, y el enlace al ranking', async () => {
    await renderizar()

    expect(screen.getByRole('heading', { level: 3, name: 'Mejor proveedor' })).toBeInTheDocument()
    expect(screen.getByText('Beto Beta')).toBeInTheDocument()
    expect(screen.getByText('1,25 kg/día')).toBeInTheDocument()
    expect(screen.getByText('7')).toBeInTheDocument()
    expect(screen.getByText('B2 · 2,10 kg/día')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ver ranking' })).toHaveAttribute('href', '/reportes')
    expect(peticionProtegida).toHaveBeenCalledWith('/api/reportes/proveedores')
  })

  it('ignora la fila "Sin proveedor" aunque tenga mejor GMD', async () => {
    await renderizar()

    expect(screen.queryByText('Sin proveedor')).not.toBeInTheDocument()
  })

  it('sin proveedores con pesajes muestra el aviso y el enlace', async () => {
    respuestas.proveedores = async () => [PROVEEDORES[1]]
    await renderizar()

    expect(screen.getByText('Todavía no hay proveedores con pesajes')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ver ranking' })).toHaveAttribute('href', '/reportes')
  })

  it('muestra "Cargando proveedores…" mientras espera', () => {
    respuestas.proveedores = () => new Promise(() => {})
    render(
      <MemoryRouter>
        <MejorProveedor />
      </MemoryRouter>,
    )

    expect(screen.getByText('Cargando proveedores…')).toBeInTheDocument()
  })

  it('si falla muestra el error con "Reintentar", que vuelve a pedir', async () => {
    const usuario = userEvent.setup()
    respuestas.proveedores = async () => {
      throw new Error('falló')
    }
    await renderizar()
    expect(screen.getByText('No se pudo cargar el mejor proveedor.')).toBeInTheDocument()

    respuestas.proveedores = async () => PROVEEDORES
    await usuario.click(screen.getByRole('button', { name: 'Reintentar' }))

    expect(await screen.findByText('Beto Beta')).toBeInTheDocument()
  })
})
