import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { generarExcel } from '../utilidades/exportacion/generarExcel'
import { generarPdf } from '../utilidades/exportacion/generarPdf'
import ModalExportar from './ModalExportar'

vi.mock('../utilidades/exportacion/generarPdf', () => ({ generarPdf: vi.fn() }))
vi.mock('../utilidades/exportacion/generarExcel', () => ({ generarExcel: vi.fn() }))

const COLUMNAS = [
  { clave: 'nombre', titulo: 'Nombre', tipo: 'texto', porDefecto: true },
  { clave: 'peso', titulo: 'Peso', tipo: 'numero', porDefecto: true },
  { clave: 'obs', titulo: 'Observación', tipo: 'texto', porDefecto: false },
]

const DATOS = [
  { nombre: 'Ana', peso: 200 },
  { nombre: 'Beto', peso: 300 },
  { nombre: 'Carla', peso: 400 },
]

const obtenerFilas = (filtros) => DATOS.filter((fila) => fila.nombre.toLowerCase().includes(filtros.texto.toLowerCase()))
const describirFiltros = (filtros) => (filtros.texto ? [{ etiqueta: 'Texto', valor: filtros.texto }] : [])

let onCerrar
let onGenerado
let filtrosIniciales

beforeEach(() => {
  onCerrar = vi.fn()
  onGenerado = vi.fn()
  filtrosIniciales = { texto: '' }
  generarPdf.mockResolvedValue('prueba_2026-11-18.pdf')
  generarExcel.mockResolvedValue('prueba_2026-11-18.xlsx')
})

afterEach(() => {
  vi.clearAllMocks()
})

function renderizar(propiedades = {}) {
  return render(
    <ModalExportar
      titulo="Prueba"
      listado="prueba"
      columnas={COLUMNAS}
      filtrosIniciales={filtrosIniciales}
      renderFiltros={({ filtros, cambiarFiltro }) => (
        <div className="campo">
          <label htmlFor="filtro-texto">Texto</label>
          <input id="filtro-texto" value={filtros.texto} onChange={(evento) => cambiarFiltro('texto', evento.target.value)} />
        </div>
      )}
      obtenerFilas={obtenerFilas}
      describirFiltros={describirFiltros}
      usuario="Ana Pérez"
      onCerrar={onCerrar}
      onGenerado={onGenerado}
      refDisparador={{ current: null }}
      {...propiedades}
    />,
  )
}

describe('ModalExportar: contenido', () => {
  it('es un diálogo con el título del listado', () => {
    renderizar()

    expect(screen.getByRole('dialog', { name: 'Exportar prueba' })).toBeInTheDocument()
  })

  it('las columnas marcadas de entrada son las porDefecto', () => {
    renderizar()

    expect(screen.getByRole('checkbox', { name: 'Nombre' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Peso' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Observación' })).not.toBeChecked()
  })

  it('muestra el aviso fijo si el listado lo pide', () => {
    renderizar({ aviso: 'El archivo contiene datos personales' })

    expect(screen.getByRole('note')).toHaveTextContent('El archivo contiene datos personales')
  })

  it('sin aviso no hay nota', () => {
    renderizar()

    expect(screen.queryByRole('note')).not.toBeInTheDocument()
  })
})

