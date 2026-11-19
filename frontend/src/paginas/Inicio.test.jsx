import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { peticionProtegida } from '../api/cliente'
import { useAuth } from '../auth/useAuth'
import BarraLateral from '../layout/BarraLateral'
import { useTema } from '../tema/useTema'
import { alertaDe, DIAS_NOVIEMBRE, RESUMEN } from './inicio/datosDePrueba'
import Inicio from './Inicio'

vi.mock('../api/cliente', () => ({
  peticionProtegida: vi.fn(),
  ErrorHttp: class ErrorHttp extends Error {},
}))

vi.mock('../auth/useAuth', () => ({
  useAuth: vi.fn(),
}))

vi.mock('../tema/useTema', () => ({
  useTema: vi.fn(),
}))

let respuestaResumen
let respuestaCalendario

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 10, 18, 10, 0))
  useAuth.mockReturnValue({ personaNombre: 'Ana Pérez', usuario: { usuNombre: 'aperez' }, cerrarSesion: vi.fn() })
  useTema.mockReturnValue({ tema: 'claro', alternarTema: vi.fn() })
  respuestaResumen = async () => RESUMEN
  respuestaCalendario = async () => DIAS_NOVIEMBRE
  peticionProtegida.mockImplementation(async (ruta) => {
    if (ruta.startsWith('/api/inicio/resumen')) return respuestaResumen()
    if (ruta.startsWith('/api/inicio/calendario')) return respuestaCalendario()
    if (ruta.startsWith('/api/inicio/alertas')) return alertaDe('APTOS', 2)
    return null
  })
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

async function renderizar() {
  render(
    <MemoryRouter>
      <Routes>
        <Route path="/" element={<Inicio />} />
        <Route path="/animales" element={<p>Pantalla de animales</p>} />
      </Routes>
    </MemoryRouter>,
  )
  await waitFor(() => expect(screen.queryByText('Cargando resumen…')).not.toBeInTheDocument())
}

describe('Inicio: encabezado', () => {
  it('saluda con el nombre de la persona y muestra la fecha de hoy en español', async () => {
    await renderizar()

    expect(screen.getByRole('heading', { level: 1, name: 'Hola, Ana Pérez' })).toBeInTheDocument()
    expect(screen.getByText('miércoles 18 de noviembre de 2026')).toBeInTheDocument()
  })

  it('sin nombre de persona saluda solo con "Hola"', async () => {
    useAuth.mockReturnValue({ personaNombre: null, usuario: { usuNombre: 'aperez' }, cerrarSesion: vi.fn() })
    await renderizar()

    expect(screen.getByRole('heading', { level: 1, name: 'Hola' })).toBeInTheDocument()
  })

  it('los bloques tienen encabezados h2 ordenados', async () => {
    await renderizar()

    const titulos = screen.getAllByRole('heading', { level: 2 }).map((titulo) => titulo.textContent)
    expect(titulos).toEqual(['Resumen del hato', 'Alertas', 'Lotes y grupos', 'Calendario de pesajes'])
  })
})

describe('Inicio: tarjetas de resumen', () => {
  it('muestran los valores, "en N sesiones" y "más de N días" con el parámetro del servidor', async () => {
    await renderizar()

    const activos = screen.getByRole('link', { name: /Animales activos/ })
    expect(activos).toHaveTextContent('12')
    expect(activos).toHaveAttribute('href', '/animales')
    const pesados = screen.getByRole('link', { name: /Pesados este mes/ })
    expect(pesados).toHaveTextContent('8')
    expect(pesados).toHaveTextContent('en 3 sesiones')
    expect(pesados).toHaveAttribute('href', '/pesajes')
    expect(screen.getByText('Aptos para venta', { selector: '.tarjeta-resumen-etiqueta' }).parentElement).toHaveTextContent('2')
    expect(screen.getByText('más de 30 días')).toBeInTheDocument()
  })

  it('usa el singular en "en 1 sesión" y respeta un umbral distinto', async () => {
    respuestaResumen = async () => ({
      ...RESUMEN,
      sesionesEsteMes: 1,
      parametros: { diasSinPesaje: 45, gananciaMinima: 0.2 },
    })
    await renderizar()

    expect(screen.getByText('en 1 sesión')).toBeInTheDocument()
    expect(screen.getByText('más de 45 días')).toBeInTheDocument()
    expect(screen.getByText('GMD menor a 0,2 kg/día')).toBeInTheDocument()
  })

  it('una tarjeta con valor 0 se ve igual pero atenuada', async () => {
    await renderizar()

    const sinPesaje = screen.getByText('Sin pesaje reciente', { selector: '.tarjeta-resumen-etiqueta' }).parentElement
    expect(sinPesaje).toHaveTextContent('0')
    expect(sinPesaje).toHaveClass('tarjeta-resumen--atenuada')
    const activos = screen.getByRole('link', { name: /Animales activos/ })
    expect(activos).not.toHaveClass('tarjeta-resumen--atenuada')
  })
})

