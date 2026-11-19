import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { peticionProtegida } from '../../api/cliente'
import AlertasInicio from './AlertasInicio'
import { alertaDe, RESUMEN } from './datosDePrueba'

vi.mock('../../api/cliente', () => ({
  peticionProtegida: vi.fn(),
  ErrorHttp: class ErrorHttp extends Error {},
}))

let respuestas

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 10, 18, 10, 0))
  respuestas = {
    APTOS: alertaDe('APTOS', 2),
    SIN_PESAJE: alertaDe('SIN_PESAJE', 3),
    GANANCIA_BAJA: alertaDe('GANANCIA_BAJA', 1),
  }
  peticionProtegida.mockImplementation(async (ruta) => {
    const tipo = new URLSearchParams(ruta.split('?')[1]).get('tipo')
    const respuesta = respuestas[tipo]
    if (respuesta instanceof Error) throw respuesta
    return respuesta
  })
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

function UbicacionActual() {
  const ubicacion = useLocation()
  return <p data-testid="ubicacion">{ubicacion.pathname + ubicacion.search}</p>
}

async function renderizar(resumen = RESUMEN) {
  render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<AlertasInicio resumen={resumen} />} />
        <Route path="/animales" element={<UbicacionActual />} />
      </Routes>
    </MemoryRouter>,
  )
  await waitFor(() => expect(screen.queryByText('Cargando alertas…')).not.toBeInTheDocument())
}

function tablaDeAlerta() {
  return screen.getByRole('table', { name: 'Animales de la alerta' })
}

describe('Alertas de Inicio: pestañas', () => {
  it('muestra las tres alertas con su total y el texto del umbral de ganancia', async () => {
    await renderizar()

    expect(screen.getByRole('button', { name: /Aptos para venta \(2\)/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Sin pesaje reciente \(0\)/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Ganancia baja \(4\)/ })).toBeInTheDocument()
    expect(screen.getByText('GMD menor a 0 kg/día')).toBeInTheDocument()
  })

  it('por defecto queda elegida la primera con total mayor a 0 y pide solo esa lista', async () => {
    await renderizar({ ...RESUMEN, aptosVenta: 0, sinPesajeReciente: 7, gananciaBaja: 4 })

    expect(screen.getByRole('button', { name: /Sin pesaje reciente/ })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: /Aptos para venta/ })).toHaveAttribute('aria-pressed', 'false')
    expect(peticionProtegida).toHaveBeenCalledTimes(1)
    expect(peticionProtegida).toHaveBeenCalledWith('/api/inicio/alertas?tipo=SIN_PESAJE&limite=10')
  })

  it('si todas están en 0 queda elegida la primera', async () => {
    await renderizar({ ...RESUMEN, aptosVenta: 0, sinPesajeReciente: 0, gananciaBaja: 0 })

    expect(screen.getByRole('button', { name: /Aptos para venta/ })).toHaveAttribute('aria-pressed', 'true')
  })

  it('al elegir otra pestaña pide su lista y la muestra', async () => {
    const usuario = userEvent.setup()
    await renderizar()
    expect(within(tablaDeAlerta()).getAllByRole('row')).toHaveLength(3) // encabezado + 2

    await usuario.click(screen.getByRole('button', { name: /Ganancia baja/ }))

    await waitFor(() =>
      expect(peticionProtegida).toHaveBeenCalledWith('/api/inicio/alertas?tipo=GANANCIA_BAJA&limite=10'),
    )
    await waitFor(() => expect(within(tablaDeAlerta()).getAllByRole('row')).toHaveLength(2)) // encabezado + 1
    expect(screen.getByRole('button', { name: /Ganancia baja/ })).toHaveAttribute('aria-pressed', 'true')
  })
})