describe('ModalExportar: filtros y conteo', () => {
  it('arranca con los filtros de la pantalla y cuenta los registros', () => {
    filtrosIniciales = { texto: 'a' }
    renderizar()

    expect(screen.getByLabelText('Texto')).toHaveValue('a')
    // "a" está en Ana, Carla (y no en Beto).
    expect(screen.getByRole('status')).toHaveTextContent('Se exportarán 2 registros')
  })

  it('cambiar un filtro actualiza el conteo, y usa el singular con uno', async () => {
    const usuario = userEvent.setup()
    renderizar()
    expect(screen.getByRole('status')).toHaveTextContent('Se exportarán 3 registros')

    await usuario.type(screen.getByLabelText('Texto'), 'beto')

    expect(screen.getByRole('status')).toHaveTextContent('Se exportarán 1 registro')
    expect(screen.getByRole('status')).not.toHaveTextContent('registros')
  })

  it('trabaja con su propia copia: cambiar un filtro no toca el objeto de la pantalla', async () => {
    const usuario = userEvent.setup()
    renderizar()

    await usuario.type(screen.getByLabelText('Texto'), 'x')

    expect(filtrosIniciales).toEqual({ texto: '' })
  })

  it('con 0 registros deshabilita "Generar" y avisa', async () => {
    const usuario = userEvent.setup()
    renderizar()

    await usuario.type(screen.getByLabelText('Texto'), 'zzz')

    expect(screen.getByRole('status')).toHaveTextContent('Se exportarán 0 registros')
    expect(screen.getByRole('button', { name: 'Generar' })).toBeDisabled()
    expect(screen.getByRole('alert')).toHaveTextContent('No hay registros con estos filtros')
  })

  it('sin ninguna columna elegida deshabilita "Generar" y avisa', async () => {
    const usuario = userEvent.setup()
    renderizar()

    await usuario.click(screen.getByRole('checkbox', { name: 'Nombre' }))
    await usuario.click(screen.getByRole('checkbox', { name: 'Peso' }))

    expect(screen.getByRole('button', { name: 'Generar' })).toBeDisabled()
    expect(screen.getByRole('alert')).toHaveTextContent('Elegí al menos una columna')
  })
})

describe('ModalExportar: formato y orientación', () => {
  it('arranca en PDF, con la orientación a la vista (automática)', () => {
    renderizar()

    expect(screen.getByRole('radio', { name: 'PDF' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'Automática' })).toBeChecked()
  })

  it('con Excel no hay orientación', async () => {
    const usuario = userEvent.setup()
    renderizar()

    await usuario.click(screen.getByRole('radio', { name: 'Excel' }))

    expect(screen.getByRole('radio', { name: 'Excel' })).toBeChecked()
    expect(screen.queryByRole('radio', { name: 'Horizontal' })).not.toBeInTheDocument()
  })

  it('generar en PDF manda los datos elegidos (columnas, filas, filtros, orientación y usuario)', async () => {
    const usuario = userEvent.setup()
    renderizar()
    await usuario.type(screen.getByLabelText('Texto'), 'a')
    await usuario.click(screen.getByRole('checkbox', { name: 'Observación' }))
    await usuario.click(screen.getByRole('radio', { name: 'Horizontal' }))

    await usuario.click(screen.getByRole('button', { name: 'Generar' }))

    await waitFor(() => expect(generarPdf).toHaveBeenCalledTimes(1))
    const datos = generarPdf.mock.calls[0][0]
    expect(datos).toMatchObject({
      listado: 'prueba',
      titulo: 'Prueba',
      usuario: 'Ana Pérez',
      orientacion: 'horizontal',
      filtros: [{ etiqueta: 'Texto', valor: 'a' }],
    })
    expect(datos.columnas.map((columna) => columna.clave)).toEqual(['nombre', 'peso', 'obs'])
    expect(datos.filas.map((fila) => fila.nombre)).toEqual(['Ana', 'Carla'])
    expect(generarExcel).not.toHaveBeenCalled()
    expect(onGenerado).toHaveBeenCalledWith('prueba_2026-11-18.pdf')
    expect(onCerrar).toHaveBeenCalled()
  })

  it('generar en Excel usa el generador de Excel, sin orientación', async () => {
    const usuario = userEvent.setup()
    renderizar()
    await usuario.click(screen.getByRole('radio', { name: 'Excel' }))

    await usuario.click(screen.getByRole('button', { name: 'Generar' }))

    await waitFor(() => expect(generarExcel).toHaveBeenCalledTimes(1))
    expect(generarExcel.mock.calls[0][0]).not.toHaveProperty('orientacion')
    expect(generarExcel.mock.calls[0][0].columnas.map((columna) => columna.clave)).toEqual(['nombre', 'peso'])
    expect(generarPdf).not.toHaveBeenCalled()
    expect(onGenerado).toHaveBeenCalledWith('prueba_2026-11-18.xlsx')
  })
})

