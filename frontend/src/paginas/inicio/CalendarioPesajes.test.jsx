import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { peticionProtegida } from '../../api/cliente'
import CalendarioPesajes from './CalendarioPesajes'
import { DIAS_NOVIEMBRE } from './datosDePrueba'

vi.mock('../../api/cliente', () => ({
  peticionProtegida: vi.fn(),
  ErrorHttp: class ErrorHttp extends Error {},
}))

let respuestaCalendario

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 10, 18, 10, 0)) // miércoles 18 de noviembre de 2026
  respuestaCalendario = async (ruta) => (ruta.includes('mes=11') ? DIAS_NOVIEMBRE : [])
  peticionProtegida.mockImplementation(async (ruta) => respuestaCalendario(ruta))
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

async function renderizar() {
  render(
    <MemoryRouter>
      <CalendarioPesajes />
    </MemoryRouter>,
  )
  await waitFor(() => expect(screen.queryByText('Cargando calendario…')).not.toBeInTheDocument())
}

describe('Calendario de pesajes: cuadrícula', () => {
  it('abre en el mes actual, con el título en español y los días de la semana desde el lunes', async () => {
    await renderizar()

    expect(screen.getByRole('heading', { name: 'noviembre de 2026' })).toBeInTheDocument()
    expect(peticionProtegida).toHaveBeenCalledWith('/api/inicio/calendario?anio=2026&mes=11')
    const encabezados = screen.getAllByRole('columnheader').map((celda) => celda.textContent)
    expect(encabezados).toEqual(['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'])
  })

  it('el 1 de noviembre de 2026 cae en domingo (última columna de la primera fila)', async () => {
    await renderizar()

    const primeraFila = screen.getAllByRole('row')[1]
    const celdas = within(primeraFila).getAllByRole('cell')
    expect(celdas).toHaveLength(7)
    expect(celdas[6]).toHaveTextContent('1')
    expect(celdas[0]).toBeEmptyDOMElement()
  })

  it('los días con pesajes son botones con una etiqueta completa y la cantidad de animales', async () => {
    await renderizar()

    const dia = screen.getByRole('button', { name: '18 de noviembre: 2 sesiones, 40 animales' })
    expect(dia).toHaveTextContent('18')
    expect(dia).toHaveTextContent('40')
    // Singular.
    expect(screen.getByRole('button', { name: '5 de noviembre: 1 sesión, 4 animales' })).toBeInTheDocument()
    // Los demás días no son botones.
    expect(screen.getAllByRole('button', { name: /sesión|sesiones/ })).toHaveLength(2)
  })

  it('el día de hoy lleva aria-current="date" y su clase de borde', async () => {
    await renderizar()

    const hoy = screen.getByRole('button', { name: /^18 de noviembre/ })
    expect(hoy).toHaveAttribute('aria-current', 'date')
    expect(hoy).toHaveClass('calendario-dia--hoy')
    expect(screen.getByRole('button', { name: /^5 de noviembre/ })).not.toHaveAttribute('aria-current')
  })

  it('si hoy no tiene pesajes igual se marca (como texto, no botón)', async () => {
    respuestaCalendario = async () => []
    await renderizar()

    const celdaHoy = document.querySelector('[aria-current="date"]')
    expect(celdaHoy).toHaveTextContent('18')
    expect(celdaHoy.tagName).toBe('SPAN')
    expect(screen.getByText('No hay pesajes registrados en este mes.')).toBeInTheDocument()
  })
})

