import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { peticionProtegida } from '../../api/cliente'
import { generarPdf } from '../../utilidades/exportacion/generarPdf'
import ModalDetalleSesion from './ModalDetalleSesion'
import { COLUMNAS_DETALLE_SESION, filaDeItemSesion, resumenDeDetalleSesion } from './exportacionDetalleSesion'

vi.mock('../../auth/useAuth', () => ({
  useAuth: () => ({ personaId: 1, cargandoYo: false, errorYo: '' }),
}))

vi.mock('../../api/cliente', () => ({
  peticionProtegida: vi.fn(),
  ErrorHttp: class ErrorHttp extends Error {},
}))

vi.mock('../../utilidades/exportacion/generarPdf', () => ({ generarPdf: vi.fn() }))
vi.mock('../../utilidades/exportacion/generarExcel', () => ({ generarExcel: vi.fn() }))

function item(pesaId, caravana, extra = {}) {
  return {
    pesaId,
    animalId: pesaId,
    caravana,
    razaDescripcion: 'Brangus',
    peso: 260,
    pesoAnterior: 250,
    pesoAnteriorEsIngreso: false,
    fechaPesoAnterior: '2026-07-01',
    gmd: 1,
    responsableNombre: 'Ana',
    observaciones: '',
    proveedorId: null,
    proveedorNombre: null,
    pesoIngreso: 200,
    ...extra,
  }
}

const DOS_PROVEEDORES = [
  item(1, 'CAR-001', { proveedorId: 4, proveedorNombre: 'Pedro Vera', peso: 300, pesoAnterior: 280, gmd: 2 }),
  item(2, 'CAR-002', { proveedorId: 4, proveedorNombre: 'Pedro Vera', peso: 320, pesoAnterior: 300, gmd: 3 }),
  item(3, 'CAR-003', { proveedorId: null, proveedorNombre: null, peso: 220, pesoAnterior: 210, gmd: 0.5 }),
]

const UN_PROVEEDOR = [
  item(1, 'CAR-001', { proveedorId: 4, proveedorNombre: 'Pedro Vera' }),
  item(2, 'CAR-002', { proveedorId: 4, proveedorNombre: 'Pedro Vera' }),
]

const SESION = { fecha: '2026-07-05', subGrupoId: 10, subGrupoDescripcion: 'Lote A', grupoDescripcion: null }

let items

beforeEach(() => {
  items = DOS_PROVEEDORES
  generarPdf.mockResolvedValue('archivo.pdf')
  peticionProtegida.mockImplementation(async (ruta) => {
    if (ruta.startsWith('/api/pesajes/sesiones/detalle')) return items
    return []
  })
})

afterEach(() => {
  vi.clearAllMocks()
})

async function abrir() {
  render(
    <MemoryRouter>
      <ModalDetalleSesion
        sesion={SESION}
        onCerrar={vi.fn()}
        onCambiada={vi.fn()}
        onQuedoSinAnimales={vi.fn()}
        refDisparador={{ current: null }}
      />
    </MemoryRouter>,
  )
  await screen.findAllByText('CAR-001')
}

describe('Detalle de sesión: columna Proveedor', () => {
  it('la tabla trae la columna Proveedor (con "Sin proveedor") y la tarjeta, el dato', async () => {
    await abrir()

    const tabla = screen.getByRole('table', { name: 'Animales de la sesión' })
    expect(within(tabla).getByRole('columnheader', { name: 'Proveedor' })).toBeInTheDocument()
    const filas = within(tabla).getAllByRole('row').slice(1)
    expect(within(filas[0]).getByText('Pedro Vera')).toBeInTheDocument()
    expect(within(filas[2]).getByText('Sin proveedor')).toBeInTheDocument()
    expect(document.querySelectorAll('.tarjeta-item-sesion')[0]).toHaveTextContent('Pedro Vera')
  })

  it('"Mostrar proveedor" la oculta y la vuelve a mostrar', async () => {
    const usuario = userEvent.setup()
    await abrir()
    const tabla = () => screen.getByRole('table', { name: 'Animales de la sesión' })

    await usuario.click(screen.getByRole('checkbox', { name: 'Mostrar proveedor' }))
    expect(within(tabla()).queryByRole('columnheader', { name: 'Proveedor' })).not.toBeInTheDocument()

    await usuario.click(screen.getByRole('checkbox', { name: 'Mostrar proveedor' }))
    expect(within(tabla()).getByRole('columnheader', { name: 'Proveedor' })).toBeInTheDocument()
  })

  it('"Peso de ingreso" es opcional: oculta de entrada y aparece al activarla', async () => {
    const usuario = userEvent.setup()
    await abrir()
    const tabla = () => screen.getByRole('table', { name: 'Animales de la sesión' })
    expect(within(tabla()).queryByRole('columnheader', { name: 'Peso de ingreso' })).not.toBeInTheDocument()

    await usuario.click(screen.getByRole('checkbox', { name: 'Mostrar peso de ingreso' }))

    expect(within(tabla()).getByRole('columnheader', { name: 'Peso de ingreso' })).toBeInTheDocument()
    expect(within(within(tabla()).getAllByRole('row')[1]).getByText('200,0 kg')).toBeInTheDocument()
  })
})