describe('ModalExportar: estados', () => {
  it('mientras genera, el botón queda en espera y los controles deshabilitados', async () => {
    const usuario = userEvent.setup()
    generarPdf.mockReturnValue(new Promise(() => {}))
    renderizar()

    await usuario.click(screen.getByRole('button', { name: 'Generar' }))

    const boton = await screen.findByRole('button', { name: 'Generando…' })
    expect(boton).toBeDisabled()
    expect(boton).toHaveAttribute('aria-busy', 'true')
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled()
    expect(screen.getByLabelText('Texto')).toBeDisabled()
    expect(onCerrar).not.toHaveBeenCalled()
  })

  it('si falla, muestra un mensaje claro, no cierra y deja reintentar', async () => {
    const usuario = userEvent.setup()
    generarPdf.mockRejectedValueOnce(new Error('falló'))
    renderizar()

    await usuario.click(screen.getByRole('button', { name: 'Generar' }))

    expect(await screen.findByText(/No se pudo generar el archivo/)).toBeInTheDocument()
    expect(onCerrar).not.toHaveBeenCalled()
    expect(onGenerado).not.toHaveBeenCalled()

    await usuario.click(screen.getByRole('button', { name: 'Generar' }))
    await waitFor(() => expect(onCerrar).toHaveBeenCalled())
  })

  it('"Cancelar" cierra sin generar', async () => {
    const usuario = userEvent.setup()
    renderizar()

    await usuario.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(onCerrar).toHaveBeenCalled()
    expect(generarPdf).not.toHaveBeenCalled()
  })
})

describe('ModalExportar: sin filtros y resumen', () => {
  it('sin renderFiltros no muestra la sección de filtros, y el contexto va bajo el título', async () => {
    const usuario = userEvent.setup()
    renderizar({
      renderFiltros: undefined,
      filtrosIniciales: undefined,
      obtenerFilas: () => DATOS,
      describirFiltros: undefined,
      describirContexto: () => [{ etiqueta: 'Sesión', valor: 'S-261029-3' }],
      tituloModal: 'Exportar animales de la sesión',
    })

    expect(screen.getByRole('dialog', { name: 'Exportar animales de la sesión' })).toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'Filtros' })).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Se exportarán 3 registros')

    await usuario.click(screen.getByRole('button', { name: 'Generar' }))

    await waitFor(() => expect(generarPdf).toHaveBeenCalledTimes(1))
    // Sin filtros propios queda "Sin filtros"; el contexto viaja aparte, para la línea bajo el título.
    expect(generarPdf.mock.calls[0][0].filtros).toEqual([])
    expect(generarPdf.mock.calls[0][0].contexto).toEqual([{ etiqueta: 'Sesión', valor: 'S-261029-3' }])
  })

  it('describirTotales recibe las filas y el resultado va al generador', async () => {
    const usuario = userEvent.setup()
    const describirTotales = vi.fn((filas) => [{ etiqueta: 'Animales', valor: String(filas.length) }])
    renderizar({ describirTotales })

    await usuario.click(screen.getByRole('button', { name: 'Generar' }))
    await waitFor(() => expect(generarPdf).toHaveBeenCalledTimes(1))

    expect(describirTotales).toHaveBeenCalledWith(DATOS, { texto: '' })
    expect(generarPdf.mock.calls[0][0].totales).toEqual([{ etiqueta: 'Animales', valor: '3' }])
  })

  it('un listado que no usa totales ni contexto no manda esas claves', async () => {
    const usuario = userEvent.setup()
    renderizar()

    await usuario.click(screen.getByRole('button', { name: 'Generar' }))
    await waitFor(() => expect(generarPdf).toHaveBeenCalledTimes(1))

    expect(generarPdf.mock.calls[0][0]).not.toHaveProperty('totales')
    expect(generarPdf.mock.calls[0][0]).not.toHaveProperty('contexto')
  })

  it('totales vacíos tampoco se mandan', async () => {
    const usuario = userEvent.setup()
    renderizar({ describirTotales: () => [] })

    await usuario.click(screen.getByRole('button', { name: 'Generar' }))
    await waitFor(() => expect(generarPdf).toHaveBeenCalledTimes(1))

    expect(generarPdf.mock.calls[0][0]).not.toHaveProperty('totales')
  })
})

describe('ModalExportar: accesibilidad', () => {
  it('agrupa los controles en fieldsets con leyenda', () => {
    renderizar()

    expect(screen.getByRole('group', { name: 'Filtros' })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Columnas' })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Formato' })).toBeInTheDocument()
    expect(within(screen.getByRole('group', { name: 'Columnas' })).getAllByRole('checkbox')).toHaveLength(3)
  })
})
