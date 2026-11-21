import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { peticionProtegida } from '../../api/cliente'
import ModalNuevaTransferencia from './ModalNuevaTransferencia'

vi.mock('../../api/cliente', () => ({
  peticionProtegida: vi.fn(),
  ErrorHttp: class ErrorHttp extends Error {},
}))

vi.mock('../../auth/useAuth', () => ({
  useAuth: () => ({ personaId: 5, personaNombre: 'Ana Pérez', errorYo: '' }),
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
    aniPesoInicial: 150,
    pesoActual: 250,
    gananciaTotal: 100,
    cantidadPesajes: 2,
    proveedorId: null,
    proveedorNombre: null,
    pesoAnterior: null,
    fechaPesoAnterior: null,
    pesoAnteriorEsIngreso: false,
    fechaUltimoPesaje: null,
    gmd: 1,
    aptoVenta: false,
    aniFechaEgreso: null,
    ...extra,
  }
}

const ANIMALES = [
  animal(1, 'CAR-001', { proveedorId: 4, proveedorNombre: 'Pedro Vera', pesoActual: 300, cantidadPesajes: 3, gananciaTotal: 100, gmd: 1.5 }),
  animal(2, 'CAR-002', { razaId: 2, razaDescripcion: 'Nelore', pesoActual: 200, cantidadPesajes: 1, gananciaTotal: 10, gmd: 0.5 }),
  animal(3, 'CAR-003', { pesoActual: 220, cantidadPesajes: 0, gananciaTotal: null, gmd: null }),
  animal(4, 'CAR-004', { proveedorId: 4, proveedorNombre: 'Pedro Vera', pesoActual: 350, cantidadPesajes: 2, gananciaTotal: 150, gmd: 2.2 }),
  animal(5, 'CAR-005', { proveedorId: 6, proveedorNombre: 'Rosa Núñez', aniFechaEgreso: '2026-06-01' }),
]

beforeEach(() => {
  peticionProtegida.mockImplementation(async (ruta) => {
    if (ruta === '/api/animales/resumen') return ANIMALES
    if (ruta === '/api/subgrupos') return [{ sbId: 10, sbDescripcion: 'Lote A', grupo: { grpId: 1, grpDescripcion: 'Invernada' } }]
    if (ruta === '/api/grupos') return [{ grpId: 1, grpDescripcion: 'Invernada' }]
    if (ruta === '/api/personas') return [{ perId: 5, perNombre: 'Ana', perApellido: 'Pérez', perTipo: 'EMPLEADO' }]
    return null
  })
})

afterEach(() => {
  vi.restoreAllMocks()
})

async function abrir() {
  const usuario = userEvent.setup()
  render(<ModalNuevaTransferencia onCerrar={vi.fn()} onTransferida={vi.fn()} refDisparador={{ current: null }} />)
  await usuario.selectOptions(await screen.findByLabelText('Lote de origen'), '10')
  return usuario
}

/** Caravanas de la tabla (la tabla y las tarjetas están las dos en el DOM), en el orden en que se muestran. */
function caravanas() {
  return within(screen.getByRole('table'))
    .getAllByRole('row')
    .slice(1)
    .map((fila) => fila.querySelector('.transferencia-caravana').textContent)
}

describe('Nueva transferencia: filtros compartidos con Animales', () => {
  it('ofrece proveedor (solo los de animales activos), pesajes y peso actual mínimo y máximo', async () => {
    await abrir()

    const proveedor = screen.getByLabelText('Proveedor')
    expect(within(proveedor).getAllByRole('option').map((o) => o.textContent)).toEqual([
      'Todos los proveedores',
      'Sin proveedor',
      'Pedro Vera',
    ])
    expect(screen.getByLabelText('Pesajes')).toBeInTheDocument()
    expect(screen.getByLabelText('Peso actual mínimo (kg)')).toBeInTheDocument()
    expect(screen.getByLabelText('Peso actual máximo (kg)')).toBeInTheDocument()
  })

  it('filtra por proveedor y por "sin proveedor"', async () => {
    const usuario = await abrir()

    await usuario.selectOptions(screen.getByLabelText('Proveedor'), '4')
    expect(caravanas().sort()).toEqual(['CAR-001', 'CAR-004'])

    await usuario.selectOptions(screen.getByLabelText('Proveedor'), 'sin-proveedor')
    expect(caravanas().sort()).toEqual(['CAR-002', 'CAR-003'])
  })

  it('filtra por con pesajes y sin pesajes', async () => {
    const usuario = await abrir()

    await usuario.selectOptions(screen.getByLabelText('Pesajes'), 'con')
    expect(caravanas().sort()).toEqual(['CAR-001', 'CAR-002', 'CAR-004'])

    await usuario.selectOptions(screen.getByLabelText('Pesajes'), 'sin')
    expect(caravanas()).toEqual(['CAR-003'])
  })

  it('filtra por peso actual mínimo y máximo (inclusivos), y un límite a medio escribir se ignora', async () => {
    const usuario = await abrir()

    await usuario.type(screen.getByLabelText('Peso actual mínimo (kg)'), '250')
    expect(caravanas().sort()).toEqual(['CAR-001', 'CAR-004'])

    await usuario.clear(screen.getByLabelText('Peso actual mínimo (kg)'))
    await usuario.type(screen.getByLabelText('Peso actual máximo (kg)'), '220')
    expect(caravanas().sort()).toEqual(['CAR-002', 'CAR-003'])

    await usuario.clear(screen.getByLabelText('Peso actual máximo (kg)'))
    await usuario.type(screen.getByLabelText('Peso actual máximo (kg)'), '-')
    expect(caravanas()).toHaveLength(4)
  })

  it('los filtros se combinan', async () => {
    const usuario = await abrir()

    await usuario.selectOptions(screen.getByLabelText('Proveedor'), '4')
    await usuario.type(screen.getByLabelText('Peso actual mínimo (kg)'), '320')

    expect(caravanas()).toEqual(['CAR-004'])
  })
})

describe('Nueva transferencia: orden por ganancia total y columnas nuevas', () => {
  it('ofrece el orden por ganancia total y deja a los que no tienen pesajes al final en las dos direcciones', async () => {
    const usuario = await abrir()
    const orden = screen.getByLabelText('Ordenar por')
    expect(within(orden).getByRole('option', { name: 'Ganancia total: mayor a menor' })).toBeInTheDocument()

    await usuario.selectOptions(orden, 'gananciaTotal:desc')
    expect(caravanas()).toEqual(['CAR-004', 'CAR-001', 'CAR-002', 'CAR-003'])

    await usuario.selectOptions(orden, 'gananciaTotal:asc')
    expect(caravanas()).toEqual(['CAR-002', 'CAR-001', 'CAR-004', 'CAR-003'])
  })

  it('la tabla muestra proveedor, pesajes, peso de ingreso y ganancia total', async () => {
    await abrir()

    const fila = within(screen.getByRole('table')).getAllByRole('row').find((f) => within(f).queryByText('CAR-001'))
    expect(within(fila).getByText('Pedro Vera')).toBeInTheDocument()
    expect(within(fila).getByText('3')).toBeInTheDocument()
    expect(within(fila).getByText('150,0 kg')).toBeInTheDocument()
    expect(within(fila).getByText('100,0 kg')).toBeInTheDocument()
    const sinPesajes = within(screen.getByRole('table')).getAllByRole('row').find((f) => within(f).queryByText('CAR-003'))
    expect(within(sinPesajes).getByText('Sin pesajes')).toBeInTheDocument()
    expect(within(sinPesajes).getAllByText('Sin proveedor')).toHaveLength(1)
  })

  it('las tarjetas de celular traen los mismos datos nuevos', async () => {
    await abrir()

    const tarjeta = screen.getAllByRole('article').find((a) => within(a).queryByText('CAR-001'))
    expect(within(tarjeta).getByText('Proveedor')).toBeInTheDocument()
    expect(within(tarjeta).getByText('Pedro Vera')).toBeInTheDocument()
    expect(within(tarjeta).getByText('Pesajes')).toBeInTheDocument()
    expect(within(tarjeta).getByText('Peso de ingreso')).toBeInTheDocument()
    expect(within(tarjeta).getByText('Ganancia total')).toBeInTheDocument()
  })
})