describe('Inicio: estados', () => {
  it('muestra "Cargando resumen…" mientras espera', () => {
    respuestaResumen = () => new Promise(() => {})
    render(
      <MemoryRouter>
        <Inicio />
      </MemoryRouter>,
    )

    expect(screen.getAllByText('Cargando resumen…').length).toBeGreaterThan(0)
  })

  it('si falla el resumen, los bloques que dependen de él muestran su error con "Reintentar", sin romper el calendario', async () => {
    const usuario = userEvent.setup()
    respuestaResumen = async () => {
      throw new Error('falló')
    }
    await renderizar()

    expect(screen.getAllByText('No se pudo cargar el resumen.')).toHaveLength(3)
    // El calendario sigue funcionando por su cuenta.
    expect(await screen.findByRole('button', { name: /^18 de noviembre/ })).toBeInTheDocument()

    respuestaResumen = async () => RESUMEN
    await usuario.click(screen.getAllByRole('button', { name: 'Reintentar' })[0])

    expect(await screen.findByRole('link', { name: /Animales activos/ })).toBeInTheDocument()
  })

  it('si falla el calendario, el resto de Inicio sigue mostrándose', async () => {
    respuestaCalendario = async () => {
      throw new Error('falló')
    }
    await renderizar()

    expect(await screen.findByText('No se pudo cargar el calendario.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Animales activos/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Lotes' })).toBeInTheDocument()
  })

  it('sin animales ni pesajes muestra la bienvenida con el botón para registrar el primero', async () => {
    respuestaResumen = async () => ({
      ...RESUMEN,
      animalesActivos: 0,
      pesadosEsteMes: 0,
      sesionesEsteMes: 0,
      aptosVenta: 0,
      gananciaBaja: 0,
      lotes: [],
      grupos: [],
    })
    await renderizar()

    expect(screen.getByRole('heading', { name: '¡Bienvenido!' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Registrar el primer animal' })).toHaveAttribute('href', '/animales')
    expect(screen.queryByRole('heading', { name: 'Alertas' })).not.toBeInTheDocument()
  })

  it('con animales con salida pero pesajes este mes no muestra la bienvenida', async () => {
    respuestaResumen = async () => ({ ...RESUMEN, animalesActivos: 0, pesadosEsteMes: 3, sesionesEsteMes: 1 })
    await renderizar()

    expect(screen.queryByRole('heading', { name: '¡Bienvenido!' })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Alertas' })).toBeInTheDocument()
  })

  it('el bloque de alertas muestra el total elegido por defecto', async () => {
    await renderizar()

    const alertas = screen.getByRole('region', { name: 'Alertas' })
    expect(within(alertas).getByRole('button', { name: /Aptos para venta \(2\)/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })
})

describe('Barra lateral: Inicio', () => {
  it('"Inicio" es la primera entrada de Principal y enlaza a "/"', () => {
    render(
      <MemoryRouter initialEntries={['/animales']}>
        <BarraLateral abierta onNavegar={vi.fn()} />
      </MemoryRouter>,
    )

    const principal = screen.getByRole('navigation', { name: 'Secciones principales' })
    const enlaces = within(principal).getAllByRole('link')
    expect(enlaces[0]).toHaveTextContent('Inicio')
    expect(enlaces[0]).toHaveAttribute('href', '/')
  })

  it('"Inicio" solo queda activo en "/", no en las demás rutas', () => {
    const { unmount } = render(
      <MemoryRouter initialEntries={['/animales']}>
        <BarraLateral abierta onNavegar={vi.fn()} />
      </MemoryRouter>,
    )
    expect(screen.getByRole('link', { name: 'Inicio' })).not.toHaveAttribute('aria-current')
    unmount()

    render(
      <MemoryRouter initialEntries={['/']}>
        <BarraLateral abierta onNavegar={vi.fn()} />
      </MemoryRouter>,
    )
    expect(screen.getByRole('link', { name: 'Inicio' })).toHaveAttribute('aria-current', 'page')
  })
})