describe('Calendario de pesajes: cambio de mes', () => {
  it('"Mes siguiente" y "Mes anterior" cambian el título y piden el mes nuevo', async () => {
    const usuario = userEvent.setup()
    await renderizar()

    await usuario.click(screen.getByRole('button', { name: 'Mes siguiente' }))

    expect(screen.getByRole('heading', { name: 'diciembre de 2026' })).toBeInTheDocument()
    await waitFor(() => expect(peticionProtegida).toHaveBeenCalledWith('/api/inicio/calendario?anio=2026&mes=12'))

    await usuario.click(screen.getByRole('button', { name: 'Mes anterior' }))
    await usuario.click(screen.getByRole('button', { name: 'Mes anterior' }))

    expect(screen.getByRole('heading', { name: 'octubre de 2026' })).toBeInTheDocument()
    await waitFor(() => expect(peticionProtegida).toHaveBeenCalledWith('/api/inicio/calendario?anio=2026&mes=10'))
  })

  it('pasa de año al avanzar desde diciembre', async () => {
    const usuario = userEvent.setup()
    await renderizar()

    await usuario.click(screen.getByRole('button', { name: 'Mes siguiente' }))
    await usuario.click(screen.getByRole('button', { name: 'Mes siguiente' }))

    expect(screen.getByRole('heading', { name: 'enero de 2027' })).toBeInTheDocument()
    await waitFor(() => expect(peticionProtegida).toHaveBeenCalledWith('/api/inicio/calendario?anio=2027&mes=1'))
  })

  it('"Hoy" vuelve al mes actual y elige el día de hoy', async () => {
    const usuario = userEvent.setup()
    await renderizar()
    await usuario.click(screen.getByRole('button', { name: 'Mes anterior' }))
    await usuario.click(screen.getByRole('button', { name: 'Mes anterior' }))

    await usuario.click(screen.getByRole('button', { name: 'Hoy' }))

    expect(screen.getByRole('heading', { name: 'noviembre de 2026' })).toBeInTheDocument()
    expect(await screen.findByText('2 sesiones, 40 animales')).toBeInTheDocument()
  })

  it('al cambiar de mes se limpia el día elegido', async () => {
    const usuario = userEvent.setup()
    await renderizar()
    await usuario.click(screen.getByRole('button', { name: /^5 de noviembre/ }))
    expect(screen.getByText('1 sesión, 4 animales')).toBeInTheDocument()

    await usuario.click(screen.getByRole('button', { name: 'Mes siguiente' }))

    expect(screen.queryByText('1 sesión, 4 animales')).not.toBeInTheDocument()
  })
})

describe('Calendario de pesajes: día elegido', () => {
  it('muestra "N sesiones, M animales" y el enlace a Pesajes con la fecha', async () => {
    const usuario = userEvent.setup()
    await renderizar()

    await usuario.click(screen.getByRole('button', { name: /^18 de noviembre/ }))

    expect(screen.getByText('2 sesiones, 40 animales')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^18 de noviembre/ })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('link', { name: 'Ver pesajes de ese día' })).toHaveAttribute(
      'href',
      '/pesajes?fecha=2026-11-18',
    )
  })

  it('elegir otro día cambia el detalle', async () => {
    const usuario = userEvent.setup()
    await renderizar()

    await usuario.click(screen.getByRole('button', { name: /^18 de noviembre/ }))
    await usuario.click(screen.getByRole('button', { name: /^5 de noviembre/ }))

    expect(screen.getByRole('link', { name: 'Ver pesajes de ese día' })).toHaveAttribute(
      'href',
      '/pesajes?fecha=2026-11-05',
    )
    expect(screen.getByRole('button', { name: /^18 de noviembre/ })).toHaveAttribute('aria-pressed', 'false')
  })
})

describe('Calendario de pesajes: estados', () => {
  it('muestra "Cargando calendario…" mientras espera', () => {
    respuestaCalendario = () => new Promise(() => {})
    render(
      <MemoryRouter>
        <CalendarioPesajes />
      </MemoryRouter>,
    )

    expect(screen.getByText('Cargando calendario…')).toBeInTheDocument()
  })

  it('si falla muestra el error con "Reintentar" y deja ver la cuadrícula', async () => {
    const usuario = userEvent.setup()
    respuestaCalendario = async () => {
      throw new Error('falló')
    }
    await renderizar()

    expect(screen.getByText('No se pudo cargar el calendario.')).toBeInTheDocument()
    expect(screen.getByRole('table')).toBeInTheDocument()

    respuestaCalendario = async () => DIAS_NOVIEMBRE
    await usuario.click(screen.getByRole('button', { name: 'Reintentar' }))

    expect(await screen.findByRole('button', { name: /^18 de noviembre/ })).toBeInTheDocument()
  })
})