describe('Alertas de Inicio: lista', () => {
  it('muestra caravana, raza, lote, peso, GMD y último pesaje con "hace N días"', async () => {
    await renderizar()

    const filas = within(tablaDeAlerta()).getAllByRole('row').slice(1)
    // Primera: sin lote, sin GMD y nunca pesada.
    expect(within(filas[0]).getByText('A-1')).toBeInTheDocument()
    expect(within(filas[0]).getByText('Brangus')).toBeInTheDocument()
    expect(within(filas[0]).getByText('Sin lote')).toBeInTheDocument()
    expect(within(filas[0]).getByText('460,0 kg')).toBeInTheDocument()
    expect(within(filas[0]).getByText('—')).toBeInTheDocument()
    expect(within(filas[0]).getByText('Sin pesajes')).toBeInTheDocument()
    // Segunda: último pesaje el 18/10, hoy es 18/11 (31 días).
    expect(within(filas[1]).getByText('Lote A')).toBeInTheDocument()
    expect(within(filas[1]).getByText('0,50 kg/día')).toBeInTheDocument()
    expect(within(filas[1]).getByText('18/10/2026 · hace 31 días')).toBeInTheDocument()
  })

  it('la columna "Días sin pesaje" solo está en "Sin pesaje reciente"', async () => {
    const usuario = userEvent.setup()
    await renderizar()
    expect(within(tablaDeAlerta()).queryByRole('columnheader', { name: 'Días sin pesaje' })).not.toBeInTheDocument()

    await usuario.click(screen.getByRole('button', { name: /Sin pesaje reciente/ }))

    await waitFor(() =>
      expect(within(tablaDeAlerta()).getByRole('columnheader', { name: 'Días sin pesaje' })).toBeInTheDocument(),
    )
    const primera = within(tablaDeAlerta()).getAllByRole('row')[1]
    expect(within(primera).getByText('60')).toBeInTheDocument()
  })

  it('las tarjetas de celular traen los mismos datos', async () => {
    const { container } = { container: document.body }
    await renderizar()

    const tarjetas = container.querySelectorAll('.alertas-tarjeta')
    expect(tarjetas).toHaveLength(2)
    expect(within(tarjetas[1]).getByText('A-2')).toBeInTheDocument()
    expect(within(tarjetas[1]).getByText('Lote A')).toBeInTheDocument()
    expect(within(tarjetas[1]).getByText('18/10/2026 · hace 31 días')).toBeInTheDocument()
  })

  it('sin animales en la alerta muestra un mensaje de vacío', async () => {
    respuestas.APTOS = alertaDe('APTOS', 0)
    await renderizar()

    expect(screen.getByText('No hay animales en esta alerta.')).toBeInTheDocument()
  })

  it('si falla la lista muestra el error con "Reintentar", sin tocar las pestañas', async () => {
    const usuario = userEvent.setup()
    respuestas.APTOS = new Error('falló')
    await renderizar()

    expect(screen.getByText('No se pudo cargar la lista de esta alerta.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Sin pesaje reciente/ })).toBeInTheDocument()

    respuestas.APTOS = alertaDe('APTOS', 2)
    await usuario.click(screen.getByRole('button', { name: 'Reintentar' }))

    expect(await screen.findByRole('table', { name: 'Animales de la alerta' })).toBeInTheDocument()
  })
})

describe('Alertas de Inicio: "Mostrando" y navegación', () => {
  it('si el total supera lo mostrado, avisa "Mostrando 10 de N" y ofrece "Ver todos en Animales"', async () => {
    respuestas.APTOS = alertaDe('APTOS', 10, 25)
    await renderizar()

    expect(screen.getByText('Mostrando 10 de 25')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ver todos en Animales' })).toHaveAttribute('href', '/animales')
  })

  it('si se muestra todo, no hay nota ni botón', async () => {
    await renderizar()

    expect(screen.queryByText(/Mostrando/)).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Ver todos en Animales' })).not.toBeInTheDocument()
  })

  it('la caravana es un enlace a Animales con la caravana precargada', async () => {
    await renderizar()

    expect(screen.getAllByRole('link', { name: 'A-2' })[0]).toHaveAttribute('href', '/animales?caravana=A-2')
  })

  it('tocar la fila (fuera del enlace) también lleva a Animales con la caravana', async () => {
    const usuario = userEvent.setup()
    await renderizar()

    const fila = within(tablaDeAlerta()).getAllByRole('row')[2]
    await usuario.click(within(fila).getByText('Brangus'))

    expect(await screen.findByTestId('ubicacion')).toHaveTextContent('/animales?caravana=A-2')
  })

  it('un clic en el enlace navega una sola vez', async () => {
    const usuario = userEvent.setup()
    await renderizar()

    await usuario.click(screen.getAllByRole('link', { name: 'A-1' })[0])

    expect(await screen.findByTestId('ubicacion')).toHaveTextContent('/animales?caravana=A-1')
  })
})