describe('Detalle de sesión: bloque "Por proveedor"', () => {
  it('con 2 proveedores (contando "Sin proveedor") muestra una fila por proveedor con sus promedios', async () => {
    await abrir()

    const tabla = screen.getByRole('table', { name: 'Resumen de la sesión por proveedor' })
    const filas = within(tabla).getAllByRole('row').slice(1)
    expect(filas).toHaveLength(2)
    const pedro = within(filas[0]).getAllByRole('cell').map((celda) => celda.textContent)
    expect(within(filas[0]).getByRole('rowheader')).toHaveTextContent('Pedro Vera')
    expect(pedro).toEqual(['2', '310,0 kg', '20,0 kg', '2,50 kg/día'])
    expect(within(filas[1]).getByRole('rowheader')).toHaveTextContent('Sin proveedor')
  })

  it('el de mayor GMD promedio lleva la etiqueta "Mejor GMD en esta sesión" (solo ese)', async () => {
    await abrir()

    const tabla = screen.getByRole('table', { name: 'Resumen de la sesión por proveedor' })
    const filas = within(tabla).getAllByRole('row').slice(1)
    expect(within(filas[0]).getByText('Mejor GMD en esta sesión')).toBeInTheDocument()
    expect(within(filas[1]).queryByText('Mejor GMD en esta sesión')).not.toBeInTheDocument()
  })

  it('las tarjetas de celular traen los mismos datos', async () => {
    await abrir()

    const tarjetas = document.querySelectorAll('.por-proveedor-tarjeta')
    expect(tarjetas).toHaveLength(2)
    expect(within(tarjetas[0]).getByText('Pedro Vera')).toBeInTheDocument()
    expect(within(tarjetas[0]).getByText('Mejor GMD en esta sesión')).toBeInTheDocument()
    expect(within(tarjetas[0]).getByText('2,50 kg/día')).toBeInTheDocument()
  })

  it('con un solo proveedor no se muestra', async () => {
    items = UN_PROVEEDOR
    await abrir()

    expect(screen.queryByRole('heading', { name: 'Por proveedor' })).not.toBeInTheDocument()
  })

  it('"Sin proveedor" más un proveedor también cuenta como dos', async () => {
    items = [item(1, 'CAR-001'), item(2, 'CAR-002', { proveedorId: 4, proveedorNombre: 'Pedro Vera' })]
    await abrir()

    expect(screen.getByRole('heading', { name: 'Por proveedor' })).toBeInTheDocument()
  })
})

describe('Detalle de sesión: exportación con proveedor', () => {
  it('las columnas nuevas (proveedor y peso de ingreso) están declaradas, con el peso de ingreso sin marcar', () => {
    const porClave = Object.fromEntries(COLUMNAS_DETALLE_SESION.map((columna) => [columna.clave, columna]))

    expect(porClave.proveedor).toMatchObject({ tipo: 'texto', alineacion: 'izquierda', porDefecto: true })
    expect(porClave.pesoIngreso).toMatchObject({ tipo: 'numero', decimales: 1, alineacion: 'centro', porDefecto: false })
  })

  it('la fila trae el proveedor (o "Sin proveedor") y el peso de ingreso', () => {
    expect(filaDeItemSesion(DOS_PROVEEDORES[0], '2026-07-05')).toMatchObject({ proveedor: 'Pedro Vera', pesoIngreso: 200 })
    expect(filaDeItemSesion(DOS_PROVEEDORES[2], '2026-07-05').proveedor).toBe('Sin proveedor')
  })

  it('el resumen suma una entrada por proveedor solo cuando hay 2 o más', () => {
    const con = resumenDeDetalleSesion(DOS_PROVEEDORES)
    expect(con.map((dato) => dato.etiqueta)).toEqual([
      'Animales',
      'Peso promedio',
      'Mínimo',
      'Máximo',
      'GMD promedio',
      'Proveedor Pedro Vera',
      'Proveedor Sin proveedor',
    ])
    expect(con[5].valor).toBe(
      '2 animales, peso promedio 310,0 kg, diferencia promedio 20,0 kg, GMD promedio 2,500 kg/día (mejor GMD)',
    )
    expect(con[6].valor).toBe('1 animal, peso promedio 220,0 kg, diferencia promedio 10,0 kg, GMD promedio 0,500 kg/día')

    expect(resumenDeDetalleSesion(UN_PROVEEDOR).map((dato) => dato.etiqueta)).toEqual([
      'Animales',
      'Peso promedio',
      'Mínimo',
      'Máximo',
      'GMD promedio',
    ])
  })

  it('al exportar desde el detalle, el resumen del archivo incluye el bloque por proveedor', async () => {
    const usuario = userEvent.setup()
    await abrir()

    await usuario.click(screen.getByRole('button', { name: 'Exportar' }))
    await usuario.click(within(screen.getByRole('dialog', { name: 'Exportar animales de la sesión' })).getByRole('button', { name: 'Generar' }))

    await waitFor(() => expect(generarPdf).toHaveBeenCalledTimes(1))
    const datos = generarPdf.mock.calls[0][0]
    expect(datos.resumen.map((dato) => dato.etiqueta)).toContain('Proveedor Pedro Vera')
    expect(datos.columnas.map((columna) => columna.clave)).toContain('proveedor')
    expect(datos.columnas.map((columna) => columna.clave)).not.toContain('pesoIngreso')
  })
})
